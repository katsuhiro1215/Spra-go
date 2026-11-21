<?php

use App\Models\DeerStageRecord;
use App\Models\Owner;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

// Owner ダッシュボードのSpraと鹿。の集計(GET /api/owner/dashboard/deer)

function deerPlayRow(?int $profileId, ?string $anonId, string $level, ?string $result, string $playedOn): void
{
    DB::table('deer_plays')->insert([
        'user_profile_id' => $profileId,
        'anon_id' => $anonId,
        'player_key' => $profileId ? "p:{$profileId}" : "a:{$anonId}",
        'level_id' => $level,
        'result' => $result,
        'started_at' => $playedOn.' 12:00:00',
        'finished_at' => $result ? $playedOn.' 12:01:00' : null,
        'played_on' => $playedOn,
    ]);
}

test('Owner 以外は見られない', function () {
    $this->getJson('/api/owner/dashboard/deer')->assertUnauthorized();
});

test('記録が無いときは、すべて0で、割合は null、ワールドは8件', function () {
    $this->actingAs(Owner::factory()->create(), 'owner');

    $res = $this->getJson('/api/owner/dashboard/deer')->assertOk()
        ->assertJsonPath('profile_count', 0)
        ->assertJsonPath('active_profiles_last_7_days', 0)
        ->assertJsonPath('anon_players_last_7_days', 0)
        ->assertJsonPath('first_play_rate.accounts', 0)
        ->assertJsonPath('first_play_rate.rate', null)
        ->assertJsonPath('public_ranking_families', 0);
    expect($res->json('worlds'))->toHaveCount(8);
    expect($res->json('worlds.0'))->toBe(['world' => 1, 'plays' => 0, 'players' => 0, 'clears' => 0]);
});

test('プロフィール数・直近7日の人数(ログイン・ログインなし)・ワールドごとの集計・遊んだ割合・公開している家族数が出る', function () {
    $this->travelTo(Carbon::parse('2026-11-21 12:00:00', 'Asia/Tokyo'));
    [$u1, $p1] = taneUser('あ');
    [$u2, $p2] = taneUser('い');
    [$u3] = taneUser('う'); // Spraと鹿。を使い始めたが、まだ1回も遊んでいない
    foreach ([$u1, $u2, $u3] as $u) {
        DB::table('user_apps')->insert(['user_id' => $u->id, 'app' => 'deer', 'first_used_at' => now(), 'last_used_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
    }
    $u2->schema->update(['deer_ranking_public' => true]);

    DeerStageRecord::create(['user_profile_id' => $p1->id, 'level_id' => '1-1', 'plays' => 3, 'clears' => 2, 'stars' => 2, 'best_ms' => 20000]);
    DeerStageRecord::create(['user_profile_id' => $p2->id, 'level_id' => '8-7', 'plays' => 1, 'clears' => 0, 'stars' => 0]);

    deerPlayRow($p1->id, null, '1-1', 'clear', '2026-11-21'); // 今日
    deerPlayRow($p1->id, null, '1-1', 'fail', '2026-11-15'); // 7日前(内)
    deerPlayRow($p2->id, null, '8-7', 'quit', '2026-11-13'); // 8日前(外)
    deerPlayRow(null, 'a1', '1-1', 'fail', '2026-11-21');
    deerPlayRow(null, 'a1', '1-2', 'quit', '2026-11-14'); // 7日前(内)
    deerPlayRow(null, 'a2', '1-1', 'clear', '2026-11-10'); // 8日前(外)

    $this->actingAs(Owner::factory()->create(), 'owner');
    $res = $this->getJson('/api/owner/dashboard/deer')->assertOk();

    $res->assertJsonPath('profile_count', 2)
        ->assertJsonPath('active_profiles_last_7_days', 1) // p1だけ(p2の記録は8日前)
        ->assertJsonPath('anon_players_last_7_days', 1) // a1だけ(a2は8日前)
        ->assertJsonPath('first_play_rate.accounts', 3)
        ->assertJsonPath('first_play_rate.played', 2)
        ->assertJsonPath('first_play_rate.rate', 0.67)
        ->assertJsonPath('public_ranking_families', 1);

    $worlds = collect($res->json('worlds'))->keyBy('world');
    expect($worlds[1])->toMatchArray(['plays' => 5, 'players' => 3, 'clears' => 2]);
    expect($worlds[8])->toMatchArray(['plays' => 1, 'players' => 1, 'clears' => 0]);
    expect($worlds[2]['plays'])->toBe(0);
});
