<?php

use App\Models\User;
use App\Support\AppSettings;
use Laravel\Socialite\Contracts\Factory as SocialiteFactory;
use Laravel\Socialite\Two\User as SocialiteUser;

/*
|--------------------------------------------------------------------------
| Googleでのログイン・登録(docs/design/2026-10-12-google-auth-design.md)
|--------------------------------------------------------------------------
*/

function googleOn(): void
{
    config()->set('services.google', ['client_id' => 'id', 'client_secret' => 'secret', 'redirect' => 'http://localhost/auth/google/callback']);
}

/** Googleから戻ってきた人を、モックで用意する */
function googleReturns(string $id, string $email, string $name = 'グーグル太郎', bool $verified = true): void
{
    $googleUser = (new SocialiteUser)->map(['id' => $id, 'name' => $name, 'email' => $email])->setRaw(['email_verified' => $verified]);
    $provider = Mockery::mock();
    $provider->shouldReceive('user')->andReturn($googleUser);
    $factory = Mockery::mock(SocialiteFactory::class);
    $factory->shouldReceive('driver')->with('google')->andReturn($provider);
    app()->instance(SocialiteFactory::class, $factory);
}

function frontend(string $path): string
{
    return rtrim((string) config('app.frontend_url'), '/').$path;
}

it('設定がないとき、登録情報の google は false で、/auth/google は画面のログインへ戻す', function () {
    $this->getJson('/api/registration')->assertOk()->assertJsonPath('google', false);

    $this->get('/auth/google')->assertRedirect(frontend('/login?google=off'));
});

it('設定があるとき、登録情報の google は true', function () {
    googleOn();

    $this->getJson('/api/registration')->assertOk()->assertJsonPath('google', true);
});

it('/auth/google は、Googleの同意画面へ移す(メールと名前だけを求める)', function () {
    googleOn();

    $response = $this->get('/auth/google');

    $response->assertRedirect();
    $location = $response->headers->get('Location');
    expect($location)->toStartWith('https://accounts.google.com/')
        ->and($location)->toContain('client_id=id')
        ->and($location)->toContain('scope=openid+profile+email');
});

it('初めての人: アカウントを作り(メール確認済み・パスワードなし)、ログインして /profiles へ。確認メールは送らない', function () {
    googleOn();
    \Illuminate\Support\Facades\Notification::fake();
    googleReturns('g-100', 'hajimete@example.com', 'はじめて');

    $this->withSession(['google_terms' => true])->get('/auth/google/callback')->assertRedirect(frontend('/profiles'));

    $user = User::where('email', 'hajimete@example.com')->firstOrFail();
    expect($user->google_id)->toBe('g-100')
        ->and($user->name)->toBe('はじめて')
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->password)->toBeNull()
        ->and($user->schema)->not->toBeNull();
    $this->assertAuthenticatedAs($user);
    \Illuminate\Support\Facades\Notification::assertNothingSent();
});

it('すでにつないだ人: そのままログイン(アカウントは増えない)', function () {
    googleOn();
    $user = User::factory()->create(['google_id' => 'g-200', 'email' => 'old@example.com']);
    googleReturns('g-200', 'old@example.com');

    $this->get('/auth/google/callback')->assertRedirect(frontend('/profiles'));

    $this->assertAuthenticatedAs($user);
    expect(User::count())->toBe(1);
});

it('同じメールのアカウントがある(メール確認済み): Googleをつないでログイン', function () {
    googleOn();
    $user = User::factory()->create(['email' => 'same@example.com']);
    googleReturns('g-300', 'same@example.com');

    $this->get('/auth/google/callback')->assertRedirect(frontend('/profiles'));

    expect($user->fresh()->google_id)->toBe('g-300')->and(User::count())->toBe(1);
    $this->assertAuthenticatedAs($user);
});

it('同じメールのアカウントがある(メール未確認): つながず、ログインもさせない', function () {
    googleOn();
    $user = User::factory()->unverified()->create(['email' => 'unverified@example.com']);
    googleReturns('g-400', 'unverified@example.com');

    $this->get('/auth/google/callback')->assertRedirect(frontend('/login?google=link_unverified'));

    expect($user->fresh()->google_id)->toBeNull();
    $this->assertGuest();
});

