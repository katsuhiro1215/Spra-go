<?php

use App\Models\ShopItem;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| タネ交換所: ラン限定の町のかざり・きせかえ
| (docs/design/2026-10-22-spru-run-design.md 14-6、2026-10-17-spru-costumes-design.md)
|--------------------------------------------------------------------------
|
| ランのタネだけで買う。コイン・ポイント・経験値は動かない。きせかえは季節の間だけ並び、買った物はずっと持てる。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/9。ハロウィンの季節
});

function runDecoration(int $price = 300, string $key = 'run_seed_bed'): ShopItem
{
    return createDecoration(['name' => "ラン限定{$key}", 'price' => $price, 'currency' => 'run_seed', 'meta' => ['asset_key' => $key]]);
}

it('一覧: 財布・ラン限定のかざり・いま並ぶきせかえ(季節の外は並ばない)を返す', function () {
    $profile = createActiveProfile();
    $profile->update(['run_seeds' => 2500]);
    runDecoration(300);
    createDecoration(['name' => '普通のベンチ', 'currency' => 'point']);

    $this->getJson('/api/run-seed-shop')
        ->assertOk()
        ->assertJsonPath('seeds', 2500)
        ->assertJsonCount(1, 'items')
        ->assertJsonPath('items.0.price', 300)
        ->assertJsonPath('items.0.asset_key', 'run_seed_bed')
        ->assertJsonPath('items.0.affordable', true)
        ->assertJsonPath('costume_key', null);

    $costumes = collect($this->getJson('/api/run-seed-shop')->json('costumes'));
    expect($costumes->pluck('key')->all())->toContain('halloween-ghost')->not->toContain('christmas-santa');
    expect($costumes->firstWhere('key', 'halloween-ghost'))->toMatchArray(['price' => 2000, 'owned' => false, 'affordable' => true]);
    expect($costumes->firstWhere('key', 'halloween-dress'))->toMatchArray(['price' => 5000, 'affordable' => false]);
});

it('ラン限定のかざりは、ふつうのショップ(/shop)には出ない', function () {
    createActiveProfile();
    runDecoration();

    $this->getJson('/api/shop')->assertOk()->assertJsonCount(0);
});

it('かざりを買うと、タネが減り、バッグに入る。コイン・ポイント・経験値は動かない', function () {
    $profile = createActiveProfile();
    $profile->update(['run_seeds' => 500, 'coins' => 10, 'points' => 20, 'xp' => 30]);
    $item = runDecoration(300);

    $this->postJson("/api/run-seed-shop/items/{$item->id}/buy")
        ->assertOk()
        ->assertJsonPath('seeds', 200)
        ->assertJsonPath('world_item.asset_key', 'run_seed_bed');

    $fresh = $profile->fresh();
    expect($fresh->run_seeds)->toBe(200)->and($fresh->only(['coins', 'points', 'xp']))->toBe(['coins' => 10, 'points' => 20, 'xp' => 30]);
    expect($profile->worldItems()->count())->toBe(1);
    expect($profile->currencyLedger()->where('type', 'run_seed')->where('reason', 'run_seed_shop')->value('delta'))->toBe(-300);
});

it('タネが足りないと、かざりは買えず、タネは減らない', function () {
    $profile = createActiveProfile();
    $profile->update(['run_seeds' => 299]);
    $item = runDecoration(300);

    $this->postJson("/api/run-seed-shop/items/{$item->id}/buy")->assertStatus(422);

    expect($profile->fresh()->run_seeds)->toBe(299)->and($profile->worldItems()->count())->toBe(0);
});

it('タネで買えないかざり(ポイント払い)は、この道では買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['run_seeds' => 9999]);
    $item = createDecoration(['currency' => 'point']);

    $this->postJson("/api/run-seed-shop/items/{$item->id}/buy")->assertStatus(422);
});

it('きせかえを買うと、タネが減って持てる。もう一度は買えない(タネは減らない)', function () {
    $profile = createActiveProfile();
    $profile->update(['run_seeds' => 2500]);

    $this->postJson('/api/run-seed-shop/costumes/halloween-ghost/buy')->assertOk()->assertJsonPath('seeds', 500);
    $this->postJson('/api/run-seed-shop/costumes/halloween-ghost/buy')->assertStatus(422);

    expect($profile->fresh()->run_seeds)->toBe(500);
    expect($profile->costumes()->pluck('costume_key')->all())->toBe(['halloween-ghost']);
});

it('きせかえは、タネが足りない・季節の外・ない衣装のときは買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['run_seeds' => 1999]);

    $this->postJson('/api/run-seed-shop/costumes/halloween-ghost/buy')->assertStatus(422);

    $profile->update(['run_seeds' => 9999]);
    $this->postJson('/api/run-seed-shop/costumes/christmas-santa/buy')->assertStatus(422); // 10月はクリスマスの季節ではない
    $this->postJson('/api/run-seed-shop/costumes/no-such/buy')->assertNotFound();
    expect($profile->fresh()->run_seeds)->toBe(9999)->and($profile->costumes()->count())->toBe(0);
});

it('買ったきせかえは、季節の外でも着られる。ふつうに戻せる。持っていない衣装は着られない', function () {
    $profile = createActiveProfile();
    $profile->update(['run_seeds' => 2500]);
    $this->postJson('/api/run-seed-shop/costumes/halloween-ghost/buy')->assertOk();

    $this->travelTo(Carbon::parse('2026-12-10 03:00:00', 'UTC')); // ハロウィンの季節の外
    $this->putJson('/api/run-seed-shop/costume', ['key' => 'halloween-ghost'])->assertOk()->assertJsonPath('costume_key', 'halloween-ghost');
    expect($profile->fresh()->costume_key)->toBe('halloween-ghost');

    $costumes = collect($this->getJson('/api/run-seed-shop')->assertJsonPath('costume_key', 'halloween-ghost')->json('costumes'));
    expect($costumes->firstWhere('key', 'halloween-ghost'))->toMatchArray(['owned' => true, 'equipped' => true]);

    $this->putJson('/api/run-seed-shop/costume', ['key' => 'christmas-santa'])->assertStatus(422);
    $this->putJson('/api/run-seed-shop/costume', ['key' => null])->assertOk()->assertJsonPath('costume_key', null);
    expect($profile->fresh()->costume_key)->toBeNull();
});

it('スプルランの入口の情報に、いま着ている衣装が入る', function () {
    $profile = createActiveProfile();
    config(['games.spru_run.catalog' => ['released_on' => '2026-10-01', 'ends_on' => null, 'season' => null]]);
    $profile->update(['run_seeds' => 2500]);
    $this->postJson('/api/run-seed-shop/costumes/halloween-ghost/buy')->assertOk();
    $this->putJson('/api/run-seed-shop/costume', ['key' => 'halloween-ghost'])->assertOk();

    $this->getJson('/api/games/spru-run')->assertOk()->assertJsonPath('costume_key', 'halloween-ghost');
});
