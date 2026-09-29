<?php

/*
|--------------------------------------------------------------------------
| なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 3-5・4-5・5-5)
|--------------------------------------------------------------------------
*/

it('仲間5人→レアスプル10色の順で、状態と条件を出す', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 10, 'bloom_base_level' => 10]);
    $profile->companions()->create(['companion_key' => 'lumi', 'nickname' => 'ピカ', 'bond' => 25]);
    $profile->update(['partner_companion_key' => 'lumi']);
    $profile->specialSeeds()->create(['rare_key' => 'ruby', 'granted_at' => now(), 'planted_at' => now()]);
    $profile->seeds()->create(['result_key' => 'ruby']);

    $response = $this->getJson('/api/world/roster')->assertOk()
        ->assertJsonPath('town_limit', 5)
        ->assertJsonPath('town_count', 1)
        ->assertJsonPath('new_seeds', [['key' => 'silver', 'name' => 'シルバースプル', 'reason' => 'レベル10になったね']]);

    expect(collect($response->json('members'))->pluck('key')->all())->toBe([
        'lumi', 'momo', 'kuru', 'piko', 'ruru',
        'ruby', 'sapphire', 'silver', 'amber', 'obsidian', 'crystal', 'pearl', 'emerald', 'gold', 'platinum',
    ]);
    $response
        ->assertJsonPath('members.0', ['key' => 'lumi', 'name' => 'ピカ', 'rare' => false, 'status' => 'born', 'in_town' => true, 'is_partner' => true, 'hearts' => 2, 'condition' => null])
        ->assertJsonPath('members.1', ['key' => 'momo', 'name' => '？？？', 'rare' => false, 'status' => 'waiting', 'in_town' => false, 'is_partner' => false, 'hearts' => 0, 'condition' => null])
        ->assertJsonPath('members.5.status', 'growing')
        ->assertJsonPath('members.6', [
            'key' => 'sapphire', 'name' => 'サファイアスプル', 'rare' => true, 'status' => 'waiting', 'in_town' => false, 'is_partner' => false, 'hearts' => 0,
            'condition' => ['text' => '外国に着く', 'current' => 0, 'target' => 1, 'unit' => 'か国'],
        ])
        ->assertJsonPath('members.7.status', 'in_bag')
        ->assertJsonPath('members.14.condition', ['text' => 'レベル30になる', 'current' => 10, 'target' => 30, 'unit' => 'レベル']);
});

it('仲間は畑で育っていても、一覧では生まれるまでなぞのまま', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);

    $response = $this->getJson('/api/world/roster')->assertOk()
        ->assertJsonPath('members.1.status', 'waiting')
        ->assertJsonPath('members.1.name', '？？？');

    expect($response->getContent())->not->toContain('Momo');
});

it('一度渡した種は、条件を満たさなくなっても残る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 5]);
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now()]);

    $this->getJson('/api/world/roster')->assertOk()
        ->assertJsonPath('members.7.status', 'in_bag')
        ->assertJsonPath('new_seeds', []);

    expect($profile->specialSeeds()->count())->toBe(1);
});
