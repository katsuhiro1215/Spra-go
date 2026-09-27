<?php

/*
|--------------------------------------------------------------------------
| 解いた直後のやり直し(docs/design/2026-09-27-spru-wave-c-design.md 3-7)
|--------------------------------------------------------------------------
|
| 練習なので、正解かどうかだけを返し、HP・XP・記録などは何も変えない。
|
*/

it('やり直しの正解は、正解かどうかだけを返し、何も変えない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    $before = $profile->fresh()->only(['hp', 'xp', 'coins', 'points', 'level', 'combo', 'current_streak']);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])
        ->assertOk()
        ->assertJsonPath('correct', true)
        ->assertJsonPath('correct_choice_id', $correct->id)
        ->assertJsonPath('profile', null);

    $after = $profile->fresh();
    expect($after->only(['hp', 'xp', 'coins', 'points', 'level', 'combo', 'current_streak']))->toBe($before)
        ->and($after->last_correct_on)->toBeNull()
        ->and($profile->currencyLedger()->count())->toBe(0);
});

it('やり直しでまちがえても、何も変えない', function () {
    $profile = createActiveProfile();
    [$question, , $wrong] = createQuestionWithChoices();
    $hp = $profile->fresh()->hp;

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id, 'practice' => true])
        ->assertOk()
        ->assertJsonPath('correct', false);

    expect($profile->fresh()->hp)->toBe($hp)
        ->and($profile->currencyLedger()->count())->toBe(0);
});

it('やり直しは、HPが0でも答えられる', function () {
    $profile = createActiveProfile();
    $profile->update(['hp' => 0, 'hp_updated_at' => now()]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])
        ->assertOk()
        ->assertJsonPath('correct', true);
});

it('やり直しの正解では、相棒のなかよし度は増えない', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect($momo->fresh()->bond)->toBe(0);
});
