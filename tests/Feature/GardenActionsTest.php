<?php

use App\Models\Owner;
use App\Models\ShopItem;
use App\Support\Garden;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 種まき・水やり・生まれる(docs/design/2026-09-27-spru-wave-b-design.md 3-2〜3-5)
|--------------------------------------------------------------------------
*/

it('種ができていれば種をまけて、育ち具合が0に戻る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);

    $this->postJson('/api/world/garden/sow')
        ->assertOk()
        ->assertJsonPath('spru.growth', 0)
        ->assertJsonPath('garden.state', 'seed')
        ->assertJsonPath('garden.can_sow', false);

    expect($profile->fresh()->bloom_base_level)->toBe(4)
        ->and($profile->seeds()->whereNull('bloomed_at')->count())->toBe(1);
});

it('種ができていないと、種をまけない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3, 'bloom_base_level' => 1]);

    $this->postJson('/api/world/garden/sow')
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ種ができていないよ');

    expect($profile->seeds()->count())->toBe(0);
});

it('畑に種が育っていると、次の種はまけない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);
    $profile->seeds()->create(['result_key' => 'momo']);

    $this->postJson('/api/world/garden/sow')
        ->assertStatus(422)
        ->assertJsonPath('message', '畑に芽が育っているよ');
});

it('仲間が全員生まれていれば、種からはスプルの花が咲く', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);
    foreach (['lumi', 'momo', 'kuru', 'piko', 'ruru'] as $key) {
        $profile->companions()->create(['companion_key' => $key]);
    }

    $this->postJson('/api/world/garden/sow')->assertOk();

    expect($profile->seeds()->first()->result_key)->toBe('spru_flower');
});

it('今日正解していれば水をあげられ、芽が育つ', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'momo']);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('garden.state', 'sprout')
        ->assertJsonPath('garden.watered_today', true)
        ->assertJsonPath('garden.can_water', false)
        ->assertJsonPath('born', null);
});

it('今日まだ正解していなければ、水をあげられない', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);

    $this->postJson('/api/world/garden/water')
        ->assertStatus(422)
        ->assertJsonPath('message', '今日1問正解したら、水をあげられるよ');
});

it('畑に種が無いと、水をあげられない', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);

    $this->postJson('/api/world/garden/water')
        ->assertStatus(422)
        ->assertJsonPath('message', '畑に種がないよ');
});

it('水やりは1日1回で、次の日に学べばまたあげられる', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC')); // 日本時間 12:00
    $profile->update(['last_correct_on' => Garden::today()]);

    $this->postJson('/api/world/garden/water')->assertOk();
    $this->postJson('/api/world/garden/water')
        ->assertStatus(422)
        ->assertJsonPath('message', '今日はもう水をあげたよ。また明日ね');

    $this->travelTo(Carbon::parse('2026-09-28 03:00:00', 'UTC'));
    $this->postJson('/api/world/garden/water')
        ->assertStatus(422)
        ->assertJsonPath('message', '今日1問正解したら、水をあげられるよ');

    $profile->update(['last_correct_on' => Garden::today()]);
    $this->postJson('/api/world/garden/water')->assertOk()->assertJsonPath('garden.state', 'sprout_big');
});

it('3回目の水やりで仲間が生まれ、道に並ぶ', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => 2, 'last_watered_on' => '2026-01-01']);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('born', [
            'kind' => 'companion', 'key' => 'momo', 'name' => 'Momo', 'official_name' => 'Momo', 'nickname' => null,
            'trait' => '花・やさしさ', 'lines' => ['お花、きれいだね'], 'hearts' => 1, 'heart_label' => 'はじめまして',
            'bond' => 0, 'next_heart_bond' => 20, 'is_partner' => true, 'rare' => false, 'in_town' => true, 'x' => 0, 'y' => 3,
        ])
        ->assertJsonPath('garden.state', 'empty');

    $this->getJson('/api/world')->assertJsonPath('companions.0.key', 'momo');
});

it('スプルの花はバッグに入り、ショップには出ず、買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today(), 'points' => 100]);
    $profile->seeds()->create(['result_key' => 'spru_flower', 'waterings' => 2]);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('born.kind', 'item')
        ->assertJsonPath('born.world_item.asset_key', 'spru_flower')
        ->assertJsonPath('born.world_item.x', null);

    $this->getJson('/api/world')->assertJsonPath('bag.0.name', 'スプルの花');
    expect(collect($this->getJson('/api/shop')->json())->pluck('name'))->not->toContain('スプルの花');

    $flower = ShopItem::query()->where('name', 'スプルの花')->firstOrFail();
    $this->postJson("/api/shop/{$flower->id}/purchase")->assertStatus(422);
    expect($profile->fresh()->points)->toBe(100);
});

it('Ownerはスプルの花を編集できない', function () {
    $flower = Garden::flowerShopItem();
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->patchJson("/api/owner/shop-items/{$flower->id}", [
        'name' => '名前を変える',
        'price' => 10,
        'type' => 'decoration',
        'meta' => ['asset_key' => 'bench'],
    ])->assertStatus(422);

    expect($flower->fresh()->name)->toBe('スプルの花');
});

it('ふつうの種をまくと、いつも「スプルの花」の種になり、仲間は選ばれない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);

    $this->postJson('/api/world/garden/sow')->assertOk();

    expect($profile->seeds()->first()->result_key)->toBe('spru_flower');
});

it('ふつうの種を3回水やりすると、「スプルの花」がバッグに入る(仲間は生まれない)', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);
    $this->postJson('/api/world/garden/sow')->assertOk();

    foreach ([0, 1, 2] as $day) {
        Carbon::setTestNow(Carbon::parse('2026-10-08 10:00', 'Asia/Tokyo')->addDays($day));
        $profile->update(['last_correct_on' => Garden::today()]);
        $response = $this->postJson('/api/world/garden/water')->assertOk();
    }

    $response->assertJsonPath('born.kind', 'item');
    expect($profile->companions()->count())->toBe(0)
        ->and($profile->worldItems()->count())->toBe(1);
});
