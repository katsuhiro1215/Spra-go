<?php

use App\Support\Bond;

/*
|--------------------------------------------------------------------------
| 相棒のなかよし度(docs/design/2026-09-27-spru-wave-c-design.md 3-3・3-4)
|--------------------------------------------------------------------------
|
| 相棒でいる間に正解すると、相棒のなかよし度が1上がる。ハートの数は
| なかよし度から計算し、ハートが増えると新しいひとことを覚える。
|
*/

it('なかよし度からハートの数と呼び方が決まる', function (int $bond, int $hearts, string $label) {
    expect(Bond::hearts($bond))->toBe($hearts)
        ->and(Bond::label($hearts))->toBe($label);
})->with([
    [0, 1, 'はじめまして'],
    [19, 1, 'はじめまして'],
    [20, 2, 'なかよし'],
    [49, 2, 'なかよし'],
    [50, 3, 'とってもなかよし'],
    [100, 4, 'だいすき'],
    [179, 4, 'だいすき'],
    [180, 5, 'しんゆう'],
    [999, 5, 'しんゆう'],
]);

it('次のハートに必要ななかよし度を返し、ハート5つなら null', function () {
    expect(Bond::nextHeartBond(0))->toBe(20)
        ->and(Bond::nextHeartBond(20))->toBe(50)
        ->and(Bond::nextHeartBond(179))->toBe(180)
        ->and(Bond::nextHeartBond(180))->toBeNull();
});

it('覚えているひとことはハートの数だけ', function () {
    expect(Bond::lines('momo', 1))->toBe(['お花、きれいだね'])
        ->and(Bond::lines('momo', 3))->toBe([
            'お花、きれいだね',
            'まちがえても大丈夫。つぎはきっとできるよ',
            'きみががんばってるの、ちゃんと見てるよ',
        ]);
});

it('相棒がいれば、正解で相棒のなかよし度だけが1上がる', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $kuru = $profile->companions()->create(['companion_key' => 'kuru']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.partner', [
            'key' => 'momo', 'name' => 'Momo', 'hearts' => 1, 'heart_label' => 'はじめまして', 'hearts_up' => false, 'new_line' => null,
        ]);

    expect($momo->fresh()->bond)->toBe(1)
        ->and($kuru->fresh()->bond)->toBe(0);
});

it('まちがえたときは、なかよし度は上がらない', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])
        ->assertOk()
        ->assertJsonPath('profile.partner.key', 'momo')
        ->assertJsonPath('profile.partner.hearts_up', false);

    expect($momo->fresh()->bond)->toBe(0);
});

it('相棒がいなければ、回答の partner は null', function () {
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.partner', null);
});

it('ハートが増えた回答では、増えたことと新しいひとことが返る', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'bond' => 19]);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.partner', [
            'key' => 'momo', 'name' => 'Momo', 'hearts' => 2, 'heart_label' => 'なかよし', 'hearts_up' => true,
            'new_line' => 'まちがえても大丈夫。つぎはきっとできるよ',
        ]);
});

it('名前を付けていれば、相棒は名前で返る', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモちゃん']);
    $profile->update(['partner_companion_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.partner.name', 'モモちゃん');
});
