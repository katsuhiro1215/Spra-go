<?php

use App\Models\Owner;
use App\Models\ShopItem;

it('ショップ一覧に町のアイテムが通貨・必要レベル・絵の指定・ロック状態つきで返る', function () {
    createActiveProfile();
    createDecoration(['name' => 'ベンチ', 'min_level' => 1]);
    createDecoration(['name' => '屋台', 'min_level' => 5, 'meta' => ['asset_key' => 'stall']]);

    $response = $this->getJson('/api/shop')->assertOk();

    $decorations = collect($response->json())->where('type', 'decoration')->keyBy('name');
    expect($decorations['ベンチ'])->toMatchArray([
        'currency' => 'point',
        'min_level' => 1,
        'asset_key' => 'bench',
        'locked' => false,
    ]);
    expect($decorations['屋台']['locked'])->toBeTrue();
});

it('学習ポイントで町のアイテムを買うとポイントが減り、バッグに入る', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 100]);
    $item = createDecoration(['price' => 30]);

    $response = $this->postJson("/api/shop/{$item->id}/purchase")->assertOk();

    $response->assertJsonPath('profile.points', 70)
        ->assertJsonPath('world_item.shop_item_id', $item->id)
        ->assertJsonPath('world_item.asset_key', 'bench')
        ->assertJsonPath('world_item.x', null)
        ->assertJsonPath('world_item.y', null);
    expect($profile->fresh()->points)->toBe(70);
    expect($profile->fresh()->coins)->toBe(0);
    $this->assertDatabaseHas('profile_world_items', [
        'user_profile_id' => $profile->id,
        'shop_item_id' => $item->id,
        'x' => null,
        'y' => null,
    ]);
    $this->assertDatabaseHas('user_profile_items', [
        'user_profile_id' => $profile->id,
        'shop_item_id' => $item->id,
    ]);
});

it('必要レベルに届いていないと買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 500]);
    $item = createDecoration(['min_level' => 5]);

    $this->postJson("/api/shop/{$item->id}/purchase")
        ->assertStatus(422)
        ->assertJsonPath('message', 'レベルが足りません。');

    expect($profile->fresh()->points)->toBe(500);
    $this->assertDatabaseCount('profile_world_items', 0);
});

it('学習ポイントが足りないと買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 10]);
    $item = createDecoration(['price' => 30]);

    $this->postJson("/api/shop/{$item->id}/purchase")
        ->assertStatus(422)
        ->assertJsonPath('message', 'ポイントが足りません。');

    $this->assertDatabaseCount('profile_world_items', 0);
});

it('残高がちょうど1回分のとき、2回目の購入は失敗し残高はマイナスにならない', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 30]);
    $item = createDecoration(['price' => 30]);

    $this->postJson("/api/shop/{$item->id}/purchase")->assertOk();
    $this->postJson("/api/shop/{$item->id}/purchase")->assertStatus(422);

    expect($profile->fresh()->points)->toBe(0);
    $this->assertDatabaseCount('profile_world_items', 1);
});

it('コインを持っていても町のアイテムはコインでは買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['coins' => 1000, 'points' => 0]);
    $item = createDecoration(['price' => 30]);

    $this->postJson("/api/shop/{$item->id}/purchase")->assertStatus(422);

    expect($profile->fresh()->coins)->toBe(1000);
});

it('Ownerは町のアイテムを登録でき、通貨は自動で学習ポイントになる', function () {
    $owner = Owner::factory()->create();

    $response = $this->actingAs($owner, 'owner')->postJson('/api/owner/shop-items', [
        'name' => '花だん',
        'price' => 20,
        'type' => 'decoration',
        'min_level' => 2,
        'meta' => ['asset_key' => 'flowerbed'],
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('shop_items', [
        'name' => '花だん',
        'type' => 'decoration',
        'currency' => 'point',
        'min_level' => 2,
    ]);
});

it('Ownerが町のアイテムを登録するとき、用意されていない絵の指定はエラーになる', function () {
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->postJson('/api/owner/shop-items', [
        'name' => '謎の建物',
        'price' => 20,
        'type' => 'decoration',
        'meta' => ['asset_key' => 'unknown_building'],
    ])->assertStatus(422);
});

it('プレイヤーが持っている町のアイテムは、Ownerでも削除できない', function () {
    $owner = Owner::factory()->create();
    $profile = createActiveProfile();
    $item = createDecoration();
    $profile->worldItems()->create(['shop_item_id' => $item->id]);

    $this->actingAs($owner, 'owner')
        ->deleteJson("/api/owner/shop-items/{$item->id}")
        ->assertStatus(422);

    expect(ShopItem::find($item->id))->not->toBeNull();
});
