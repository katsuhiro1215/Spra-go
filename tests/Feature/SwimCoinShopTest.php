<?php

use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スイムコイン交換所: きせかえ
| (docs/design/2026-11-10-spru-swim-design.md、2026-10-17-spru-costumes-design.md 10章)
|--------------------------------------------------------------------------
|
| スイムコインだけで買う。ワードローブ(所有・着用)はタネ交換所と共有。window(2026-11-11〜2026-11-25)の間だけ並ぶ
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-11-15 03:00:00', 'UTC')); // 日本時間 11/15。スイムコイン交換所の期間の中
});

it('一覧: 財布・いま並ぶきせかえ(ランのタネの衣装は出ない)を返す', function () {
    $profile = createActiveProfile();
    $profile->update(['swim_coins' => 1300, 'run_seeds' => 9999]);

    $this->getJson('/api/swim-coin-shop')
        ->assertOk()
        ->assertJsonPath('coins', 1300)
        ->assertJsonPath('costume_key', null);

    $costumes = collect($this->getJson('/api/swim-coin-shop')->json('costumes'));
    expect($costumes->pluck('key')->all())->toContain('hero-knight')->not->toContain('halloween-ghost');
    expect($costumes->firstWhere('key', 'cool-sunglasses'))->toMatchArray(['price' => 1000, 'owned' => false, 'affordable' => true]);
    expect($costumes->firstWhere('key', 'hero-knight'))->toMatchArray(['price' => 1500, 'affordable' => false]);
});

it('タネ交換所の一覧には、スイムコインの衣装は出ない', function () {
    createActiveProfile();

    $costumes = collect($this->getJson('/api/run-seed-shop')->json('costumes'));
    expect($costumes->pluck('key')->all())->not->toContain('hero-knight');
});

it('きせかえを買うと、スイムコインが減って持てる。もう一度は買えない(減らない)', function () {
    $profile = createActiveProfile();
    $profile->update(['swim_coins' => 1300]);

    $this->postJson('/api/swim-coin-shop/costumes/cool-sunglasses/buy')->assertOk()->assertJsonPath('coins', 300);
    $this->postJson('/api/swim-coin-shop/costumes/cool-sunglasses/buy')->assertStatus(422);

    expect($profile->fresh()->swim_coins)->toBe(300);
    expect($profile->costumes()->pluck('costume_key')->all())->toBe(['cool-sunglasses']);
});

it('買うと、コイン・ポイント・経験値・ランのタネは動かない', function () {
    $profile = createActiveProfile();
    $profile->update(['swim_coins' => 1300, 'coins' => 10, 'points' => 20, 'xp' => 30, 'run_seeds' => 40]);

    $this->postJson('/api/swim-coin-shop/costumes/cool-sunglasses/buy')->assertOk();

    expect($profile->fresh()->only(['coins', 'points', 'xp', 'run_seeds']))->toBe(['coins' => 10, 'points' => 20, 'xp' => 30, 'run_seeds' => 40]);
    expect($profile->currencyLedger()->where('type', 'swim_coin')->where('reason', 'swim_coin_costume')->value('delta'))->toBe(-1000);
});

it('きせかえは、スイムコインが足りない・期間の外・ない衣装のときは買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['swim_coins' => 999]);

    $this->postJson('/api/swim-coin-shop/costumes/cool-sunglasses/buy')->assertStatus(422);

    $profile->update(['swim_coins' => 9999]);
    $this->travelTo(Carbon::parse('2026-12-01 03:00:00', 'UTC')); // 期間の外
    $this->postJson('/api/swim-coin-shop/costumes/cool-sunglasses/buy')->assertStatus(422);
    $this->postJson('/api/swim-coin-shop/costumes/no-such/buy')->assertNotFound();

    expect($profile->fresh()->swim_coins)->toBe(9999)->and($profile->costumes()->count())->toBe(0);
});

it('ランのタネの衣装は、スイムコイン交換所では買えない(404)', function () {
    $profile = createActiveProfile();
    $profile->update(['swim_coins' => 9999]);

    $this->postJson('/api/swim-coin-shop/costumes/halloween-ghost/buy')->assertNotFound();
    expect($profile->fresh()->swim_coins)->toBe(9999);
});

it('買ったきせかえは、期間の外でも着られる。着せ替えはタネ交換所と共有(アカウントに1着だけ)', function () {
    $profile = createActiveProfile();
    $profile->update(['swim_coins' => 1300]);
    $this->postJson('/api/swim-coin-shop/costumes/cool-sunglasses/buy')->assertOk();

    $this->travelTo(Carbon::parse('2026-12-10 03:00:00', 'UTC')); // 期間の外
    $this->putJson('/api/run-seed-shop/costume', ['key' => 'cool-sunglasses'])->assertOk()->assertJsonPath('costume_key', 'cool-sunglasses');
    expect($profile->fresh()->costume_key)->toBe('cool-sunglasses');

    $costumes = collect($this->getJson('/api/swim-coin-shop')->assertJsonPath('costume_key', 'cool-sunglasses')->json('costumes'));
    expect($costumes->firstWhere('key', 'cool-sunglasses'))->toMatchArray(['owned' => true, 'equipped' => true]);
});
