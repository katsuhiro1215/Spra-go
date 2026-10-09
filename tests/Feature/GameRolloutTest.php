<?php

use App\Models\UserProfile;
use App\Support\GameRollout;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| ミニゲームの小出し(docs/design/2026-10-09-minigame-rollout-design.md)
|--------------------------------------------------------------------------
|
| 出す日・季節・NEW・今週のゲーム・全体のごほうびの上限。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/9(金) 12:00
});

/** 出す日・季節を、ゲームごとに設定する */
function rolloutCatalog(array $catalogs): void
{
    foreach ($catalogs as $game => $catalog) {
        config(["games.{$game}.catalog" => $catalog + ['released_on' => null, 'season' => null]]);
    }
}

function rolloutPlay(UserProfile $profile, string $game, string $on = '2026-10-09', bool $finished = true): void
{
    $profile->gamePlays()->create([
        'game' => $game, 'difficulty' => '初級', 'question_ids' => [],
        'finished_at' => $finished ? now() : null, 'played_on' => $on, 'score' => 10, 'rewarded' => $finished,
    ]);
}

it('今の3本は、いつでも出ている。出す日の前のゲームは出ない', function () {
    rolloutCatalog(['space_trip' => ['released_on' => '2026-10-10']]);

    expect(GameRollout::available())->toBe(['catch', 'flag_catch']);

    $this->travelTo(Carbon::parse('2026-10-09 15:00:00', 'UTC')); // 日本時間 10/10 0:00
    expect(GameRollout::available())->toBe(['catch', 'flag_catch', 'space_trip']);
});

it('季節のゲームは、期間の中だけ出る(毎年。年またぎも)', function () {
    rolloutCatalog(['space_trip' => ['season' => ['from' => '10-20', 'until' => '11-02']]]);
    expect(GameRollout::available())->not->toContain('space_trip');

    $this->travelTo(Carbon::parse('2026-10-25 03:00:00', 'UTC'));
    expect(GameRollout::available())->toContain('space_trip');

    $this->travelTo(Carbon::parse('2027-10-30 03:00:00', 'UTC')); // 来年も
    expect(GameRollout::available())->toContain('space_trip');

    $this->travelTo(Carbon::parse('2026-11-03 03:00:00', 'UTC'));
    expect(GameRollout::available())->not->toContain('space_trip');

    rolloutCatalog(['space_trip' => ['season' => ['from' => '12-20', 'until' => '01-05']]]);
    foreach (['2026-12-25', '2027-01-03'] as $day) {
        $this->travelTo(Carbon::parse("{$day} 03:00:00", 'UTC'));
        expect(GameRollout::available())->toContain('space_trip');
    }
    $this->travelTo(Carbon::parse('2027-01-10 03:00:00', 'UTC'));
    expect(GameRollout::available())->not->toContain('space_trip');
});

it('今週のゲームは、週が変わると替わる。同じ週のあいだは同じ', function () {
    $week = [];
    foreach (['2026-10-05', '2026-10-09', '2026-10-11', '2026-10-12', '2026-10-19'] as $day) { // 月〜日が同じ週
        $this->travelTo(Carbon::parse("{$day} 03:00:00", 'UTC'));
        $week[$day] = GameRollout::featured();
    }

    expect($week['2026-10-05'])->toBe($week['2026-10-09'])->toBe($week['2026-10-11'])
        ->and($week['2026-10-12'])->not->toBe($week['2026-10-11'])
        ->and($week['2026-10-19'])->not->toBe($week['2026-10-12'])
        ->and(array_unique($week))->each->toBeIn(['catch', 'flag_catch', 'space_trip']);
});

it('季節のゲームが出ているあいだは、そのゲームが今週のゲーム', function () {
    rolloutCatalog(['space_trip' => ['season' => ['from' => '10-01', 'until' => '10-31']]]);

    expect(GameRollout::featured())->toBe('space_trip');
});

it('NEW: 出す日から14日のあいだ、まだ遊んでいなければ付く。遊ぶと消える。常設には付かない', function () {
    $profile = createActiveProfile();
    rolloutCatalog(['space_trip' => ['released_on' => '2026-10-01']]);

    expect(GameRollout::isNew($profile, 'space_trip'))->toBeTrue()
        ->and(GameRollout::isNew($profile, 'catch'))->toBeFalse();

    rolloutPlay($profile, 'space_trip', finished: false); // 始めただけでも、遊んだことになる
    expect(GameRollout::isNew($profile, 'space_trip'))->toBeFalse();

    $other = \App\Models\UserSchema::query()->firstOrFail()->profiles()->create(['name' => 'べつの子']);
    $this->travelTo(Carbon::parse('2026-10-16 03:00:00', 'UTC')); // 15日目
    expect(GameRollout::isNew($other, 'space_trip'))->toBeFalse();
});

it('一覧のAPI: 出ているゲームだけを、順に、札つきで返す', function () {
    $profile = createActiveProfile();
    rolloutCatalog(['space_trip' => ['released_on' => '2026-10-05'], 'flag_catch' => ['released_on' => '2026-12-01']]);
    $featured = GameRollout::featured();

    $response = $this->getJson('/api/games')->assertOk();

    expect(collect($response->json())->pluck('key')->all())->toBe(['catch', 'space-trip'])
        ->and($response->json('1.new'))->toBeTrue()
        ->and($response->json('0.new'))->toBeFalse()
        ->and(collect($response->json())->where('featured', true)->count())->toBe(1)
        ->and(collect($response->json())->firstWhere('featured', true)['key'])->toBe(str_replace('_', '-', $featured));
});

it('出ていないゲームのAPIは404(一覧・始める)', function () {
    createActiveProfile();
    rolloutCatalog(['space_trip' => ['released_on' => '2026-12-01']]);

    $this->getJson('/api/games/space-trip')->assertNotFound();
    $this->postJson('/api/games/space-trip/plays', ['difficulty' => '初級'])->assertNotFound();
    $this->getJson('/api/games/catch')->assertOk();
});

it('ごほうびの上限は、全ゲームの合計で1日6回。ゲームごとの3回も守る', function () {
    $profile = createActiveProfile();
    foreach (range(1, 3) as $i) {
        rolloutPlay($profile, 'catch');
        rolloutPlay($profile, 'flag_catch');
    }

    $this->getJson('/api/games/space-trip')->assertOk()->assertJsonPath('rewarded_plays_left', 0); // 全体の6回を使い切った
    $this->getJson('/api/games/catch')->assertOk()->assertJsonPath('rewarded_plays_left', 0);
});

it('全体の上限に余裕があるあいだは、ゲームごとの残りになる', function () {
    $profile = createActiveProfile();
    rolloutPlay($profile, 'catch');
    rolloutPlay($profile, 'flag_catch');

    $this->getJson('/api/games/space-trip')->assertOk()->assertJsonPath('rewarded_plays_left', 3);
    $this->getJson('/api/games/catch')->assertOk()->assertJsonPath('rewarded_plays_left', 2);
});
