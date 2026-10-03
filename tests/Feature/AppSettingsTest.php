<?php

use App\Models\Owner;
use App\Support\AppSettings;

/*
|--------------------------------------------------------------------------
| 公開設定(docs/design/2026-10-03-closed-beta-design.md 3-1・7)
|--------------------------------------------------------------------------
*/

it('初期値は、コードなし・登録を受け付ける・コイン購入はOFF', function () {
    expect(AppSettings::all())->toBe([
        'invite_code' => '',
        'registration_open' => true,
        'coin_purchase_enabled' => false,
    ]);
});

it('設定を保存して読み戻せる。コードの前後の空白は取る', function () {
    AppSettings::update(['invite_code' => '  Spra2026 ', 'registration_open' => false, 'coin_purchase_enabled' => true]);

    expect(AppSettings::inviteCode())->toBe('Spra2026')
        ->and(AppSettings::registrationOpen())->toBeFalse()
        ->and(AppSettings::coinPurchaseEnabled())->toBeTrue();
});

it('コードを空(null)にすると、コードなしに戻る', function () {
    AppSettings::update(['invite_code' => 'abc']);
    AppSettings::update(['invite_code' => null]);

    expect(AppSettings::inviteCode())->toBe('');
});

it('コードの照合は、前後の空白と大文字小文字を区別しない。コードが空なら一致しない', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    expect(AppSettings::inviteCodeMatches(' spra2026 '))->toBeTrue()
        ->and(AppSettings::inviteCodeMatches('spra2027'))->toBeFalse()
        ->and(AppSettings::inviteCodeMatches(''))->toBeFalse();

    AppSettings::update(['invite_code' => '']);
    expect(AppSettings::inviteCodeMatches(''))->toBeFalse();
});

it('Owner以外は設定を見ることも変えることもできない', function () {
    $this->getJson('/api/owner/settings')->assertStatus(401);
    $this->putJson('/api/owner/settings', [])->assertStatus(401);
});

it('Ownerは設定を見て、変えられる', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->getJson('/api/owner/settings')->assertOk()
        ->assertExactJson(['invite_code' => '', 'registration_open' => true, 'coin_purchase_enabled' => false]);

    $this->actingAs($owner, 'owner')->putJson('/api/owner/settings', [
        'invite_code' => 'みんなでスプラ',
        'registration_open' => false,
        'coin_purchase_enabled' => true,
    ])->assertOk()->assertJsonPath('invite_code', 'みんなでスプラ');

    expect(AppSettings::inviteCode())->toBe('みんなでスプラ')
        ->and(AppSettings::registrationOpen())->toBeFalse()
        ->and(AppSettings::coinPurchaseEnabled())->toBeTrue();
});

it('設定の値がおかしいと422(コードは64文字まで、スイッチは真偽)', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->putJson('/api/owner/settings', [
        'invite_code' => str_repeat('あ', 65),
        'registration_open' => 'たぶん',
    ])->assertStatus(422)->assertJsonValidationErrors(['invite_code', 'registration_open', 'coin_purchase_enabled']);
});
