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

/** 「きのう(2026-08-01)まで $current 日つづいていて、いちばん長い連続は $best 日」の状態にする */
function prepareStreak(\App\Models\UserProfile $profile, int $current, int $best): void
{
    $profile->update([
        'current_streak' => $current,
        'best_streak' => $best,
        'last_played_date' => '2026-08-01',
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

it('連続が節目(3日・7日・30日)に伸びた日は、その日数を返す', function (int $before, ?int $milestone) {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, $before, $before);
    [$question, $correct] = createQuestionWithChoices();

    $response = answerOnce($question->id, $correct->id);

    expect($response->json('profile.streak'))->toBe($before + 1);
    expect($response->json('profile.streak_milestone'))->toBe($milestone);
})->with([
    '2日' => [1, null],
    '3日' => [2, 3],
    '4日' => [3, null],
    '7日' => [6, 7],
    '14日' => [13, null],
    '30日' => [29, 30],
]);

it('初めて節目に届いた日は、初めてと返す', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, 2, 2);
    [$question, $correct] = createQuestionWithChoices();

    $response = answerOnce($question->id, $correct->id);

    expect($response->json('profile.streak_milestone'))->toBe(3);
    expect($response->json('profile.streak_milestone_first'))->toBeTrue();
});

it('いちばん長い連続がすでに節目以上なら、2回目と返す', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, 2, 10);
    [$question, $correct] = createQuestionWithChoices();

    $response = answerOnce($question->id, $correct->id);

    expect($response->json('profile.streak_milestone'))->toBe(3);
    expect($response->json('profile.streak_milestone_first'))->toBeFalse();
    expect($profile->fresh()->best_streak)->toBe(10);
});

it('同じ日の2問目は、節目を返さない', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, 2, 2);
    [$q1, $c1] = createQuestionWithChoices();
    answerOnce($q1->id, $c1->id);

    [$q2, $c2] = createQuestionWithChoices();
    $response = answerOnce($q2->id, $c2->id);

    expect($response->json('profile.streak'))->toBe(3);
    expect($response->json('profile.streak_milestone'))->toBeNull();
    expect($response->json('profile.streak_milestone_first'))->toBeFalse();
});

it('1日の最初の答えが不正解でも、節目を返す', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-02 10:00:00', 'Asia/Tokyo'));
    $profile = createActiveProfile();
    prepareStreak($profile, 2, 2);
    [$question, , $wrong] = createQuestionWithChoices();

    $response = answerOnce($question->id, $wrong->id);

    expect($response->json('correct'))->toBeFalse();
    expect($response->json('profile.streak_milestone'))->toBe(3);
    expect($response->json('profile.streak_milestone_first'))->toBeTrue();
});
