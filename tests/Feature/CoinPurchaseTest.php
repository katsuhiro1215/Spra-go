<?php

use App\Models\CoinPurchase;
use App\Models\User;
use App\Support\AppSettings;

beforeEach(fn () => AppSettings::update(['coin_purchase_enabled' => true]));

/*
|--------------------------------------------------------------------------
| コイン購入(Stripe)のテスト
|--------------------------------------------------------------------------
|
| 実際のStripe APIへは通信しない。
| - コイン付与ロジック(CoinPurchase::completeFromStripeSession)は
|   Webhookの署名検証を経た後の「処理」部分を直接テストする。
| - checkout開始エンドポイントはバリデーションのみ確認する
|   (不正なpackage_key・未選択プロフィールは、Stripe APIへ到達する前に
|   422で弾かれる)。
|
*/

it('存在しないpackage_keyのチェックアウトは422になる', function () {
    createActiveProfile();

    $this->postJson('/api/coin-purchases/checkout', [
        'package_key' => 'does-not-exist',
    ])->assertStatus(422);
});

it('アクティブなプロフィールが無いとチェックアウトは422になる', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->withHeader('Referer', 'http://localhost');

    $this->postJson('/api/coin-purchases/checkout', [
        'package_key' => 'small',
    ])->assertStatus(422);
});

it('コインパッケージ一覧を取得できる', function () {
    createActiveProfile();

    $response = $this->getJson('/api/coin-packages');

    $response->assertOk()->assertJsonPath('enabled', true);
    expect($response->json('packages'))->toHaveCount(3);
    expect(collect($response->json('packages'))->pluck('key')->all())
        ->toBe(['small', 'medium', 'large']);
});

it('コイン購入がOFFのとき、一覧は空で、チェックアウトは403', function () {
    AppSettings::update(['coin_purchase_enabled' => false]);
    createActiveProfile();

    $this->getJson('/api/coin-packages')->assertOk()
        ->assertExactJson(['enabled' => false, 'packages' => []]);

    $this->postJson('/api/coin-purchases/checkout', ['package_key' => 'small'])
        ->assertStatus(403)->assertJsonPath('message', 'コインの購入は、まだ始まっていません。');
});

it('Stripeセッション完了でコインが付与される', function () {
    $profile = createActiveProfile();
    $purchase = CoinPurchase::create([
        'user_profile_id' => $profile->id,
        'package_key' => 'small',
        'coins' => 100,
        'amount' => 120,
        'currency' => 'jpy',
        'stripe_checkout_session_id' => 'cs_test_123',
        'status' => 'pending',
    ]);

    $completed = CoinPurchase::completeFromStripeSession('cs_test_123');

    expect($completed)->toBeTrue();
    expect($purchase->fresh()->status)->toBe('completed');
    expect($profile->fresh()->coins)->toBe(100);
});

it('同じセッションIDで2回完了させてもコインは二重付与されない', function () {
    $profile = createActiveProfile();
    CoinPurchase::create([
        'user_profile_id' => $profile->id,
        'package_key' => 'small',
        'coins' => 100,
        'amount' => 120,
        'currency' => 'jpy',
        'stripe_checkout_session_id' => 'cs_test_456',
        'status' => 'pending',
    ]);

    CoinPurchase::completeFromStripeSession('cs_test_456');
    $secondAttempt = CoinPurchase::completeFromStripeSession('cs_test_456');

    expect($secondAttempt)->toBeFalse();
    expect($profile->fresh()->coins)->toBe(100);
});

it('存在しないセッションIDでは何も起きない', function () {
    $completed = CoinPurchase::completeFromStripeSession('cs_test_unknown');

    expect($completed)->toBeFalse();
});

it('署名ヘッダーが無いWebhookリクエストは400になる', function () {
    $this->postJson('/api/stripe/webhook', [], [
        'Stripe-Signature' => 'invalid',
    ])->assertStatus(400);
});

it('メールアドレスを確かめていないアカウントはコインを買えない(403・email_unverified)', function () {
    createActiveProfile();
    auth()->user()->forceFill(['email_verified_at' => null])->save();

    $this->postJson('/api/coin-purchases/checkout', ['package_key' => 'small'])
        ->assertForbidden()
        ->assertJson([
            'message' => 'メールアドレスを確かめると、コインを買えるようになります。',
            'code' => 'email_unverified',
        ]);

    expect(CoinPurchase::count())->toBe(0);
});
