<?php

use App\Models\Owner;
use App\Models\TanePlayDay;
use App\Models\TaneProfileState;
use App\Models\TaneStageRecord;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

// Owner ダッシュボードの Tane の集計(GET /api/owner/dashboard/tane)

function taneStars(UserProfile $p, array $stars): void
{
    foreach ($stars as $stage => $n) {
        TaneStageRecord::create(['user_profile_id' => $p->id, 'stage_id' => $stage, 'stars' => $n]);
    }
    TaneProfileState::firstOrCreate(['user_profile_id' => $p->id]);
}

test('Owner 以外は見られない', function () {
    $this->getJson('/api/owner/dashboard/tane')->assertUnauthorized();
});

test('記録が無いときは、すべて0で、割合は null', function () {
    $this->actingAs(Owner::factory()->create(), 'owner');

    $this->getJson('/api/owner/dashboard/tane')->assertOk()
        ->assertJsonPath('profile_count', 0)
        ->assertJsonPath('active_profiles_last_7_days', 0)
        ->assertJsonPath('first_play_rate.accounts', 0)
        ->assertJsonPath('first_play_rate.rate', null)
        ->assertJsonPath('modes.0.mode', 'add')
        ->assertJsonPath('modes.0.total_stars', 0);
});

test('プロフィール数・直近7日の人数・あそびごとの★・遊んだ割合が出る', function () {
    $this->travelTo(Carbon::parse('2026-10-22 12:00:00', 'Asia/Tokyo'));
    [$u1, $p1] = taneUser('あ');
    [$u2, $p2] = taneUser('い');
    [$u3] = taneUser('う'); // Tane を使い始めたが、まだ1回も遊んでいない
    foreach ([$u1, $u2, $u3] as $u) {
        DB::table('user_apps')->insert(['user_id' => $u->id, 'app' => 'tane', 'first_used_at' => now(), 'last_used_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    }
    taneStars($p1, ['add-1' => 3, 'add-2' => 2, 'shisoku-1' => 5]);
    taneStars($p2, ['add-1' => 1, 'soroban-3' => 4]);
    TanePlayDay::create(['user_profile_id' => $p1->id, 'played_on' => '2026-10-22']);
    TanePlayDay::create(['user_profile_id' => $p1->id, 'played_on' => '2026-10-16']); // 7日の内(今日をふくむ7日)
    TanePlayDay::create(['user_profile_id' => $p2->id, 'played_on' => '2026-10-15']); // 8日前 = 外

    $this->actingAs(Owner::factory()->create(), 'owner');
    $res = $this->getJson('/api/owner/dashboard/tane')->assertOk();

    $res->assertJsonPath('profile_count', 2)
        ->assertJsonPath('active_profiles_last_7_days', 1)
        ->assertJsonPath('first_play_rate.accounts', 3)
        ->assertJsonPath('first_play_rate.played', 2)
        ->assertJsonPath('first_play_rate.rate', 0.67);
    $modes = collect($res->json('modes'))->keyBy('mode');
    expect(array_keys($modes->all()))->toBe(['add', 'sub', 'mul', 'div', 'flash', 'soroban', 'shisoku']);
    expect($modes['add'])->toMatchArray(['players' => 2, 'total_stars' => 6, 'max_profile_stars' => 5, 'max_stage_stars' => 3]);
    expect($modes['soroban'])->toMatchArray(['players' => 1, 'total_stars' => 4])
        ->and($modes['shisoku']['total_stars'])->toBe(5)
        ->and($modes['sub']['players'])->toBe(0);
});
