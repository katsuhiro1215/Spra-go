<?php

use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| ストリーク(継続プレイ)のテスト
|--------------------------------------------------------------------------
|
| docs/AppInfo.mdが「最重要要素」の1つに挙げながら未実装だった機能
| (docs/AppRoadmap.md)。日境界はAsia/Tokyo固定、1日1回だけカウントする。
|
*/

afterEach(function () {
    Carbon::setTestNow();
});

function answerOnce(int $questionId, int $choiceId): \Illuminate\Testing\TestResponse
{
    return test()->postJson("/api/questions/{$questionId}/answer", [
        'choice_id' => $choiceId,
    ]);
}

it('初めてプレイした日はストリークが1になる', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $response = answerOnce($question->id, $correct->id);

    expect($response->json('profile.streak'))->toBe(1);
    expect($response->json('profile.streak_extended_today'))->toBeTrue();
    expect($profile->fresh()->best_streak)->toBe(1);
});

it('同じ日に何度答えてもストリークは増えない', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Tokyo'));
    createActiveProfile();

    [$q1, $c1] = createQuestionWithChoices();
    answerOnce($q1->id, $c1->id);

    Carbon::setTestNow(Carbon::parse('2026-08-01 20:00:00', 'Asia/Tokyo'));
    [$q2, $c2] = createQuestionWithChoices();
    $response = answerOnce($q2->id, $c2->id);

    expect($response->json('profile.streak'))->toBe(1);
    expect($response->json('profile.streak_extended_today'))->toBeFalse();
});

it('翌日プレイするとストリークが1増える', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Tokyo'));
    createActiveProfile();
    [$q1, $c1] = createQuestionWithChoices();
    answerOnce($q1->id, $c1->id);

    Carbon::setTestNow(Carbon::parse('2026-08-02 09:00:00', 'Asia/Tokyo'));
    [$q2, $c2] = createQuestionWithChoices();
    $response = answerOnce($q2->id, $c2->id);

    expect($response->json('profile.streak'))->toBe(2);
});

it('1日空くとストリークが1にリセットされる(ベストは維持)', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    [$q1, $c1] = createQuestionWithChoices();
    answerOnce($q1->id, $c1->id);

    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    [$q2, $c2] = createQuestionWithChoices();
    answerOnce($q2->id, $c2->id);

    // 8/3をまるごと飛ばして8/4にプレイ
    Carbon::setTestNow(Carbon::parse('2026-08-04 10:00:00', 'Asia/Tokyo'));
    [$q3, $c3] = createQuestionWithChoices();
    $response = answerOnce($q3->id, $c3->id);

    expect($response->json('profile.streak'))->toBe(1);
    expect($profile->fresh()->best_streak)->toBe(2);
});

it('7日連続でボーナスコインが付与される', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();

    $lastResponse = null;
    for ($day = 0; $day < 7; $day++) {
        Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00', 'Asia/Tokyo')->addDays($day));
        [$question, $correct] = createQuestionWithChoices();
        $lastResponse = answerOnce($question->id, $correct->id);
    }

    expect($lastResponse->json('profile.streak'))->toBe(7);
    expect($lastResponse->json('profile.streak_milestone_bonus_coin'))->toBe(50);
});
