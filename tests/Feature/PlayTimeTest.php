<?php

use App\Models\ProfilePlayDay;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 遊んだ時間の記録(docs/design/2026-10-03-analytics-design.md 5章)
|--------------------------------------------------------------------------
*/

it('最初の送信は、30秒まで数える', function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC')); // 日本時間 12:00
    $profile = createActiveProfile();

    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk()->assertJsonPath('seconds', 30);

    $row = ProfilePlayDay::firstOrFail();
    expect($row->user_profile_id)->toBe($profile->id)
        ->and($row->played_on->toDateString())->toBe('2026-10-10')
        ->and($row->seconds)->toBe(30);
});

it('前回から経った秒数を超えては増えない(連続して送られても水増しされない)', function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC'));
    createActiveProfile();

    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk();
    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk()->assertJsonPath('seconds', 30); // 0秒しか経っていない

    $this->travelTo(Carbon::parse('2026-10-10 03:00:10', 'UTC'));
    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk()->assertJsonPath('seconds', 40); // 10秒だけ

    $this->travelTo(Carbon::parse('2026-10-10 03:05:10', 'UTC'));
    $this->postJson('/api/play-time', ['seconds' => 60])->assertOk()->assertJsonPath('seconds', 100); // 60秒まで
});

it('日本時間で日をまたぐと、別の行になる', function () {
    $this->travelTo(Carbon::parse('2026-10-10 14:59:30', 'UTC')); // 日本時間 23:59:30
    $profile = createActiveProfile();
    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk();

    $this->travelTo(Carbon::parse('2026-10-10 15:00:30', 'UTC')); // 日本時間 翌日 0:00:30
    $this->postJson('/api/play-time', ['seconds' => 30])->assertOk()->assertJsonPath('seconds', 30);

    expect(ProfilePlayDay::where('user_profile_id', $profile->id)->orderBy('played_on')->pluck('played_on')->map->toDateString()->all())
        ->toBe(['2026-10-10', '2026-10-11']);
});

it('秒数は1〜60の整数。範囲外は422', function (mixed $seconds) {
    createActiveProfile();

    $this->postJson('/api/play-time', ['seconds' => $seconds])->assertStatus(422);

    expect(ProfilePlayDay::count())->toBe(0);
})->with([0, 61, -5, 'たくさん', null]);

it('プロフィールを選んでいないと422、ログインしていないと401', function () {
    $this->postJson('/api/play-time', ['seconds' => 30])->assertStatus(401);

    $this->actingAs(App\Models\User::factory()->create())->withHeader('Referer', 'http://localhost');
    $this->postJson('/api/play-time', ['seconds' => 30])->assertStatus(422);
});

it('1分に7回目の送信は429', function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC'));
    createActiveProfile();

    foreach (range(1, 6) as $i) {
        $this->postJson('/api/play-time', ['seconds' => 1])->assertOk();
    }

    $this->postJson('/api/play-time', ['seconds' => 1])->assertStatus(429);
});
