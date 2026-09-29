<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;

/*
|--------------------------------------------------------------------------
| 確認のリンク(docs/design/2026-09-29-email-verify-reset-design.md 4-2)
|--------------------------------------------------------------------------
|
| ログインしていなくても、期限付きの署名とメールアドレスの hash で確かめ、
| 結果を画面の /verify-email?status=… に渡す。
|
*/

function verificationUrlFor(User $user, ?string $hash = null): string
{
    return URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => $hash ?? sha1($user->email),
    ]);
}

function verifyResultUrl(string $status): string
{
    return config('app.frontend_url').'/verify-email?status='.$status;
}

test('ログインしていなくても確認でき、結果の画面(verified)へ移る', function () {
    $user = User::factory()->unverified()->create();
    Event::fake();

    $this->get(verificationUrlFor($user))->assertRedirect(verifyResultUrl('verified'));

    Event::assertDispatched(Verified::class);
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

test('期限が切れたリンクは expired へ移り、確認済みにならない', function () {
    $user = User::factory()->unverified()->create();
    $url = verificationUrlFor($user);
    $this->travel(61)->minutes();

    $this->get($url)->assertRedirect(verifyResultUrl('expired'));

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('署名を書き換えたリンクは expired へ移る', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrlFor($user).'x')->assertRedirect(verifyResultUrl('expired'));

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('hash がメールアドレスと合わないリンクは invalid へ移る', function () {
    $user = User::factory()->unverified()->create();

    $this->get(verificationUrlFor($user, sha1('wrong-email')))->assertRedirect(verifyResultUrl('invalid'));

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('もう確認済みのアカウントは verified へ移り、Verified を出し直さない', function () {
    $user = User::factory()->create();
    Event::fake();

    $this->get(verificationUrlFor($user))->assertRedirect(verifyResultUrl('verified'));

    Event::assertNotDispatched(Verified::class);
});

test('メールのリンクは24時間有効(23時間後は確認できる)', function () {
    $user = User::factory()->unverified()->create();
    $url = (new VerifyEmail)->toMail($user)->actionUrl;
    $this->travel(23)->hours();

    $this->get($url)->assertRedirect(verifyResultUrl('verified'));
});

test('メールのリンクは25時間後には期限切れ', function () {
    $user = User::factory()->unverified()->create();
    $url = (new VerifyEmail)->toMail($user)->actionUrl;
    $this->travel(25)->hours();

    $this->get($url)->assertRedirect(verifyResultUrl('expired'));
});

test('確認メールをもう一度送れる。確認済みなら送らずに already-verified を返す', function () {
    Notification::fake();

    $unverified = User::factory()->unverified()->create();
    $this->actingAs($unverified)
        ->postJson('/email/verification-notification')
        ->assertOk()
        ->assertJson(['status' => 'verification-link-sent']);
    Notification::assertSentTo($unverified, VerifyEmail::class);

    $verified = User::factory()->create();
    $this->actingAs($verified)
        ->postJson('/email/verification-notification')
        ->assertOk()
        ->assertJson(['status' => 'already-verified']);
    Notification::assertNotSentTo($verified, VerifyEmail::class);
});