it('Googleがメールを確認済みと言っていない人は、ログインできない', function () {
    googleOn();
    googleReturns('g-500', 'nocheck@example.com', verified: false);

    $this->get('/auth/google/callback')->assertRedirect(frontend('/login?google=unverified'));

    $this->assertGuest();
    expect(User::count())->toBe(0);
});

it('招待コードが要るとき: 初めての人は、コードが合えば作れる', function () {
    googleOn();
    AppSettings::update(['invite_code' => 'Spra2026']);
    googleReturns('g-600', 'coded@example.com');

    $this->withSession(['google_invite_code' => 'Spra2026', 'google_terms' => true])->get('/auth/google/callback')->assertRedirect(frontend('/profiles'));

    expect(User::where('email', 'coded@example.com')->exists())->toBeTrue();
});

it('招待コードが要るとき: 初めての人は、コードがない・違うと作れない', function (?string $code) {
    googleOn();
    AppSettings::update(['invite_code' => 'Spra2026']);
    googleReturns('g-601', 'nocode@example.com');

    $request = $code === null ? $this->withSession(['google_terms' => true]) : $this->withSession(['google_invite_code' => $code, 'google_terms' => true]);
    $request->get('/auth/google/callback')->assertRedirect(frontend('/register?google=need_code'));

    expect(User::count())->toBe(0);
    $this->assertGuest();
})->with(['コードなし' => [null], 'まちがい' => ['wrong']]);

it('招待コードが要るとき: すでに登録した人は、コードなしでログインできる', function () {
    googleOn();
    AppSettings::update(['invite_code' => 'Spra2026']);
    $user = User::factory()->create(['google_id' => 'g-700']);
    googleReturns('g-700', $user->email);

    $this->get('/auth/google/callback')->assertRedirect(frontend('/profiles'));

    $this->assertAuthenticatedAs($user);
});

it('登録がおやすみ中: 初めての人は作れないが、すでにつないだ人はログインできる', function () {
    googleOn();
    AppSettings::update(['registration_open' => false]);
    googleReturns('g-800', 'closed@example.com');

    $this->get('/auth/google/callback')->assertRedirect(frontend('/register?google=closed'));
    expect(User::count())->toBe(0);

    $user = User::factory()->create(['google_id' => 'g-801']);
    googleReturns('g-801', $user->email);
    $this->get('/auth/google/callback')->assertRedirect(frontend('/profiles'));
    $this->assertAuthenticatedAs($user);
});

it('Googleの画面でキャンセルしたら、ログインせず画面へ戻す', function () {
    googleOn();
    $provider = Mockery::mock();
    $provider->shouldReceive('user')->andThrow(new \Laravel\Socialite\Two\InvalidStateException);
    $factory = Mockery::mock(SocialiteFactory::class);
    $factory->shouldReceive('driver')->with('google')->andReturn($provider);
    app()->instance(SocialiteFactory::class, $factory);

    $this->get('/auth/google/callback?error=access_denied')->assertRedirect(frontend('/login?google=denied'));

    $this->assertGuest();
});

it('パスワードなしのアカウントは、メールとパスワードでログインできない', function () {
    $user = User::factory()->create(['password' => null, 'google_id' => 'g-900']);

    $this->postJson('/login', ['email' => $user->email, 'password' => ''])->assertStatus(422);
    $this->postJson('/login', ['email' => $user->email, 'password' => 'password'])->assertStatus(422);

    $this->assertGuest();
});

it('初めての人は、規約に同意していないと作れない。同意した人は、日時と版が残る', function () {
    googleOn();
    googleReturns('g-700', 'noterms-g@example.com');

    $this->get('/auth/google/callback')->assertRedirect(frontend('/register?google=need_terms'));
    expect(User::count())->toBe(0);
    $this->assertGuest();

    $this->get('/auth/google?terms=1');
    $this->get('/auth/google/callback')->assertRedirect(frontend('/profiles'));
    $user = User::where('email', 'noterms-g@example.com')->firstOrFail();
    expect($user->terms_accepted_at)->not->toBeNull()->and($user->terms_version)->toBe(config('legal.version'));
});

it('すでに登録した人は、同意の印がなくてもログインできる', function () {
    googleOn();
    User::factory()->create(['email' => 'old@example.com', 'google_id' => 'g-701']);
    googleReturns('g-701', 'old@example.com');

    $this->get('/auth/google/callback')->assertRedirect(frontend('/profiles'));
});
