<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;

test('reset password link can be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class);
});

test('password can be reset with valid token', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post('/forgot-password', ['email' => $user->email]);

    Notification::assertSentTo($user, ResetPassword::class, function (object $notification) use ($user) {
        $response = $this->post('/reset-password', [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertStatus(200);

        return true;
    });
});

test('登録のないアドレスでも、登録のあるアドレスと同じ返事になり、メールは送られない', function () {
    Notification::fake();
    $user = User::factory()->create();

    $known = $this->postJson('/forgot-password', ['email' => $user->email])->assertOk()->json();
    $unknown = $this->postJson('/forgot-password', ['email' => 'nobody@example.com'])->assertOk()->json();

    expect($unknown)->toBe($known);
    Notification::assertSentTo($user, ResetPassword::class);
    Notification::assertCount(1);
});

test('短い間に同じアドレスで2回頼んでも同じ返事になり、メールは1通だけ', function () {
    Notification::fake();
    $user = User::factory()->create();

    $first = $this->postJson('/forgot-password', ['email' => $user->email])->assertOk()->json();
    $second = $this->postJson('/forgot-password', ['email' => $user->email])->assertOk()->json();

    expect($second)->toBe($first);
    Notification::assertSentToTimes($user, ResetPassword::class, 1);
});

test('メールアドレスの形がおかしいときは 422', function () {
    $this->postJson('/forgot-password', ['email' => 'not-an-email'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
});
