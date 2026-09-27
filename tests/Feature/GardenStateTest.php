<?php

use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スプルの育ち具合と、畑・仲間の状態(docs/design/2026-09-27-spru-wave-b-design.md 3〜4章)
|--------------------------------------------------------------------------
*/

it('育ち具合はレベルアップの回数で決まり、3で止まる', function (int $level, int $growth) {
    $profile = createActiveProfile();
    $profile->update(['level' => $level, 'bloom_base_level' => 4]);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('spru.growth', $growth);
})->with([[4, 0], [5, 1], [6, 2], [7, 3], [9, 3]]);

it('新しいプロフィールは育ち具合0から始まる', function () {
    createActiveProfile();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('spru.growth', 0);
});

it('畑はスプルの家の前のマスにあり、アイテムを置けないマスになる', function () {
    createActiveProfile();

    $response = $this->getJson('/api/world')->assertOk();

    expect($response->json('land.blocked'))->toContain([1, 2]);
    $response->assertJsonPath('garden.x', 1)
        ->assertJsonPath('garden.y', 2)
        ->assertJsonPath('garden.state', 'empty');
});

it('種ができていて畑が空いていれば、種をまける状態になる', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);

    $this->getJson('/api/world')
        ->assertJsonPath('garden.can_sow', true)
        ->assertJsonPath('garden.can_water', false);
});

it('畑の見た目は水やりの回数で変わる', function (int $waterings, string $state) {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => $waterings]);

    $this->getJson('/api/world')
        ->assertJsonPath('garden.state', $state)
        ->assertJsonPath('garden.waterings', $waterings);
})->with([[0, 'seed'], [1, 'sprout'], [2, 'sprout_big']]);

it('誰が生まれるかは町の情報に出さない', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);

    $response = $this->getJson('/api/world')->assertOk();

    expect($response->getContent())->not->toContain('momo');
});

it('今日正解していて、今日まだ水をあげていなければ水をあげられる', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();

    $this->getJson('/api/world')
        ->assertJsonPath('garden.learned_today', true)
        ->assertJsonPath('garden.watered_today', false)
        ->assertJsonPath('garden.can_water', true);
});

it('不正解だけの日は水をあげられない', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])->assertOk();

    $this->getJson('/api/world')
        ->assertJsonPath('garden.learned_today', false)
        ->assertJsonPath('garden.can_water', false);
});

it('「今日」は日本時間の0時で切り替わる', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->travelTo(Carbon::parse('2026-09-27 14:59:00', 'UTC')); // 日本時間 23:59
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();
    $this->getJson('/api/world')->assertJsonPath('garden.learned_today', true);

    $this->travelTo(Carbon::parse('2026-09-27 15:00:00', 'UTC')); // 日本時間 翌日の0:00
    $this->getJson('/api/world')->assertJsonPath('garden.learned_today', false);
});

it('生まれた仲間は、生まれた順に道の立ち位置つきで出る', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'ruru']);
    $profile->companions()->create(['companion_key' => 'lumi']);

    $this->getJson('/api/world')
        ->assertJsonCount(2, 'companions')
        ->assertJsonPath('companions.0', [
            'key' => 'ruru', 'name' => 'Ruru', 'trait' => '水・知恵', 'line' => 'じっくり考えるのが好き', 'x' => 0, 'y' => 3,
        ])
        ->assertJsonPath('companions.1.key', 'lumi')
        ->assertJsonPath('companions.1.x', 2)
        ->assertJsonPath('companions.1.y', 3);
});

it('立ち位置が足りない仲間は、位置なしで出る', function () {
    config(['world.companion_spots' => [[0, 3]]]);
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'ruru']);
    $profile->companions()->create(['companion_key' => 'lumi']);

    $this->getJson('/api/world')
        ->assertJsonPath('companions.1.x', null)
        ->assertJsonPath('companions.1.y', null);
});

it('回答すると、育ち具合と畑に種があるかが返る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3, 'bloom_base_level' => 1]);
    $profile->seeds()->create(['result_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.spru_growth', 2)
        ->assertJsonPath('profile.garden_busy', true);
});

it('更新のとき、畑のマスに置いてあったアイテムはバッグに戻る', function () {
    $profile = createActiveProfile();
    $item = createDecoration();
    $onGarden = $profile->worldItems()->create(['shop_item_id' => $item->id, 'x' => 1, 'y' => 2]);
    $elsewhere = $profile->worldItems()->create(['shop_item_id' => $item->id, 'x' => 5, 'y' => 5]);

    (require database_path('migrations/2026_09_27_000005_move_world_items_off_garden_tile.php'))->up();

    expect($onGarden->fresh()->x)->toBeNull()
        ->and($onGarden->fresh()->y)->toBeNull()
        ->and($elsewhere->fresh()->x)->toBe(5);
});

it('更新のとき、今あるプロフィールは今のレベルから育ち始める', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 6, 'bloom_base_level' => 1]);

    (require database_path('migrations/2026_09_27_000002_start_bloom_from_current_level.php'))->up();

    expect($profile->fresh()->bloom_base_level)->toBe(6);
});
