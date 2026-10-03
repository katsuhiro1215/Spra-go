<?php

use App\Support\Analytics;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| また来た割合・登録した週ごとの続き具合(docs/design/2026-10-03-analytics-design.md 4-4)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-14 03:00:00', 'UTC')); // 日本時間 10/14(水) 12:00
});

it('1日後・3日後・7日後に、また遊んだ人の割合を出す。その日数が経っていない人は母数に入れない', function () {
    $stay = makePlayerAt('2026-10-01 00:00:00', '続けた人');
    $drop = makePlayerAt('2026-10-01 00:00:00', 'やめた人');
    $new = makePlayerAt('2026-10-13 00:00:00', '昨日の人');
    foreach (['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-12'] as $date) {
        answerAt($stay, "{$date} 03:00:00");
    }
    answerAt($drop, '2026-10-05 03:00:00');
    answerAt($new, '2026-10-13 03:00:00'); // 初日が10/13 → 1日後(10/14)の母数に入る。3日後・7日後はまだ

    $retention = (new Analytics)->retention();

    expect($retention['d1'])->toBe(['rate' => 0.3333, 'base' => 3]) // 続けた人(10/6に来た)だけ
        ->and($retention['d3'])->toBe(['rate' => 0.5, 'base' => 2])  // 続けた人(10/8)・やめた人
        ->and($retention['d7'])->toBe(['rate' => 0.5, 'base' => 2]); // 続けた人(10/12)・やめた人
});

it('答えたことがない人は、母数に入れない', function () {
    makePlayerAt('2026-10-01 00:00:00');

    expect((new Analytics)->retention())->toBe([
        'd1' => ['rate' => null, 'base' => 0],
        'd3' => ['rate' => null, 'base' => 0],
        'd7' => ['rate' => null, 'base' => 0],
    ]);
});

it('登録した週(日本時間の月曜始まり)ごとに、その後の週に遊んだ人の割合を出す', function () {
    // 今週は 10/12(月)〜。先週は 10/5(月)〜
    $a = makePlayerAt('2026-10-06 00:00:00', 'A'); // 先週(10/6 火)に登録
    $b = makePlayerAt('2026-10-07 00:00:00', 'B'); // 先週に登録
    $c = makePlayerAt('2026-10-13 00:00:00', 'C'); // 今週に登録
    answerAt($a, '2026-10-06 03:00:00'); // A: 登録した週に遊ぶ
    answerAt($a, '2026-10-13 03:00:00'); // A: 1週後(今週)にも遊ぶ
    answerAt($b, '2026-10-07 03:00:00'); // B: 登録した週だけ
    // C: 答えていない

    $cohorts = (new Analytics)->cohorts(8);

    expect($cohorts)->toHaveCount(2)
        ->and($cohorts[0])->toBe(['week' => '2026-10-05', 'players' => 2, 'weeks' => [1.0, 0.5, null, null, null]])
        ->and($cohorts[1])->toBe(['week' => '2026-10-12', 'players' => 1, 'weeks' => [0.0, null, null, null, null]]);
});

it('週の区切りは日本時間(日曜 15:00 UTC は月曜の0時)', function () {
    $player = makePlayerAt('2026-10-11 15:00:00'); // 日本時間 10/12(月) 0:00 → 今週
    answerAt($player, '2026-10-12 03:00:00');

    expect((new Analytics)->cohorts(8)[0]['week'])->toBe('2026-10-12');
});

it('古い登録の週は、指定した週数より前を出さない', function () {
    makePlayerAt('2026-07-01 00:00:00');

    expect((new Analytics)->cohorts(8))->toBe([]);
});
