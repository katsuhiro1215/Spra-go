<?php

use App\Models\User;

// 同意のしなおし(docs/design/2026-10-23-shared-account-legal-design.md 4章)

beforeEach(function () {
    config(['legal.version' => '2026-10-23']);
});

function termsUser(?string $version): User
{
    $user = User::factory()->create();
    $user->forceFill(['terms_version' => $version, 'terms_accepted_at' => $version ? now() : null])->save();

    return $user;
}

test('GET /api/user: 版が古い・空なら terms_outdated が true、同じなら false', function () {
    foreach ([['2026-10-14', true], [null, true], ['2026-10-23', false]] as [$version, $outdated]) {
        $this->actingAs(termsUser($version));
        $this->getJson('/api/user')->assertOk()
            ->assertJsonPath('terms_outdated', $outdated)
            ->assertJsonPath('terms_version_current', '2026-10-23')
            ->assertJsonStructure(['id', 'name', 'email']);
    }
});

test('POST /api/terms/accept: 現在の版なら記録が更新される', function () {
    $user = termsUser('2026-10-14');
    $this->actingAs($user);

    $this->postJson('/api/terms/accept', ['version' => '2026-10-23'])->assertNoContent();

    $user->refresh();
    expect($user->terms_version)->toBe('2026-10-23')->and($user->terms_accepted_at->isToday())->toBeTrue();
    $this->getJson('/api/user')->assertJsonPath('terms_outdated', false);
});

test('POST /api/terms/accept: 古い版・ちがう版・版なしは422で、記録は変わらない', function () {
    $user = termsUser('2026-10-14');
    $this->actingAs($user);

    $this->postJson('/api/terms/accept', ['version' => '2026-10-14'])->assertUnprocessable();
    $this->postJson('/api/terms/accept', ['version' => 'x'])->assertUnprocessable();
    $this->postJson('/api/terms/accept', [])->assertUnprocessable();
    expect($user->fresh()->terms_version)->toBe('2026-10-14');
});

test('POST /api/terms/accept: 未ログインは401、トークンでも使える', function () {
    $this->postJson('/api/terms/accept', ['version' => '2026-10-23'])->assertUnauthorized();

    $user = termsUser(null);
    $token = $user->createToken('tane:test')->plainTextToken;
    app('auth')->forgetGuards();
    $this->withToken($token)->postJson('/api/terms/accept', ['version' => '2026-10-23'])->assertNoContent();
    expect($user->fresh()->terms_version)->toBe('2026-10-23');
});

test('Tane の記録の入口: 同意が古いと403(code: terms_outdated)、同意すると通る', function () {
    [$user, $profile, $token] = taneUser();
    $user->forceFill(['terms_version' => '2026-10-14'])->save();

    taneAs($token)->getJson("/api/tane/profiles/{$profile->id}/progress")->assertForbidden()->assertJsonPath('code', 'terms_outdated');
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => []])->assertForbidden()->assertJsonPath('code', 'terms_outdated');
    taneAs($token)->getJson('/api/tane/parent/records')->assertForbidden()->assertJsonPath('code', 'terms_outdated');

    taneAs($token)->postJson('/api/terms/accept', ['version' => '2026-10-23'])->assertNoContent();
    taneAs($token)->getJson("/api/tane/profiles/{$profile->id}/progress")->assertOk();
});

test('Tane のログインは成功し、user に terms_outdated が入る', function () {
    config(['tane.login_enabled' => true]);
    $user = termsUser('2026-10-14');

    $this->postJson('/api/auth/token', ['email' => $user->email, 'password' => 'password', 'device_name' => 'iPad'])
        ->assertCreated()->assertJsonPath('user.terms_outdated', true);
});

test('新しい登録は現在の版を記録し、terms_outdated は false', function () {
    $this->post('/register', ['name' => 'N', 'email' => 'n@example.com', 'password' => 'password', 'password_confirmation' => 'password', 'terms' => true])->assertNoContent();

    expect(User::where('email', 'n@example.com')->firstOrFail()->terms_version)->toBe('2026-10-23');
    $this->getJson('/api/user')->assertJsonPath('terms_outdated', false);
});
