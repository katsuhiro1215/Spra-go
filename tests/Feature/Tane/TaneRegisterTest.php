<?php

use App\Models\User;
use App\Support\AppSettings;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;

// Tane からの登録(Spra Go と同じ招待制に従う)

beforeEach(function () {
    config(['tane.login_enabled' => true]);
});

function taneRegisterBody(array $over = []): array
{
    return array_merge([
        'name' => 'Tane User',
        'email' => 'tane@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => true,
        'device_name' => 'iPad',
    ], $over);
}

test('登録できて、トークンが返り、そのトークンで入れる', function () {
    $res = $this->postJson('/api/auth/register-token', taneRegisterBody())
        ->assertCreated()
        ->assertJsonPath('user.email', 'tane@example.com')
        ->assertJsonPath('user.email_verified', false);

    $user = User::where('email', 'tane@example.com')->firstOrFail();
    expect($user->tokens()->first()->name)->toBe('tane:iPad');

    $this->app['auth']->forgetGuards();
    $this->withToken($res->json('token'))->getJson('/api/user')->assertOk()->assertJsonPath('id', $user->id);
});

test('同意の日時と版が残り、家族アカウントが1つできる', function () {
    $this->postJson('/api/auth/register-token', taneRegisterBody())->assertCreated();

    $user = User::where('email', 'tane@example.com')->firstOrFail();
    expect($user->terms_accepted_at)->not->toBeNull()
        ->and($user->terms_version)->toBe(config('legal.version'))
        ->and($user->schema()->count())->toBe(1);
});

test('確認メールが送られる', function () {
    Notification::fake();

    $this->postJson('/api/auth/register-token', taneRegisterBody())->assertCreated();

    Notification::assertSentTo(User::where('email', 'tane@example.com')->firstOrFail(), VerifyEmail::class);
});

test('登録をおやすみしているときは403', function () {
    AppSettings::update(['registration_open' => false]);

    $this->postJson('/api/auth/register-token', taneRegisterBody())->assertForbidden();
    expect(User::count())->toBe(0);
});

test('招待コードが要るとき、無い・違うと422、合えば登録できる', function () {
    AppSettings::update(['invite_code' => 'Spra2026']);

    $this->postJson('/api/auth/register-token', taneRegisterBody())->assertUnprocessable()->assertJsonValidationErrors('invite_code');
    $this->postJson('/api/auth/register-token', taneRegisterBody(['invite_code' => 'nope']))->assertUnprocessable()->assertJsonValidationErrors('invite_code');
    expect(User::count())->toBe(0);

    $this->postJson('/api/auth/register-token', taneRegisterBody(['invite_code' => 'spra2026']))->assertCreated();
});

test('TANE_LOGIN_ENABLED が off のときは403で、アカウントも作られない', function () {
    config(['tane.login_enabled' => false]);

    $this->postJson('/api/auth/register-token', taneRegisterBody())->assertForbidden();
    expect(User::count())->toBe(0);
});

test('規約に同意していない・device_name が無いと422', function () {
    $this->postJson('/api/auth/register-token', taneRegisterBody(['terms' => false]))->assertUnprocessable()->assertJsonValidationErrors('terms');
    $this->postJson('/api/auth/register-token', array_diff_key(taneRegisterBody(), ['device_name' => 1]))->assertUnprocessable()->assertJsonValidationErrors('device_name');
});

test('Spra Go のクッキーの登録は、これまでどおりトークンを作らない', function () {
    $this->post('/register', ['name' => 'Cookie', 'email' => 'cookie@example.com', 'password' => 'password', 'password_confirmation' => 'password', 'terms' => true])->assertNoContent();

    expect(User::where('email', 'cookie@example.com')->firstOrFail()->tokens()->count())->toBe(0);
});
