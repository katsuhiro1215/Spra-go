<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;

test('new users can register', function () {
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => true,
    ]);

    $this->assertAuthenticated();
    $response->assertNoContent();
});

test('登録すると、確認メールが送られる(docs/design/2026-09-29-email-verify-reset-design.md 4-1)', function () {
    Notification::fake();

    $this->post('/register', [
        'name' => 'Verify User',
        'email' => 'verify@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => true,
    ])->assertNoContent();

    Notification::assertSentTo(User::where('email', 'verify@example.com')->firstOrFail(), VerifyEmail::class);
});

test('確認メールが送れなくても(メールのサーバーが止まっているなど)登録は成功し、ログインした状態になる', function () {
    // 確認メールを送る処理(Registered のイベント)が失敗したときの代わり
    Illuminate\Support\Facades\Event::listen(Illuminate\Auth\Events\Registered::class, function () {
        throw new RuntimeException('メールのサーバーにつながらない');
    });

    $this->post('/register', [
        'name' => 'Mail Down',
        'email' => 'mail-down@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => true,
    ])->assertNoContent();

    $this->assertAuthenticated();
    expect(User::where('email', 'mail-down@example.com')->exists())->toBeTrue();
});

test('規約への同意がないと登録できない(同意の日時と版を残す)', function () {
    $payload = ['name' => '同意なし', 'email' => 'noterms@example.com', 'password' => 'password', 'password_confirmation' => 'password'];

    $this->postJson('/register', $payload)->assertUnprocessable()->assertJsonValidationErrors('terms');
    $this->postJson('/register', $payload + ['terms' => false])->assertUnprocessable()->assertJsonValidationErrors('terms');
    expect(User::where('email', 'noterms@example.com')->exists())->toBeFalse();

    $this->travelTo(now()->setDate(2026, 10, 14)->setTime(9, 0));
    $this->postJson('/register', $payload + ['terms' => true])->assertNoContent();

    $user = User::where('email', 'noterms@example.com')->firstOrFail();
    expect($user->terms_accepted_at?->toDateTimeString())->toBe('2026-10-14 09:00:00')
        ->and($user->terms_version)->toBe(config('legal.version'));
});
