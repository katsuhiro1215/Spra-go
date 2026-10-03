<?php

use App\Models\User;
use App\Support\AppSettings;

/*
|--------------------------------------------------------------------------
| 招待制の登録(docs/design/2026-10-03-closed-beta-design.md 3-2・3-3)
|--------------------------------------------------------------------------
*/

function registrationPayload(array $extra = []): array
{
    return array_merge([
        'name' => '招待ユーザー',
        'email' => 'invited@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ], $extra);
}

it('コードが空なら、コードなしで登録できる', function () {
    $this->postJson('/register', registrationPayload())->assertNoContent();

    $this->assertAuthenticated();
});

it('コードがあるとき、正しいコードで登録できる(前後の空白と大文字小文字は区別しない)', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    $this->postJson('/register', registrationPayload(['invite_code' => '  sPRA2026 ']))->assertNoContent();

    expect(User::where('email', 'invited@example.com')->exists())->toBeTrue();
});

it('コードがあるとき、違うコード・コードなしは422で、ユーザーは作られない', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    $this->postJson('/register', registrationPayload(['invite_code' => 'ちがう']))
        ->assertStatus(422)->assertJsonPath('errors.invite_code.0', '招待コードが違います');
    $this->postJson('/register', registrationPayload())
        ->assertStatus(422)->assertJsonPath('errors.invite_code.0', '招待コードを入れてください');

    expect(User::where('email', 'invited@example.com')->exists())->toBeFalse();
    $this->assertGuest();
});

it('登録を一時停止すると、正しいコードでも403', function () {
    AppSettings::update(['invite_code' => 'Spra2026', 'registration_open' => false]);

    $this->postJson('/register', registrationPayload(['invite_code' => 'Spra2026']))
        ->assertStatus(403)->assertJsonPath('message', 'いまは登録をおやすみしています');

    expect(User::where('email', 'invited@example.com')->exists())->toBeFalse();
});

it('一時停止中でも、登録済みの人はログインできる', function () {
    $user = User::factory()->create(['email' => 'old@example.com']);
    AppSettings::update(['registration_open' => false]);

    $this->postJson('/login', ['email' => 'old@example.com', 'password' => 'password'])->assertNoContent();
    $this->assertAuthenticatedAs($user);
});

it('登録の問い合わせは、コードを返さず、要るかどうかだけ返す', function () {
    $this->getJson('/api/registration')->assertOk()->assertExactJson(['open' => true, 'invite_required' => false]);

    AppSettings::update(['invite_code' => 'Spra2026', 'registration_open' => false]);

    $response = $this->getJson('/api/registration')->assertOk()
        ->assertExactJson(['open' => false, 'invite_required' => true]);

    expect($response->getContent())->not->toContain('Spra2026');
});

it('登録を1分に11回続けると、429で止まる(コードの総当たり対策)', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    foreach (range(1, 10) as $i) {
        $this->postJson('/register', registrationPayload(['invite_code' => "x{$i}"]))->assertStatus(422);
    }

    $this->postJson('/register', registrationPayload(['invite_code' => 'x11']))->assertStatus(429);
});
