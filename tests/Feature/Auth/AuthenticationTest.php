<?php

use App\Models\User;

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertNoContent();
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertNoContent();
});

test('画面から(JSONで)ログインしてパスワードがまちがっていると、リダイレクトでなく 422 の JSON が返る', function () {
    $user = User::factory()->create();

    $this->postJson('/login', ['email' => $user->email, 'password' => 'wrong-password'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');

    $this->assertGuest();
});
