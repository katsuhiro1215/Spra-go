<?php

use App\Models\Question;
use App\Models\UserProfile;
use App\Support\Review;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 仲間からの復習(docs/design/2026-09-27-spru-wave-c-design.md 3-5)
|--------------------------------------------------------------------------
|
| まちがえて、その後にまだ正解していない問題を、まちがえたのが古い順に最大5問出す。
| 1日1回(日本時間)で、やりきると相棒のなかよし度が5上がる。
|
*/

/** 回答APIと同じ reason で、答えの記録だけを付ける */
function recordReviewAnswer(UserProfile $profile, Question $question, bool $correct): void
{
    $profile->currencyLedger()->create([
        'type' => 'hp',
        'delta' => $correct ? -1 : -2,
        'reason' => $correct ? 'answer_correct' : 'answer_wrong',
        'question_id' => $question->id,
    ]);
}

it('まちがえて、その後にまだ正解していない問題だけが復習に出る', function () {
    $profile = createActiveProfile();
    [$q1, , $w1] = createQuestionWithChoices();
    [$q2, $c2, $w2] = createQuestionWithChoices();
    $this->postJson("/api/questions/{$q1->id}/answer", ['choice_id' => $w1->id])->assertOk();
    $this->postJson("/api/questions/{$q2->id}/answer", ['choice_id' => $w2->id])->assertOk();
    $this->postJson("/api/questions/{$q2->id}/answer", ['choice_id' => $c2->id])->assertOk();

    expect(Review::questionIds($profile))->toBe([$q1->id]);
});

it('正解した後にまたまちがえた問題は、また出る', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);
    recordReviewAnswer($profile, $question, true);
    recordReviewAnswer($profile, $question, false);

    expect(Review::questionIds($profile))->toBe([$question->id]);
});

it('やり直しの回答は、復習に出る問題を変えない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect(Review::questionIds($profile))->toBe([$question->id]);
});

it('まちがえたのが古い順に、最大5問', function () {
    $profile = createActiveProfile();
    $questions = collect(range(1, 6))->map(fn () => createQuestionWithChoices()[0]);
    $questions->each(fn (Question $question) => recordReviewAnswer($profile, $question, false));
    // 1問目をもう一度まちがえると、一番新しいまちがいになる
    recordReviewAnswer($profile, $questions[0], false);

    expect(Review::questionIds($profile, 5))->toBe($questions->slice(1)->pluck('id')->all());
});

it('消された問題は出ない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);
    $question->delete();

    expect(Review::questionIds($profile))->toBe([]);
});

it('相棒がいないと、町のAPIの復習はスプルが出す', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('review', [
        'available' => true, 'count' => 1, 'giver' => ['kind' => 'spru', 'key' => null, 'name' => 'スプル'],
    ]);
});

it('相棒がいると、復習は相棒が出す', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモ']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->getJson('/api/world')->assertJsonPath('review.giver', ['kind' => 'companion', 'key' => 'momo', 'name' => 'モモ']);
});

it('復習する問題が無ければ、「！」は出ない', function () {
    createActiveProfile();

    $this->getJson('/api/world')->assertJsonPath('review.available', false)->assertJsonPath('review.count', 0);
});

it('復習の問題は、正解の手がかりを隠して出る', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $response = $this->getJson('/api/review')->assertOk()
        ->assertJsonPath('giver.kind', 'spru')
        ->assertJsonCount(1, 'questions')
        ->assertJsonPath('questions.0.id', $question->id)
        ->assertJsonPath('questions.0.prompt', 'テスト問題');

    collect($response->json('questions.0.choices'))->each(fn (array $choice) => expect($choice)->not->toHaveKey('is_correct'));
});

it('やりきると今日の記録が付き、相棒に+5。「！」は次の日まで出ない', function () {
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC')); // 日本時間 12:00
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->postJson('/api/review/complete')
        ->assertOk()
        ->assertJsonPath('bond_gained', 5)
        ->assertJsonPath('partner.key', 'momo');

    expect($momo->fresh()->bond)->toBe(5)
        ->and($profile->fresh()->last_review_on->toDateString())->toBe('2026-09-27');
    $this->getJson('/api/world')->assertJsonPath('review.available', false)->assertJsonPath('review.count', 1);
    $this->getJson('/api/review')->assertStatus(422)->assertJsonPath('message', '今日の復習はもう終わったよ。また明日ね');

    $this->travelTo(Carbon::parse('2026-09-27 15:00:00', 'UTC')); // 日本時間 翌日の0:00
    $this->getJson('/api/world')->assertJsonPath('review.available', true);
});

it('スプルが出した復習をやりきっても、なかよし度は誰にも足さない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    recordReviewAnswer($profile, $question, false);

    $this->postJson('/api/review/complete')->assertOk()->assertJsonPath('bond_gained', 0)->assertJsonPath('partner', null);
});

it('今日すでにやりきっていれば、もう一度はやりきれない', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->postJson('/api/review/complete')->assertOk();
    $this->postJson('/api/review/complete')->assertStatus(422)->assertJsonPath('message', '今日の復習はもう終わったよ。また明日ね');

    expect($momo->fresh()->bond)->toBe(5);
});

it('復習する問題が無いと、復習は始められない', function () {
    createActiveProfile();

    $this->getJson('/api/review')->assertStatus(422)->assertJsonPath('message', '復習する問題はないよ');
});

it('やりきってハートが増えると、そのことが返る', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'bond' => 16]);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->postJson('/api/review/complete')
        ->assertOk()
        ->assertJsonPath('partner.hearts', 2)
        ->assertJsonPath('partner.hearts_up', true)
        ->assertJsonPath('partner.new_line', 'まちがえても大丈夫。つぎはきっとできるよ');
});
