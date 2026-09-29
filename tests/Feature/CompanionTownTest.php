<?php

use App\Models\UserProfile;

/*
|--------------------------------------------------------------------------
| 町に出す・おうちで休む(docs/design/2026-09-29-rare-spru-design.md 3-5・4-5)
|--------------------------------------------------------------------------
*/

/** 町にいる仲間5人(相棒は lumi)と、おうちの silver */
function fullTown(UserProfile $profile): void
{
    foreach (['lumi', 'momo', 'kuru', 'piko', 'ruru'] as $key) {
        $profile->companions()->create(['companion_key' => $key]);
    }
    $profile->companions()->create(['companion_key' => 'silver', 'in_town' => false]);
    $profile->update(['partner_companion_key' => 'lumi']);
}

it('おうちで休ませると立ち位置がなくなり、町に出すとまた立つ', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/momo/town', ['in_town' => false])->assertOk()
        ->assertJsonPath('companions.1.key', 'momo')
        ->assertJsonPath('companions.1.in_town', false)
        ->assertJsonPath('companions.1.x', null);

    $this->postJson('/api/world/companions/silver/town', ['in_town' => true])->assertOk()
        ->assertJsonPath('companions.5.key', 'silver')
        ->assertJsonPath('companions.5.in_town', true)
        ->assertJsonPath('companions.5.x', 6);
});

it('町が5体でいっぱいなら、町に出せない', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/silver/town', ['in_town' => true])
        ->assertStatus(422)->assertJsonPath('message', '町はいっぱいだよ。だれかをおうちで休ませてね');
});

it('町にいる子をもう一度町に出しても断らない', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/momo/town', ['in_town' => true])->assertOk();
});

it('相棒は休ませられない', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/lumi/town', ['in_town' => false])
        ->assertStatus(422)->assertJsonPath('message', '相棒はいつも町にいるよ');
});

it('生まれていない子・ほかのプロフィールの子は見つからない', function () {
    $profile = createActiveProfile();
    $sister = createFamilyMember($profile);
    $sister->companions()->create(['companion_key' => 'piko', 'in_town' => false]);

    $this->postJson('/api/world/companions/piko/town', ['in_town' => true])->assertNotFound();
    expect($sister->companions()->first()->in_town)->toBeFalse();
});

it('in_town が無いと 422', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/momo/town', [])->assertStatus(422);
});

it('おうちの子は相棒にできない', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/partner', ['key' => 'silver'])
        ->assertStatus(422)->assertJsonPath('message', '町にいる仲間だけ相棒にできるよ');

    expect($profile->fresh()->partner_companion_key)->toBe('lumi');
});
