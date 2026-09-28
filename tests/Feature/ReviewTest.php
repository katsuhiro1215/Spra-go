<?php

use App\Models\Question;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use App\Support\Review;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 仲間からの復習(docs/design/2026-09-27-spru-wave-c-design.md 3-5)
|--------------------------------------------------------------------------
|
| 出す日が来た問題(まちがえた問題も正解したことのある問題も)を、出す日が古い順に最大10問出す
| (docs/design/2026-09-29-spaced-review-design.md 4-7)。1日1回(日本時間)で、やりきると相棒のなかよし度が5上がる。
|
*/

/** 出す日が来た問題にする(9/20にまちがえた → 9/21から出す)。$daysAgo で出す日の古さを変える */
function makeDue(UserProfile $profile, Question $question, int $daysAgo = 9): void
{
    QuestionMemory::record($profile, $question->id, false, now('Asia/Tokyo')->subDays($daysAgo)->toDateString());
}

it('出す日が来た問題が出る。正解したことのある問題も、出す日が来れば出る', function () {
    $profile = createActiveProfile();
    [$wrongOnce] = createQuestionWithChoices();
    [$rightBefore] = createQuestionWithChoices();
    [$notYet] = createQuestionWithChoices();
    makeDue($profile, $wrongOnce, 5);
    QuestionMemory::record($profile, $rightBefore->id, true, now('Asia/Tokyo')->subDays(4)->toDateString());
    QuestionMemory::record($profile, $notYet->id, false);

    expect(Review::questionIds($profile))->toBe([$wrongOnce->id, $rightBefore->id]);
});

it('やり直しの回答は、復習に出る問題を変えない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    makeDue($profile, $question);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect(Review::questionIds($profile))->toBe([$question->id]);
});

it('出す日が古い順に、最大10問', function () {
    $profile = createActiveProfile();
    $questions = collect(range(1, 11))->map(fn () => createQuestionWithChoices()[0]);
    $questions->each(fn (Question $question, int $i) => makeDue($profile, $question, 20 - $i));

    expect(Review::questionIds($profile))->toBe($questions->take(10)->pluck('id')->all());
});

it('消された問題は出ない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    makeDue($profile, $question);
    $question->delete();

    expect(Review::questionIds($profile))->toBe([]);
});

it('相棒がいないと、町のAPIの復習はスプルが出す', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    makeDue($profile, $question);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('review', [
        'available' => true, 'count' => 1, 'giver' => ['kind' => 'spru', 'key' => null, 'name' => 'スプル'],
    ]);
});

it('相棒がいると、復習は相棒が出す', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモ']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question] = createQuestionWithChoices();
    makeDue($profile, $question);

    $this->getJson('/api/world')->assertJsonPath('review.giver', ['kind' => 'companion', 'key' => 'momo', 'name' => 'モモ']);
});

it('復習する問題が無ければ、「！」は出ない', function () {
    createActiveProfile();

    $this->getJson('/api/world')->assertJsonPath('review.available', false)->assertJsonPath('review.count', 0);
});

it('復習の問題は、正解の手がかりを隠して出る', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    makeDue($profile, $question);

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
    makeDue($profile, $question);

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
    makeDue($profile, $question);

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
