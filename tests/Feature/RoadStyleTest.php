<?php

use App\Support\Travel;

/*
|--------------------------------------------------------------------------
| 国の道(docs/design/2026-10-05-road-style-design.md)
|--------------------------------------------------------------------------
|
| 旅で着いた国の道のデザインを、町の道に選べる。選べるのは日本(いつでも)と、着いた国だけ。
| 保存は user_profiles.road_style。町・旅・家族の町の返事に road_style が出る。
|
*/

it('既定は日本の道', function () {
    createActiveProfile();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('road_style', 'jp');
    $this->getJson('/api/travel')->assertOk()->assertJsonPath('road_style', 'jp');
});

it('着いた国の道を選べて、町と旅の返事に出る。日本の道に戻せる', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'id', 'arrived_at' => now()]);

    $this->putJson('/api/world/road', ['style' => 'id'])->assertOk()->assertExactJson(['road_style' => 'id']);
    $this->getJson('/api/world')->assertJsonPath('road_style', 'id');
    $this->getJson('/api/travel')->assertJsonPath('road_style', 'id');
    expect($profile->fresh()->road_style)->toBe('id');

    $this->putJson('/api/world/road', ['style' => 'jp'])->assertOk()->assertExactJson(['road_style' => 'jp']);
    $this->getJson('/api/world')->assertJsonPath('road_style', 'jp');
});

it('まだ着いていない国の道は、選べない', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'id', 'arrived_at' => now()]);

    $this->putJson('/api/world/road', ['style' => 'fr'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ着いていない国の道は、選べないよ');
    expect($profile->fresh()->road_style)->toBeNull();
});

it('一覧にない道・指定なしは、422', function () {
    createActiveProfile();

    $this->putJson('/api/world/road', ['style' => 'xx'])->assertStatus(422);
    $this->putJson('/api/world/road', [])->assertStatus(422);
});

it('選んだ国に着いた記録がなくなっていたら、日本の道で返る', function () {
    $profile = createActiveProfile();
    $profile->trips()->create(['destination' => 'kr', 'arrived_at' => now()]);
    $this->putJson('/api/world/road', ['style' => 'kr'])->assertOk();

    $profile->trips()->delete();

    expect(Travel::roadStyle($profile->fresh()))->toBe('jp');
    $this->getJson('/api/world')->assertJsonPath('road_style', 'jp');
});

it('ほかのプロフィールの道は変わらない', function () {
    $profile = createActiveProfile();
    $other = createFamilyMember($profile);
    $other->trips()->create(['destination' => 'us', 'arrived_at' => now()]);
    $other->update(['road_style' => 'us']);
    $profile->trips()->create(['destination' => 'id', 'arrived_at' => now()]);

    $this->putJson('/api/world/road', ['style' => 'id'])->assertOk();

    expect($other->fresh()->road_style)->toBe('us');
});

it('家族の町の返事に、持ち主が選んだ道が出る(見ている人が着いていない国でも)', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $sister->trips()->create(['destination' => 'gb', 'arrived_at' => now()]);
    $sister->update(['road_style' => 'gb']);

    $this->getJson("/api/family/{$sister->id}")->assertOk()->assertJsonPath('road_style', 'gb');
});

it('ログインが必要', function () {
    $this->putJson('/api/world/road', ['style' => 'jp'])->assertUnauthorized();
});
