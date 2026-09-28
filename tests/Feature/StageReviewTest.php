<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\Stage;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| ステージのおさらい(docs/design/2026-09-29-spaced-review-design.md 4-5・4-6)
|--------------------------------------------------------------------------
|
| ボス以外のステージに、出す日が来た前の問題を最大2問足し、review を付ける。ボスには足さない。
| クリアの点数はステージの問題だけで数え、問題の数を超えない。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

/** @return array{0: Stage, 1: \Illuminate\Support\Collection<int, Question>} */
function stageWithOwnQuestions(int $count, bool $boss = false): array
{
    $category = Category::create(['name' => 'おさらいのカテゴリ'.uniqid()]);
    $stage = Stage::create([
        'category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1,
        'is_boss' => $boss, 'question_count' => $count,
    ]);
    $questions = collect(range(1, $count))->map(function (int $i) use ($stage) {
        [$question] = createQuestionWithChoices();
        $stage->questions()->attach($question->id, ['order' => $i]);

        return $question;
    });

    return [$stage, $questions];
}

/** 出す日が来た前の問題を作る(9/20にまちがえた → 9/21から出す) */
function previousDueQuestion(UserProfile $profile): Question
{
    [$question] = createQuestionWithChoices();
    QuestionMemory::record($profile, $question->id, false, '2026-09-20');

    return $question;
}

it('ボス以外のステージに、出す日が来た前の問題が最大2問足され、review が付く', function () {
    $profile = createActiveProfile();
    [$stage, $own] = stageWithOwnQuestions(3);
    $previous = collect(range(1, 3))->map(fn () => previousDueQuestion($profile));

    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));

    expect($questions)->toHaveCount(5)
        ->and($questions->where('review', true)->pluck('id')->sort()->values()->all())->toBe($previous->take(2)->pluck('id')->all())
        ->and($questions->where('review', false)->pluck('id')->sort()->values()->all())->toBe($own->pluck('id')->all());
});

it('ボスのステージには足さない', function () {
    $profile = createActiveProfile();
    [$stage] = stageWithOwnQuestions(3, boss: true);
    previousDueQuestion($profile);

    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));

    expect($questions)->toHaveCount(3)
        ->and($questions->pluck('review')->unique()->all())->toBe([false]);
});

it('ステージ自身の問題は、出す日が来ていても足さない(同じ問題が2回出ない)', function () {
    $profile = createActiveProfile();
    [$stage, $own] = stageWithOwnQuestions(2);
    QuestionMemory::record($profile, $own[0]->id, false, '2026-09-20');

    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));

    expect($questions)->toHaveCount(2)
        ->and($questions->pluck('id')->duplicates()->all())->toBe([]);
});

it('出す日が来た問題がなければ足さない', function () {
    $profile = createActiveProfile();
    [$stage] = stageWithOwnQuestions(2);
    [$later] = createQuestionWithChoices();
    QuestionMemory::record($profile, $later->id, false); // 次に出るのは 9/30

    expect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'))->toHaveCount(2);
});

it('足した問題も、正解の手がかりを隠して出す', function () {
    $profile = createActiveProfile();
    [$stage] = stageWithOwnQuestions(1);
    previousDueQuestion($profile);

    $review = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'))->firstWhere('review', true);

    collect($review['choices'])->each(fn (array $choice) => expect($choice)->not->toHaveKey('is_correct'));
});

it('score が問題の数を超えても、最高点は問題の数まで', function () {
    createActiveProfile();
    [$stage] = stageWithOwnQuestions(3);

    $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 5])->assertOk()
        ->assertJsonPath('progress.best_score', 3);
});
