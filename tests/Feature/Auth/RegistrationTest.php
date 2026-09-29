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
    ])->assertNoContent();

    Notification::assertSentTo(User::where('email', 'verify@example.com')->firstOrFail(), VerifyEmail::class);
});
