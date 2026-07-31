<?php

use App\Models\CoinPurchase;
use App\Models\Owner;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| Ownerダッシュボードのサマリー(KPIカード)のテスト
|--------------------------------------------------------------------------
|
| docs/design/ui-ux-proposal.mdの提案(登録ユーザー数・直近7日のクリア数等)
| をOwnerダッシュボードのトップに表示する機能。
|
*/

it('Owner以外はアクセスできない', function () {
    $this->getJson('/api/owner/dashboard/summary')->assertStatus(401);
});

it('Ownerはサマリーを取得できる', function () {
    $owner = Owner::factory()->create();
    User::factory()->count(3)->create();

    $profile = createActiveProfile();
    $category = \App\Models\Category::create(['name' => 'サマリーテスト']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 1,
    ]);
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $stage->id,
        'cleared_at' => now(),
    ]);

    CoinPurchase::create([
        'user_profile_id' => $profile->id,
        'package_key' => 'small',
        'coins' => 100,
        'amount' => 120,
        'currency' => 'jpy',
        'stripe_checkout_session_id' => 'cs_test_summary',
        'status' => 'completed',
        'completed_at' => now(),
    ]);

    $response = $this->actingAs($owner, 'owner')
        ->getJson('/api/owner/dashboard/summary');

    $response->assertOk();
    expect($response->json('user_count'))->toBeGreaterThanOrEqual(4); // createActiveProfile()の分+3
    expect($response->json('stage_clears_last_7_days'))->toBe(1);
    expect($response->json('coin_purchases.completed_count'))->toBe(1);
    expect($response->json('coin_purchases.completed_amount_this_month'))->toBe(120);
});

it('7日より前のクリアはカウントされない', function () {
    $owner = Owner::factory()->create();
    $profile = createActiveProfile();
    $category = \App\Models\Category::create(['name' => 'サマリーテスト2']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 1,
    ]);
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $stage->id,
        'cleared_at' => now()->subDays(10),
    ]);

    $response = $this->actingAs($owner, 'owner')
        ->getJson('/api/owner/dashboard/summary');

    $response->assertOk();
    expect($response->json('stage_clears_last_7_days'))->toBe(0);
});
