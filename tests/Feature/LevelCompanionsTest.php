<?php

use App\Support\LevelCompanions;

/*
|--------------------------------------------------------------------------
| レベルで会える通常キャラ(docs/design/2026-10-08-town-growth-design.md 4-2)
|--------------------------------------------------------------------------
*/

it('並びの何番目がどのレベルか(3・8・13・18・23)', function () {
    expect(array_map(fn (int $i) => LevelCompanions::levelFor($i), [0, 1, 2, 3, 4]))->toBe([3, 8, 13, 18, 23]);
});

it('届いたキャラは今のレベルまでの分だけ', function (int $level, array $expected) {
    $profile = createActiveProfile();
    $profile->update(['level' => $level]);

    expect(LevelCompanions::due($profile->fresh()))->toBe($expected);
})->with([
    'Lv2' => [2, []],
    'Lv3' => [3, ['lumi']],
    'Lv7' => [7, ['lumi']],
    'Lv8' => [8, ['lumi', 'momo']],
    'Lv23' => [23, ['lumi', 'momo', 'kuru', 'piko', 'ruru']],
    'Lv60' => [60, ['lumi', 'momo', 'kuru', 'piko', 'ruru']],
]);

it('町を開くと、届いたキャラが仲間に入り、最初の1人は相棒になる', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3]);

    $this->getJson('/api/world')
        ->assertOk()
        ->assertJsonPath('new_companions.0.key', 'lumi')
        ->assertJsonPath('companions.0.key', 'lumi');

    expect($profile->fresh()->partner_companion_key)->toBe('lumi')
        ->and($profile->companions()->count())->toBe(1);
});

it('もう一度開いても、同じキャラは増えず、new_companions は空', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3]);
    $this->getJson('/api/world')->assertOk();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('new_companions', []);

    expect($profile->companions()->count())->toBe(1);
});

it('レベルが一度に何段も上がったら、届いた分がまとめて入る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 14]);

    $response = $this->getJson('/api/world')->assertOk();

    expect(collect($response->json('new_companions'))->pluck('key')->all())->toBe(['lumi', 'momo', 'kuru']);
});

it('畑で生まれた仲間をすでに持っていても、二重には入らない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 8]);
    $profile->companions()->create(['companion_key' => 'lumi', 'in_town' => true]);

    $response = $this->getJson('/api/world')->assertOk();

    expect(collect($response->json('new_companions'))->pluck('key')->all())->toBe(['momo'])
        ->and($profile->companions()->where('companion_key', 'lumi')->count())->toBe(1);
});

it('町が仲間でいっぱいなら、レベルで入った仲間はおうちで休む', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 23]);
    config(['companions.town_limit' => 2]);

    $this->getJson('/api/world')->assertOk();

    expect($profile->companions()->where('in_town', true)->count())->toBe(2)
        ->and($profile->companions()->where('in_town', false)->count())->toBe(3);
});
