<?php

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;

// Tane のトークンのログイン(docs/design/2026-10-21-tane-account-sync-request.md 1)

beforeEach(function () {
    config(['tane.login_enabled' => true]);
});

function taneLogin(string $email, string $password = 'password', array $extra = [])
{
    return test()->postJson('/api/auth/token', array_merge(['email' => $email, 'password' => $password, 'device_name' => 'iPad'], $extra));
}

test('正しいメールとパスワードでトークンが返り、そのトークンでログインした状態になる', function () {
    $user = User::factory()->create();

    $res = taneLogin($user->email)->assertCreated()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.email', $user->email)
        ->assertJsonPath('user.email_verified', true);

    $token = $res->json('token');
    expect($token)->toBeString()->not->toBeEmpty();
    expect($user->tokens()->first()->name)->toBe('tane:iPad');

    // クッキーの代わりに Bearer だけで呼ぶ(セッションを持ち越さない)
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/user')->assertOk()->assertJsonPath('id', $user->id);
});

test('まちがったパスワードは422、5回まちがえたあとは429(正しいパスワードでもしばらく通らない)', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $i) {
        taneLogin($user->email, 'wrong-password')->assertUnprocessable();
    }
    taneLogin($user->email)->assertStatus(429);
    expect($user->tokens()->count())->toBe(0);
});

test('TANE_LOGIN_ENABLED が off のときは403で、トークンは作られない', function () {
    config(['tane.login_enabled' => false]);
    $user = User::factory()->create();

    taneLogin($user->email)->assertForbidden();
    expect($user->tokens()->count())->toBe(0);
});

test('パスワードが無い(Googleだけで登録した)人は422で、設定でパスワードを決めるよう案内する', function () {
    $user = User::factory()->create();
    $user->forceFill(['password' => null])->save();

    taneLogin($user->email)->assertUnprocessable()
        ->assertJsonPath('message', 'Spra Go の せっていで パスワードを きめてね');
});

test('メールが存在しなくても、まちがいと同じ422を返す(登録の有無を教えない)', function () {
    taneLogin('nobody@example.com')->assertUnprocessable()->assertJsonValidationErrors('email');
});

test('device_name が無いと422', function () {
    $user = User::factory()->create();

    $this->postJson('/api/auth/token', ['email' => $user->email, 'password' => 'password'])
        ->assertUnprocessable()->assertJsonValidationErrors('device_name');
});

test('ログアウトすると、そのトークンだけが失効する', function () {
    $user = User::factory()->create();
    $a = taneLogin($user->email)->json('token');
    $this->app['auth']->forgetGuards();
    $b = taneLogin($user->email)->json('token');

    $this->app['auth']->forgetGuards();
    $this->withToken($a)->deleteJson('/api/auth/token')->assertNoContent();

    $this->app['auth']->forgetGuards();
    $this->withToken($a)->getJson('/api/user')->assertUnauthorized();
    $this->app['auth']->forgetGuards();
    $this->withToken($b)->getJson('/api/user')->assertOk();
});

test('トークンは90日で切れる', function () {
    $user = User::factory()->create();
    $token = taneLogin($user->email)->json('token');

    $this->travel(89)->days();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/user')->assertOk();

    $this->travel(2)->days();
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
});

test('パスワードの再設定のあと、その人のトークンは全部失効し、ほかの人のトークンは残る', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    taneLogin($user->email);
    taneLogin($user->email);
    taneLogin($other->email);

    event(new PasswordReset($user));

    expect($user->tokens()->count())->toBe(0);
    expect($other->tokens()->count())->toBe(1);
});

test('TANE_URL からの preflight に CORS の許可が返る', function () {
    // config/cors.php を TANE_URL を入れた状態で読み直す(設定ファイルの足し方そのものを確かめる)
    putenv('TANE_URL=http://localhost:3001');
    $origins = (require config_path('cors.php'))['allowed_origins'];
    putenv('TANE_URL');
    expect($origins)->toContain('http://localhost:3001');
    config(['cors.allowed_origins' => $origins]);

    $this->call('OPTIONS', '/api/auth/token', [], [], [], [
        'HTTP_ORIGIN' => 'http://localhost:3001',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization,content-type,x-spra-app',
    ])->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
});
