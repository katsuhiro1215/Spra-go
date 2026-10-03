<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Support\Analytics;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| どこでやめたか(docs/design/2026-10-03-analytics-design.md 4-5)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-20 03:00:00', 'UTC')); // 日本時間 10/20
});

function clearStage(App\Models\UserProfile $profile): void
{
    $stage = Stage::create([
        'category_id' => Category::query()->firstOrCreate(['name' => '段階のテスト'])->id,
        'difficulty' => '初級',
        'stage_number' => Stage::count() + 1,
    ]);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stage->id, 'cleared_at' => now()]);
}

it('段階は、前の段階を全部満たした人だけが次に進む', function () {
    $none = makePlayerAt('2026-10-10 00:00:00', '作っただけ');
    $answered = makePlayerAt('2026-10-10 00:00:00', '答えただけ');
    $cleared = makePlayerAt('2026-10-10 00:00:00', 'クリアした');
    $deep = makePlayerAt('2026-10-10 00:00:00', '深く進んだ');
    $skip = makePlayerAt('2026-10-10 00:00:00', '種だけまいた'); // 答えていないので、種まきは段階に入らない

    answerAt($answered, '2026-10-11 03:00:00');
    answerAt($cleared, '2026-10-11 03:00:00');
    clearStage($cleared);
    foreach (['2026-10-11', '2026-10-12', '2026-10-13'] as $date) {
        answerAt($deep, "{$date} 03:00:00");
    }
    clearStage($deep);
    $deep->update(['level' => 5]);
    $deep->seeds()->create(['result_key' => 'lumi']);
    $deep->trips()->create(['destination' => 'id', 'arrived_at' => now()]);
    $skip->seeds()->create(['result_key' => 'momo']);

    $funnel = collect((new Analytics)->funnel('2026-10-01'))->keyBy('key');

    expect($funnel['account']['count'])->toBe(5)->and($funnel['account']['rate'])->toBeNull()
        ->and($funnel['player']['count'])->toBe(5)->and($funnel['player']['rate'])->toBeNull()
        ->and($funnel['first_answer'])->toMatchArray(['count' => 3, 'rate' => 0.6])
        ->and($funnel['first_clear'])->toMatchArray(['count' => 2, 'rate' => 0.6667])
        ->and($funnel['three_days'])->toMatchArray(['count' => 1, 'rate' => 0.5])
        ->and($funnel['level5'])->toMatchArray(['count' => 1, 'rate' => 1.0])
        ->and($funnel['first_seed'])->toMatchArray(['count' => 1, 'rate' => 1.0])
        ->and($funnel['first_trip'])->toMatchArray(['count' => 1, 'rate' => 1.0]);
});

it('期間より前に作ったプレイヤー・アカウントは数えない', function () {
    makePlayerAt('2026-09-01 00:00:00');
    makePlayerAt('2026-10-10 00:00:00');

    $funnel = collect((new Analytics)->funnel('2026-10-01'))->keyBy('key');

    expect($funnel['account']['count'])->toBe(1)->and($funnel['player']['count'])->toBe(1);
});

it('前の段階の人数が0のとき、割合は null', function () {
    makePlayerAt('2026-10-10 00:00:00');

    $funnel = collect((new Analytics)->funnel('2026-10-01'))->keyBy('key');

    expect($funnel['first_answer'])->toMatchArray(['count' => 0, 'rate' => 0.0])
        ->and($funnel['first_clear'])->toMatchArray(['count' => 0, 'rate' => null]);
});

it('離れた人(最後に答えたのが7日以上前)が、最後にどこまで進んだかを数える', function () {
    $never = makePlayerAt('2026-10-10 00:00:00', '答えずに離れた');
    $quit = makePlayerAt('2026-10-10 00:00:00', '1問で離れた');
    $deep = makePlayerAt('2026-10-10 00:00:00', 'クリアして離れた');
    $active = makePlayerAt('2026-10-10 00:00:00', 'まだ遊んでいる');
    $fresh = makePlayerAt('2026-10-18 00:00:00', 'さっき作った'); // 作ってから7日経っていない

    answerAt($quit, '2026-10-11 03:00:00');
    answerAt($deep, '2026-10-11 03:00:00');
    clearStage($deep);
    answerAt($active, '2026-10-19 03:00:00'); // 昨日も遊んだ

    $dropoff = collect((new Analytics)->dropoff('2026-10-01'))->keyBy('key');

    expect($dropoff['player']['count'])->toBe(1)       // 答えずに離れた
        ->and($dropoff['first_answer']['count'])->toBe(1)
        ->and($dropoff['first_clear']['count'])->toBe(1)
        ->and($dropoff['three_days']['count'])->toBe(0)
        ->and(collect((new Analytics)->dropoff('2026-10-01'))->pluck('key')->all())
        ->toBe(['player', 'first_answer', 'first_clear', 'three_days', 'level5', 'first_seed', 'first_trip']);
});
