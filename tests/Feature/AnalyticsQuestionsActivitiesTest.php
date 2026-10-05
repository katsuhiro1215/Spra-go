<?php

use App\Models\Feedback;
use App\Models\ProfileGreeting;
use App\Models\User;
use App\Support\Analytics;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| まちがいの多い問題・よく使われる遊び(docs/design/2026-10-03-analytics-design.md 4-4・4-6)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-20 03:00:00', 'UTC')); // 日本時間 10/20
});

function answersFor(App\Models\UserProfile $profile, int $questionId, int $correct, int $wrong): void
{
    for ($i = 0; $i < $correct; $i++) {
        answerAt($profile, '2026-10-15 03:00:00', true, $questionId);
    }
    for ($i = 0; $i < $wrong; $i++) {
        answerAt($profile, '2026-10-15 03:00:00', false, $questionId);
    }
}

it('まちがいの多い問題を、正解率の低い順に出す。5回未満は出さない', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    [$hard] = createQuestionWithChoices();
    [$easy] = createQuestionWithChoices();
    [$few] = createQuestionWithChoices();
    answersFor($profile, $hard->id, 1, 5);  // 6回・正解率 1/6
    answersFor($profile, $easy->id, 5, 0);  // 5回・正解率 1
    answersFor($profile, $few->id, 0, 4);   // 4回(出さない)

    $rows = (new Analytics)->hardQuestions();

    expect(array_column($rows, 'question_id'))->toBe([$hard->id, $easy->id])
        ->and($rows[0])->toMatchArray(['answers' => 6, 'accuracy' => 0.1667, 'reports' => 0])
        ->and($rows[0]['prompt'])->toBe('テスト問題');
});

it('「へん」の報告の数を並べる', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    [$question] = createQuestionWithChoices();
    answersFor($profile, $question->id, 0, 5);
    $userId = User::factory()->create()->id;
    Feedback::create(['user_id' => $userId, 'user_profile_id' => $profile->id, 'kind' => 'question_report', 'question_id' => $question->id, 'reason' => 'other']);
    Feedback::create(['user_id' => $userId, 'kind' => 'question_report', 'question_id' => $question->id, 'reason' => 'other']);
    Feedback::create(['user_id' => $userId, 'kind' => 'bug', 'body' => '別の種類']);

    expect((new Analytics)->hardQuestions()[0]['reports'])->toBe(2);
});

it('削除された問題は、まちがいの多い問題に出さない', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    [$question] = createQuestionWithChoices();
    answersFor($profile, $question->id, 0, 6);
    $question->delete();

    expect((new Analytics)->hardQuestions())->toBe([]);
});

it('件数の上限(20件)で切る', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    foreach (range(1, 22) as $i) {
        [$question] = createQuestionWithChoices();
        answersFor($profile, $question->id, 0, 5);
    }

    expect(count((new Analytics)->hardQuestions()))->toBe(20);
});

it('よく使われる遊びを、期間内の人数と回数で数える', function () {
    $a = makePlayerAt('2026-10-01 00:00:00', 'A');
    $b = makePlayerAt('2026-10-01 00:00:00', 'B');
    answerAt($a, '2026-10-15 03:00:00');
    answerAt($a, '2026-10-15 04:00:00', false);
    answerAt($b, '2026-10-16 03:00:00');
    answerAt($b, '2026-09-01 03:00:00'); // 期間外
    $a->update(['last_review_on' => '2026-10-15']);
    $a->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [1], 'finished_at' => '2026-10-15 03:00:00', 'played_on' => '2026-10-15', 'answered_count' => 1, 'correct_count' => 1, 'score' => 1, 'best_combo' => 1]);
    $a->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [1], 'finished_at' => null, 'score' => 0, 'best_combo' => 0]); // 終えていない
    $a->gamePlays()->create(['game' => 'flag_catch', 'difficulty' => '初級', 'question_ids' => [1], 'finished_at' => '2026-10-15 03:00:00', 'played_on' => '2026-10-15', 'answered_count' => 1, 'correct_count' => 1, 'score' => 1, 'best_combo' => 1]);
    $b->seeds()->create(['result_key' => 'lumi', 'last_watered_on' => '2026-10-16']);
    $a->trips()->create(['destination' => 'id', 'arrived_at' => '2026-10-15 03:00:00']);
    $a->errands()->create(['errand_on' => '2026-10-15', 'slot' => 1, 'kind' => 'x', 'target' => 1, 'giver' => 'spru', 'claimed_at' => '2026-10-15 03:00:00']);
    ProfileGreeting::create(['from_profile_id' => $a->id, 'to_profile_id' => $b->id, 'stamp' => 'hi', 'greeted_on' => '2026-10-15']);

    $activities = collect((new Analytics)->activities('2026-10-10', '2026-10-20'))->keyBy('key');

    expect($activities['quiz'])->toMatchArray(['players' => 2, 'count' => 3])
        ->and($activities['review'])->toMatchArray(['players' => 1, 'count' => null])
        ->and($activities['catch'])->toMatchArray(['players' => 1, 'count' => 1])
        ->and($activities['flag_catch'])->toMatchArray(['players' => 1, 'count' => 1])
        ->and($activities['water'])->toMatchArray(['players' => 1, 'count' => null])
        ->and($activities['trip'])->toMatchArray(['players' => 1, 'count' => 1])
        ->and($activities['errand'])->toMatchArray(['players' => 1, 'count' => 1])
        ->and($activities['greeting'])->toMatchArray(['players' => 1, 'count' => 1]);
});

it('ステージクリアを、期間内の人数と回数で数える', function () {
    $a = makePlayerAt('2026-10-01 00:00:00');
    $category = App\Models\Category::create(['name' => '遊びのテスト']);
    foreach ([1, 2] as $n) {
        $stage = App\Models\Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => $n]);
        App\Models\ProfileStageProgress::create(['user_profile_id' => $a->id, 'stage_id' => $stage->id, 'cleared_at' => '2026-10-15 03:00:00']);
    }

    expect(collect((new Analytics)->activities('2026-10-10', '2026-10-20'))->keyBy('key')['clear'])->toMatchArray(['players' => 1, 'count' => 2]);
});

it('ご意見の件数を、状態ごとに出す(無い状態は0)', function () {
    $userId = User::factory()->create()->id;
    Feedback::create(['user_id' => $userId, 'kind' => 'bug', 'body' => 'a']);
    Feedback::create(['user_id' => $userId, 'kind' => 'bug', 'body' => 'b', 'status' => 'done']);

    expect((new Analytics)->feedbackCounts())->toBe(['new' => 1, 'read' => 0, 'done' => 1]);
});
