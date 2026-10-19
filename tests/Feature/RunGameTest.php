<?php

use App\Models\ProfileGamePlay;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スプルラン(docs/design/2026-10-22-spru-run-design.md 14章)
|--------------------------------------------------------------------------
|
| 練習はサーバーに送らない。本番は1日2回・タネの財布・ランキング。コイン・経験値・学習ポイントは出ない。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/9 12:00
    config(['games.spru_run.catalog' => ['released_on' => '2026-10-01', 'ends_on' => '2026-10-31', 'season' => null]]);
});

function startRun($test, int $ceiling = 420): array
{
    return $test->postJson('/api/games/spru-run/plays', ['ceiling' => $ceiling])->assertOk()->json();
}

/** 始めてから $seconds 秒あとに終える */
function finishRun($test, array $start, int $seconds, int $distance, int $seedValue)
{
    $test->travel($seconds)->seconds();

    return $test->postJson("/api/games/spru-run/plays/{$start['play_id']}/finish", ['distance_m' => $distance, 'seed_value' => $seedValue]);
}

it('入口: ベスト・今日の本番ののこり・財布・期間を返す', function () {
    $profile = createActiveProfile();
    $profile->update(['run_seeds' => 120]);
    $profile->gamePlays()->create(['game' => 'spru_run', 'difficulty' => 'ふつう', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-08', 'score' => 900]);

    $this->getJson('/api/games/spru-run')
        ->assertOk()
        ->assertJsonPath('best_score', 900)
        ->assertJsonPath('real_plays_left', 2)
        ->assertJsonPath('real_plays_per_day', 2)
        ->assertJsonPath('seeds', 120)
        ->assertJsonPath('ends_on', '2026-10-31')
        ->assertJsonPath('bonus_available', true);
});

it('本番を始めると、のこりが1つ減り、種と画面の高さが回に残る。3回目は始められない', function () {
    createActiveProfile();

    $start = startRun($this);
    expect($start['seed'])->toBeInt()->and($start['play_id'])->toBeInt();
    $play = ProfileGamePlay::findOrFail($start['play_id']);
    expect($play->game)->toBe('spru_run')->and($play->ceiling)->toBe(420)->and($play->run_seed)->toBe($start['seed']);
    $this->getJson('/api/games/spru-run')->assertJsonPath('real_plays_left', 1);

    startRun($this);
    $this->postJson('/api/games/spru-run/plays', ['ceiling' => 420])->assertStatus(422);
});

it('画面の高さが範囲の外なら始められない', function () {
    createActiveProfile();

    $this->postJson('/api/games/spru-run/plays', ['ceiling' => 50])->assertStatus(422);
    $this->postJson('/api/games/spru-run/plays', ['ceiling' => 5000])->assertStatus(422);
});

it('日本時間で日付が変わると、本番のこりが2に戻る', function () {
    createActiveProfile();
    startRun($this);
    startRun($this);

    $this->travelTo(Carbon::parse('2026-10-09 15:00:00', 'UTC')); // 日本時間 10/10 0:00
    $this->getJson('/api/games/spru-run')->assertJsonPath('real_plays_left', 2);
});

it('期間の前・後は404', function () {
    createActiveProfile();

    config(['games.spru_run.catalog' => ['released_on' => '2026-10-10', 'ends_on' => '2026-10-31', 'season' => null]]);
    $this->getJson('/api/games/spru-run')->assertNotFound();

    config(['games.spru_run.catalog' => ['released_on' => '2026-10-01', 'ends_on' => '2026-10-08', 'season' => null]]);
    $this->getJson('/api/games/spru-run')->assertNotFound();
    $this->postJson('/api/games/spru-run/plays', ['ceiling' => 420])->assertNotFound();

    config(['games.spru_run.catalog' => ['released_on' => '2026-10-01', 'ends_on' => '2026-10-09', 'season' => null]]); // 終わる日を含む
    $this->getJson('/api/games/spru-run')->assertOk();
});

it('10秒以内にやめると、回を消してのこりを戻す。10秒をこえたら422', function () {
    createActiveProfile();
    $start = startRun($this);

    $this->travel(5)->seconds();
    $this->postJson("/api/games/spru-run/plays/{$start['play_id']}/abandon")->assertOk()->assertJsonPath('real_plays_left', 2);
    expect(ProfileGamePlay::find($start['play_id']))->toBeNull();

    $second = startRun($this);
    $this->travel(11)->seconds();
    $this->postJson("/api/games/spru-run/plays/{$second['play_id']}/abandon")->assertStatus(422);
    expect(ProfileGamePlay::find($second['play_id']))->not->toBeNull();
});

it('終えると、点数(距離×2+タネ×2)・もらったタネ・財布が決まる。1回目はボーナス+50', function () {
    $profile = createActiveProfile();
    $start = startRun($this);

    finishRun($this, $start, 60, 300, 100)
        ->assertOk()
        ->assertJsonPath('score', 800)
        ->assertJsonPath('seeds_earned', 150)
        ->assertJsonPath('bonus', 50)
        ->assertJsonPath('seeds', 150)
        ->assertJsonPath('best_score', 800)
        ->assertJsonPath('real_plays_left', 1);
    expect($profile->fresh()->run_seeds)->toBe(150);

    // 2回目はボーナスなし
    $second = startRun($this);
    finishRun($this, $second, 60, 100, 40)->assertOk()->assertJsonPath('seeds_earned', 40)->assertJsonPath('bonus', 0);
    expect($profile->fresh()->run_seeds)->toBe(190);
});

it('コイン・経験値・学習ポイントは増えない', function () {
    $profile = createActiveProfile();
    $before = $profile->fresh()->only(['coins', 'xp', 'points']);
    $start = startRun($this);

    finishRun($this, $start, 60, 300, 100)->assertOk();

    expect($profile->fresh()->only(['coins', 'xp', 'points']))->toBe($before);
});

it('1回にもらえるタネは600個まで(ボーナスは別)', function () {
    config(['games.spru_run.max_seed_value_per_sec' => 100]);
    $profile = createActiveProfile();
    $start = startRun($this);

    finishRun($this, $start, 120, 400, 5000)->assertOk()->assertJsonPath('seeds_earned', 650);
    expect($profile->fresh()->run_seeds)->toBe(650);
});

it('その時間で出せない距離・タネは受け付けない(記録にも財布にも入らない)', function () {
    $profile = createActiveProfile();

    $start = startRun($this);
    finishRun($this, $start, 10, 9999, 0)->assertStatus(422);
    expect($profile->fresh()->run_seeds)->toBe(0)->and(ProfileGamePlay::find($start['play_id'])->finished_at)->toBeNull();

    $other = startRun($this);
    finishRun($this, $other, 10, 5, 9999)->assertStatus(422);
    expect($profile->fresh()->run_seeds)->toBe(0);
});

it('二重には終えられない。ほかの人の回は終えられない', function () {
    createActiveProfile();
    $start = startRun($this);
    finishRun($this, $start, 60, 100, 10)->assertOk();
    $this->postJson("/api/games/spru-run/plays/{$start['play_id']}/finish", ['distance_m' => 100, 'seed_value' => 10])->assertStatus(409);

    createActiveProfile(); // 別の人に替わる。元の回は他人の回
    $this->postJson("/api/games/spru-run/plays/{$start['play_id']}/finish", ['distance_m' => 1, 'seed_value' => 0])->assertNotFound();
});

it('終えていない前の回は、新しく始めるとき「使った・タネなし」になる', function () {
    $profile = createActiveProfile();
    $first = startRun($this);
    $this->travel(30)->seconds();
    startRun($this);

    expect(ProfileGamePlay::find($first['play_id']))->not->toBeNull()
        ->and(ProfileGamePlay::find($first['play_id'])->finished_at)->toBeNull();
    $this->getJson('/api/games/spru-run')->assertJsonPath('real_plays_left', 0);
    expect($profile->fresh()->run_seeds)->toBe(0);
});

it('ランキングには本番の終えた回だけが載る', function () {
    createActiveProfile();
    $start = startRun($this);
    finishRun($this, $start, 60, 300, 100)->assertOk();
    startRun($this); // 終えていない回

    $this->getJson('/api/games/spru-run/ranking?scope=family&difficulty=ふつう&period=all')
        ->assertOk()
        ->assertJsonPath('rows.0.rank', 1)
        ->assertJsonPath('rows.0.value', 800)
        ->assertJsonCount(1, 'rows');
});

it('ミニゲームの全体の上限(6回)には数えず、今週のゲームにもならない', function () {
    $profile = createActiveProfile();
    startRun($this);

    expect(\App\Support\GameRollout::featured())->not->toBe('spru_run');
    expect(\App\Support\GameRollout::list($profile)[count(\App\Support\GameRollout::list($profile)) - 1])
        ->toMatchArray(['key' => 'spru-run', 'featured' => false, 'limited' => true, 'ends_on' => '2026-10-31']);
});
