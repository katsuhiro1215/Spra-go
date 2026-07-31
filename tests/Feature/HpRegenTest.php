<?php

use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| HP自然回復のテスト
|--------------------------------------------------------------------------
|
| HPは0になっても時間経過での自然回復が無く、遊び続けられてしまっていた
| 不具合を修正(2026-07-31 Owner確認)。1HPあたり4.5分、フル回復(20HP)まで
| 1.5時間。HPが0の間は回答APIをブロックする。
|
*/

afterEach(function () {
    Carbon::setTestNow();
});

it('フルHPから減り始めると回復タイマーが起動する', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00'));
    $profile = createActiveProfile();
    expect($profile->fresh()->hp)->toBe(20);

    [$question, , $wrong] = createQuestionWithChoices();
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id]);

    $profile->refresh();
    expect($profile->hp)->toBe(18);
    expect($profile->hp_updated_at)->not->toBeNull();
});

it('4.5分ごとに1HP回復する', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00'));
    $profile = createActiveProfile();

    [$question, , $wrong] = createQuestionWithChoices();
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id]);
    $profile->refresh();
    expect($profile->hp)->toBe(18);

    Carbon::setTestNow(Carbon::parse('2026-08-01 10:04:00'));
    $profile->regenerateHp();
    expect($profile->fresh()->hp)->toBe(18); // まだ4.5分経っていない

    Carbon::setTestNow(Carbon::parse('2026-08-01 10:05:00'));
    $profile->regenerateHp();
    expect($profile->fresh()->hp)->toBe(19);

    Carbon::setTestNow(Carbon::parse('2026-08-01 11:40:00'));
    $profile->regenerateHp();
    expect($profile->fresh()->hp)->toBe(20);
    expect($profile->fresh()->hp_updated_at)->toBeNull();
});

it('HPが0の間は回答APIがブロックされ、スコアも変わらない', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00'));
    $profile = createActiveProfile();
    UserProfile::where('id', $profile->id)->update(['hp' => 0, 'hp_updated_at' => Carbon::now()]);

    [$question, $correct] = createQuestionWithChoices();
    $response = $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id]);

    $response->assertStatus(409);
    expect($response->json('blocked'))->toBeTrue();
    expect($response->json('profile.hp_regen_seconds'))->toBeInt();
    expect($profile->fresh()->xp)->toBe(0);
});

it('回復に必要な時間が経てば再び回答できる', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-01 10:00:00'));
    $profile = createActiveProfile();
    UserProfile::where('id', $profile->id)->update(['hp' => 0, 'hp_updated_at' => Carbon::now()]);

    Carbon::setTestNow(Carbon::parse('2026-08-01 10:05:00'));
    [$question, $correct] = createQuestionWithChoices();
    $response = $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id]);

    $response->assertOk();
    expect($response->json('profile.hp'))->toBe(0); // 正解でも-1されて0のまま(max(0,...))
});
