<?php

use App\Models\AnalyticsDaily;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| analytics:aggregate(docs/design/2026-10-03-analytics-design.md 4-3)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC')); // 日本時間 10/10 12:00
});

it('引数なしで、前の日(日本時間)を集計して保存する', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-09 03:00:00');
    answerAt($profile, '2026-10-10 01:00:00'); // 今日の分は保存しない

    $this->artisan('analytics:aggregate')->assertSuccessful();

    expect(AnalyticsDaily::count())->toBe(1)
        ->and(AnalyticsDaily::first()->only(['answers', 'active_players']))->toBe(['answers' => 1, 'active_players' => 1])
        ->and(AnalyticsDaily::first()->date->toDateString())->toBe('2026-10-09');
});

it('2回実行しても行は増えず、数字が更新される', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-09 03:00:00');
    $this->artisan('analytics:aggregate')->assertSuccessful();

    answerAt($profile, '2026-10-09 04:00:00');
    $this->artisan('analytics:aggregate')->assertSuccessful();

    expect(AnalyticsDaily::count())->toBe(1)->and(AnalyticsDaily::first()->answers)->toBe(2);
});

it('--date で、その日だけを集計する', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-05 03:00:00');

    $this->artisan('analytics:aggregate', ['--date' => '2026-10-05'])->assertSuccessful();

    expect(AnalyticsDaily::count())->toBe(1)->and(AnalyticsDaily::first()->date->toDateString())->toBe('2026-10-05');
});

it('--from で、その日から昨日までを集計する', function () {
    $this->artisan('analytics:aggregate', ['--from' => '2026-10-07'])->assertSuccessful();

    expect(AnalyticsDaily::orderBy('date')->get()->map(fn ($row) => $row->date->toDateString())->all())
        ->toBe(['2026-10-07', '2026-10-08', '2026-10-09']);
});

it('--from earliest で、データのいちばん古い日から昨日まで集計する', function () {
    makePlayerAt('2026-10-07 00:00:00'); // 日本時間 10/7 9:00 に登録

    $this->artisan('analytics:aggregate', ['--from' => 'earliest'])->assertSuccessful();

    expect(AnalyticsDaily::orderBy('date')->first()->date->toDateString())->toBe('2026-10-07')
        ->and(AnalyticsDaily::count())->toBe(3);
});

it('日付がおかしいと失敗し、何も保存しない', function () {
    $this->artisan('analytics:aggregate', ['--date' => 'きのう'])->assertFailed();
    $this->artisan('analytics:aggregate', ['--date' => '2026-13-45'])->assertFailed();

    expect(AnalyticsDaily::count())->toBe(0);
});

it('毎日、日本時間の0時10分に動くように、スケジュールされている', function () {
    $this->artisan('schedule:list')->assertSuccessful(); // routes/console.php を読み込ませる

    $event = collect(app(Illuminate\Console\Scheduling\Schedule::class)->events())
        ->first(fn ($event) => str_contains($event->command, 'analytics:aggregate'));

    expect($event)->not->toBeNull()
        ->and($event->expression)->toBe('10 0 * * *')
        ->and($event->timezone)->toBe('Asia/Tokyo');
});
