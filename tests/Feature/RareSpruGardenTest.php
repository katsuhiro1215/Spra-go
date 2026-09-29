<?php

use App\Support\Garden;

/*
|--------------------------------------------------------------------------
| 特別な種をまく・育てる・町に立つ数(docs/design/2026-09-29-rare-spru-design.md 3-2〜3-5・4-4)
|--------------------------------------------------------------------------
*/

it('町を開くと満たした色の種を渡し、お祝いは1回目だけ', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 10, 'bloom_base_level' => 10]);

    $this->getJson('/api/world')->assertOk()
        ->assertJsonPath('new_seeds', [['key' => 'silver', 'name' => 'シルバースプル', 'reason' => 'レベル10になったね']])
        ->assertJsonPath('garden.seed_bag', [['key' => 'silver', 'name' => 'シルバースプル']])
        ->assertJsonPath('garden.spru_seed_ready', false)
        ->assertJsonPath('garden.can_sow', true)
        ->assertJsonPath('garden.look', null);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('new_seeds', []);
    expect($profile->specialSeeds()->count())->toBe(1);
});

it('家族の町を見ても、その人の種は渡らない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $sister->update(['level' => 10]);

    $this->getJson("/api/family/{$sister->id}")->assertOk();

    expect($sister->specialSeeds()->count())->toBe(0);
});

it('特別な種をまくと、その色で育ち、育ち具合は戻らない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 7, 'bloom_base_level' => 4]);
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now()]);

    $this->postJson('/api/world/garden/sow', ['seed' => 'silver'])->assertOk()
        ->assertJsonPath('spru.growth', 3)
        ->assertJsonPath('garden.state', 'seed')
        ->assertJsonPath('garden.look', 'silver')
        ->assertJsonPath('garden.seed_bag', [])
        ->assertJsonPath('garden.spru_seed_ready', true)
        ->assertJsonPath('garden.can_sow', false);

    expect($profile->fresh()->bloom_base_level)->toBe(4)
        ->and($profile->specialSeeds()->first()->planted_at)->not->toBeNull()
        ->and($profile->seeds()->first()->result_key)->toBe('silver');
});

it('ふくろにない色・もうまいた色はまけない', function () {
    $profile = createActiveProfile();
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now(), 'planted_at' => now()]);

    $this->postJson('/api/world/garden/sow', ['seed' => 'ruby'])
        ->assertStatus(422)->assertJsonPath('message', 'その種は持っていないよ');
    $this->postJson('/api/world/garden/sow', ['seed' => 'silver'])
        ->assertStatus(422)->assertJsonPath('message', 'その種は持っていないよ');

    expect($profile->seeds()->count())->toBe(0);
});

it('知らないキー・仲間のキー・花のキーは 422', function (string $seed) {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);

    $this->postJson('/api/world/garden/sow', ['seed' => $seed])
        ->assertStatus(422)->assertJsonPath('message', 'その種は持っていないよ');

    expect($profile->seeds()->count())->toBe(0);
})->with(['riri', 'lumi', 'spru_flower', 'unknown']);

it('ふくろに種があっても、スプルの種ができていなければスプルの種はまけない', function () {
    $profile = createActiveProfile();
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now()]);

    $this->postJson('/api/world/garden/sow')
        ->assertStatus(422)->assertJsonPath('message', 'まだ種ができていないよ');
    $this->postJson('/api/world/garden/sow', ['seed' => 'spru'])
        ->assertStatus(422)->assertJsonPath('message', 'まだ種ができていないよ');
});

it('畑に種が育っていると、特別な種もまけない', function () {
    $profile = createActiveProfile();
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now()]);
    $profile->seeds()->create(['result_key' => 'momo']);

    $this->postJson('/api/world/garden/sow', ['seed' => 'silver'])
        ->assertStatus(422)->assertJsonPath('message', '畑に芽が育っているよ');

    expect($profile->specialSeeds()->first()->planted_at)->toBeNull();
});

it('スプルの種の見た目は、生まれる子にかかわらず spru', function (string $result) {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => $result]);

    $response = $this->getJson('/api/world')->assertOk()->assertJsonPath('garden.look', 'spru');

    expect($response->getContent())->not->toContain('"'.$result.'"');
})->with(['momo', 'spru_flower']);

it('特別な種に3回水をあげると、そのレアスプルが生まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'silver', 'waterings' => 2, 'last_watered_on' => '2026-01-01']);

    $this->postJson('/api/world/garden/water')->assertOk()
        ->assertJsonPath('born.kind', 'companion')
        ->assertJsonPath('born.key', 'silver')
        ->assertJsonPath('born.name', 'シルバースプル')
        ->assertJsonPath('born.trait', '銀・こつこつ')
        ->assertJsonPath('born.lines', ['レベル10、おめでとう！ピカピカだね'])
        ->assertJsonPath('born.rare', true)
        ->assertJsonPath('born.in_town', true)
        ->assertJsonPath('born.is_partner', true)
        ->assertJsonPath('born.x', 0);
});

it('スプルの種からレアスプルは生まれない', function () {
    $profile = createActiveProfile();

    foreach (range(1, 40) as $i) {
        expect(Garden::pickResult($profile))->toBeIn(['lumi', 'momo', 'kuru', 'piko', 'ruru']);
    }
});

it('町が5体でいっぱいなら、生まれた子はおうちで休み、立ち位置はない', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    foreach (['lumi', 'momo', 'kuru', 'piko', 'ruru'] as $key) {
        $profile->companions()->create(['companion_key' => $key]);
    }
    $profile->update(['partner_companion_key' => 'lumi']);
    $profile->seeds()->create(['result_key' => 'silver', 'waterings' => 2, 'last_watered_on' => '2026-01-01']);

    $this->postJson('/api/world/garden/water')->assertOk()
        ->assertJsonPath('born.key', 'silver')
        ->assertJsonPath('born.in_town', false)
        ->assertJsonPath('born.is_partner', false)
        ->assertJsonPath('born.x', null)
        ->assertJsonPath('born.y', null);
});

it('立ち位置は町にいる子だけに、相棒を先頭にして前から付ける', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'lumi', 'in_town' => false]);
    $profile->companions()->create(['companion_key' => 'momo']);
    $profile->companions()->create(['companion_key' => 'kuru']);
    $profile->update(['partner_companion_key' => 'kuru']);

    $this->getJson('/api/world')->assertOk()
        ->assertJsonPath('companions.0.key', 'kuru')
        ->assertJsonPath('companions.0.x', 0)
        ->assertJsonPath('companions.0.y', 3)
        ->assertJsonPath('companions.1.key', 'lumi')
        ->assertJsonPath('companions.1.in_town', false)
        ->assertJsonPath('companions.1.x', null)
        ->assertJsonPath('companions.2.key', 'momo')
        ->assertJsonPath('companions.2.x', 3)
        ->assertJsonPath('companions.2.y', 2);
});

it('家族の町では、おうちの子に立ち位置がなく、畑の見た目が出る', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $sister->companions()->create(['companion_key' => 'lumi']);
    $sister->companions()->create(['companion_key' => 'momo', 'in_town' => false]);
    $sister->update(['partner_companion_key' => 'lumi']);
    $sister->seeds()->create(['result_key' => 'gold']);

    $this->getJson("/api/family/{$sister->id}")->assertOk()
        ->assertJsonPath('garden.look', 'gold')
        ->assertJsonPath('companions.1.key', 'momo')
        ->assertJsonPath('companions.1.x', null);
});
