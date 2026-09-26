<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Models\User;

it('町の情報に土地・置いてあるアイテム・バッグ・プロフィールが含まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 40]);
    $item = createDecoration();
    $profile->worldItems()->create(['shop_item_id' => $item->id, 'x' => 5, 'y' => 5]);
    $profile->worldItems()->create(['shop_item_id' => $item->id]);

    $response = $this->getJson('/api/world')->assertOk();

    $response->assertJsonPath('land.size', 7)
        ->assertJsonPath('land.spru', ['x' => 1, 'y' => 3])
        ->assertJsonCount(1, 'items')
        ->assertJsonPath('items.0.x', 5)
        ->assertJsonPath('items.0.asset_key', 'bench')
        ->assertJsonCount(1, 'bag')
        ->assertJsonPath('bag.0.x', null)
        ->assertJsonPath('profile.points', 40);
    expect($response->json('land.blocked'))->toContain([1, 1])->toContain([3, 2]);
});

it('プロフィールを選んでいないと町の情報は取れない', function () {
    $user = User::factory()->create();
    $user->schema()->create(['name' => 'テスト家族']);

    $this->actingAs($user)
        ->withHeader('Referer', 'http://localhost')
        ->getJson('/api/world')
        ->assertStatus(422);
});

it('最初の100ptは1回だけ受け取れる', function () {
    $profile = createActiveProfile();

    $this->getJson('/api/world')->assertJsonPath('welcome_available', true);

    $this->postJson('/api/world/welcome')
        ->assertOk()
        ->assertJson(['granted' => true, 'points' => 100]);
    $this->postJson('/api/world/welcome')
        ->assertOk()
        ->assertJson(['granted' => false, 'points' => 100]);

    $this->getJson('/api/world')->assertJsonPath('welcome_available', false);
    expect($profile->fresh()->points)->toBe(100);
    $this->assertDatabaseHas('profile_currency_ledger', [
        'user_profile_id' => $profile->id,
        'type' => 'point',
        'delta' => 100,
        'reason' => 'world_welcome',
    ]);
});

function createStageSeries(): array
{
    $category = Category::create(['name' => 'つづきテスト']);

    return collect([1, 2])->map(fn (int $n) => Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => $n,
        'question_count' => 1,
    ]))->all();
}

it('遊んだ記録が無ければ「つづきから」の行き先は無い', function () {
    createActiveProfile();

    $this->getJson('/api/world')->assertJsonPath('continue_stage_id', null);
});

it('最後に遊んだステージが未クリアなら、そのステージが行き先になる', function () {
    $profile = createActiveProfile();
    [$first] = createStageSeries();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $first->id, 'attempts' => 1]);

    $this->getJson('/api/world')->assertJsonPath('continue_stage_id', $first->id);
});

it('最後に遊んだステージをクリア済みなら、次のステージが行き先になる', function () {
    $profile = createActiveProfile();
    [$first, $second] = createStageSeries();
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $first->id,
        'attempts' => 1,
        'cleared_at' => now(),
    ]);

    $this->getJson('/api/world')->assertJsonPath('continue_stage_id', $second->id);
});

it('最後のステージまでクリア済みなら「つづきから」の行き先は無い', function () {
    $profile = createActiveProfile();
    [, $second] = createStageSeries();
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $second->id,
        'attempts' => 1,
        'cleared_at' => now(),
    ]);

    $this->getJson('/api/world')->assertJsonPath('continue_stage_id', null);
});
