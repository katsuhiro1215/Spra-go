<?php

use App\Models\User;
use App\Models\UserSchema;
use App\Support\Garden;

/*
|--------------------------------------------------------------------------
| 相棒えらびと名前(docs/design/2026-09-27-spru-wave-c-design.md 3-1・3-2)
|--------------------------------------------------------------------------
|
| 最初に生まれた仲間は自動で相棒になる。相棒は仲間の立ち位置の先頭(スプルの隣)に立つ。
| 名前は1〜8文字で、前後の空白を取り、空なら元の名前に戻す。
|
*/

it('仲間の一覧に名前・ハート・相棒かが出て、相棒が先頭に立つ', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'ruru']);
    $profile->companions()->create(['companion_key' => 'lumi', 'nickname' => 'ピカ', 'bond' => 25]);
    $profile->update(['partner_companion_key' => 'lumi']);

    $this->getJson('/api/world')
        ->assertJsonPath('companions.0', [
            'key' => 'lumi', 'name' => 'ピカ', 'official_name' => 'Lumi', 'nickname' => 'ピカ', 'trait' => '光・ひらめき',
            'lines' => ['ひらめいた！いっしょに学ぼう', 'わかった瞬間って、ピカッとするよね'],
            'hearts' => 2, 'heart_label' => 'なかよし', 'bond' => 25, 'next_heart_bond' => 50, 'is_partner' => true, 'x' => 0, 'y' => 3,
        ])
        ->assertJsonPath('companions.1.key', 'ruru')
        ->assertJsonPath('companions.1.is_partner', false)
        ->assertJsonPath('companions.1.x', 3)
        ->assertJsonPath('companions.1.y', 2);
});

it('最初に生まれた仲間は、自動で相棒になる', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => 2]);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('born.key', 'momo')
        ->assertJsonPath('born.is_partner', true);

    expect($profile->fresh()->partner_companion_key)->toBe('momo');
});

it('2人目からは、生まれても相棒は替わらない', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'lumi']);
    $profile->update(['partner_companion_key' => 'lumi', 'last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => 2]);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('born.is_partner', false)
        ->assertJsonPath('born.x', 3)
        ->assertJsonPath('born.y', 2);

    expect($profile->fresh()->partner_companion_key)->toBe('lumi');
});

it('相棒を替えると、並びと立ち位置と復習を出す人が替わる', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo']);
    $profile->companions()->create(['companion_key' => 'kuru']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->postJson('/api/world/partner', ['key' => 'kuru'])
        ->assertOk()
        ->assertJsonPath('companions.0.key', 'kuru')
        ->assertJsonPath('companions.0.is_partner', true)
        ->assertJsonPath('companions.0.x', 0)
        ->assertJsonPath('companions.0.y', 3)
        ->assertJsonPath('companions.1.key', 'momo')
        ->assertJsonPath('companions.1.x', 3)
        ->assertJsonPath('review.giver.key', 'kuru');

    expect($profile->fresh()->partner_companion_key)->toBe('kuru');
});

it('まだ生まれていない仲間は、相棒にできない', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->postJson('/api/world/partner', ['key' => 'piko'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ生まれていない仲間だよ');

    expect($profile->fresh()->partner_companion_key)->toBe('momo');
});

it('名前を付けられ、前後の空白(全角も)は取れる', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->patchJson('/api/world/companions/momo', ['nickname' => '　モモちゃん '])
        ->assertOk()
        ->assertJsonPath('companions.0.name', 'モモちゃん')
        ->assertJsonPath('companions.0.official_name', 'Momo')
        ->assertJsonPath('review.giver.name', 'モモちゃん');

    expect($momo->fresh()->nickname)->toBe('モモちゃん');
});

it('空や空白だけにすると、元の名前に戻る', function (?string $input) {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモちゃん']);

    $this->patchJson('/api/world/companions/momo', ['nickname' => $input])
        ->assertOk()
        ->assertJsonPath('companions.0.name', 'Momo')
        ->assertJsonPath('companions.0.nickname', null);

    expect($momo->fresh()->nickname)->toBeNull();
})->with(['空文字' => [''], '半角の空白' => ['   '], '全角の空白' => ['　'], 'null' => [null]]);

it('8文字ちょうどの名前は付けられる', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo']);

    $this->patchJson('/api/world/companions/momo', ['nickname' => 'あいうえおかきく'])
        ->assertOk()
        ->assertJsonPath('companions.0.name', 'あいうえおかきく');
});

it('9文字以上や改行の入った名前は付けられない', function (string $input, string $message) {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo']);

    $this->patchJson('/api/world/companions/momo', ['nickname' => $input])
        ->assertStatus(422)
        ->assertJsonPath('errors.nickname.0', $message);

    expect($momo->fresh()->nickname)->toBeNull();
})->with([
    '9文字' => ['あいうえおかきくけ', '8文字までにしてね'],
    '改行' => ["モ\nモ", '使えない文字が入っているよ'],
]);

it('まだ生まれていない仲間の名前は変えられない', function () {
    createActiveProfile();

    $this->patchJson('/api/world/companions/momo', ['nickname' => 'モモ'])->assertNotFound();
});

it('ほかのプロフィールの仲間の名前は変えられない', function () {
    $other = User::factory()->create()->schema()->create(['name' => 'よその家族'])->profiles()->create(['name' => 'よその子']);
    $othersMomo = $other->companions()->create(['companion_key' => 'momo']);
    createActiveProfile();

    $this->patchJson('/api/world/companions/momo', ['nickname' => 'モモ'])->assertNotFound();

    expect($othersMomo->fresh()->nickname)->toBeNull();
});

it('更新のとき、仲間がいて相棒がいないプロフィールは、最初に生まれた仲間が相棒になる', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'kuru']);
    $profile->companions()->create(['companion_key' => 'momo']);
    // UserProfile::schema() は外部キー名が合わず使えないため、user_schema_id から家族を取る
    $family = UserSchema::findOrFail($profile->user_schema_id);
    $noCompanion = $family->profiles()->create(['name' => '仲間なし']);
    $chosen = $family->profiles()->create(['name' => '相棒あり', 'partner_companion_key' => 'piko']);
    $chosen->companions()->create(['companion_key' => 'lumi']);
    $chosen->companions()->create(['companion_key' => 'piko']);

    (require database_path('migrations/2026_09_27_000008_make_first_companion_partner.php'))->up();

    expect($profile->fresh()->partner_companion_key)->toBe('kuru')
        ->and($noCompanion->fresh()->partner_companion_key)->toBeNull()
        ->and($chosen->fresh()->partner_companion_key)->toBe('piko');
});
