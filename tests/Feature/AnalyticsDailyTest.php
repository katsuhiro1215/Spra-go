<?php

use App\Models\AnalyticsDaily;
use App\Models\ProfilePlayDay;
use App\Support\Analytics;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 日ごとの集計(docs/design/2026-10-03-analytics-design.md 3章・4-2)
|--------------------------------------------------------------------------
*/

it('答えは、日本時間の0時で区切って数える(14:59 UTCは前の日、15:00 UTCは次の日)', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-05 14:59:00');
    answerAt($profile, '2026-10-05 15:00:00', false);

    $analytics = new Analytics;

    expect($analytics->aggregateDay('2026-10-05'))->toMatchArray(['answers' => 1, 'correct_answers' => 1, 'active_players' => 1])
        ->and($analytics->aggregateDay('2026-10-06'))->toMatchArray(['answers' => 1, 'correct_answers' => 0, 'active_players' => 1]);
});

it('1日の答え・正解・遊んだ人数を数える', function () {
    $a = makePlayerAt('2026-10-01 00:00:00', 'A');
    $b = makePlayerAt('2026-10-01 00:00:00', 'B');
    $c = makePlayerAt('2026-10-01 00:00:00', 'C');
    answerAt($a, '2026-10-05 01:00:00');
    answerAt($a, '2026-10-05 02:00:00', false);
    answerAt($b, '2026-10-05 03:00:00');
    answerAt($c, '2026-10-04 03:00:00'); // 別の日

    expect((new Analytics)->aggregateDay('2026-10-05'))
        ->toMatchArray(['answers' => 3, 'correct_answers' => 2, 'active_players' => 2]);
});

it('新しいアカウント・プレイヤーを、作った日(日本時間)で数える', function () {
    makePlayerAt('2026-10-05 14:59:00'); // 日本時間 10/5 23:59
    makePlayerAt('2026-10-05 15:00:00'); // 日本時間 10/6 0:00

    expect((new Analytics)->aggregateDay('2026-10-05'))->toMatchArray(['new_accounts' => 1, 'new_players' => 1])
        ->and((new Analytics)->aggregateDay('2026-10-06'))->toMatchArray(['new_accounts' => 1, 'new_players' => 1]);
});

it('開いた人数は10秒以上。遊んだ時間は全員の秒数の合計', function () {
    $a = makePlayerAt('2026-10-01 00:00:00');
    $b = makePlayerAt('2026-10-01 00:00:00');
    ProfilePlayDay::create(['user_profile_id' => $a->id, 'played_on' => '2026-10-05', 'seconds' => 9]);
    ProfilePlayDay::create(['user_profile_id' => $b->id, 'played_on' => '2026-10-05', 'seconds' => 600]);

    expect((new Analytics)->aggregateDay('2026-10-05'))->toMatchArray(['opened_players' => 1, 'play_seconds' => 609]);
});

it('解いた直後のやり直し(練習)は、記録されないので数えない', function () {
    $this->travelTo(Carbon::parse('2026-10-05 03:00:00', 'UTC'));
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect((new Analytics)->aggregateDay('2026-10-05'))->toMatchArray(['answers' => 0, 'active_players' => 0]);
});

it('日ごとの一覧は、表の行を使い、無い日はそのつど数えて補い、古い順に全日を並べる', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-07 03:00:00'); // 表に無い日(そのつど数える)
    AnalyticsDaily::create([
        'date' => '2026-10-06', 'new_accounts' => 0, 'new_players' => 0, 'active_players' => 7, 'opened_players' => 7,
        'answers' => 70, 'correct_answers' => 35, 'play_seconds' => 3600,
    ]); // 表の行(実際の記録とは違う数字にして、表を読んでいることを確かめる)

    $rows = (new Analytics)->daily('2026-10-05', '2026-10-07');

    expect(array_column($rows, 'date'))->toBe(['2026-10-05', '2026-10-06', '2026-10-07'])
        ->and($rows[0])->toMatchArray(['answers' => 0, 'accuracy' => null, 'play_minutes' => 0])
        ->and($rows[1])->toMatchArray(['active_players' => 7, 'answers' => 70, 'accuracy' => 0.5, 'play_minutes' => 60])
        ->and($rows[2])->toMatchArray(['active_players' => 1, 'answers' => 1, 'accuracy' => 1.0]);
});

it('概要は、今日・7日・30日に遊んだ人数と、今日の答えと遊んだ時間を出す', function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC')); // 日本時間 10/10 12:00
    $today = makePlayerAt('2026-09-01 00:00:00');
    $week = makePlayerAt('2026-09-01 00:00:00');
    $month = makePlayerAt('2026-09-01 00:00:00');
    $old = makePlayerAt('2026-09-01 00:00:00');
    answerAt($today, '2026-10-10 01:00:00');
    answerAt($today, '2026-10-10 02:00:00', false);
    answerAt($week, '2026-10-04 03:00:00');   // 直近7日(10/4〜10/10)に入る
    answerAt($month, '2026-09-11 03:00:00');  // 直近30日(9/11〜10/10)に入る
    answerAt($old, '2026-09-10 03:00:00');    // 30日より前
    ProfilePlayDay::create(['user_profile_id' => $today->id, 'played_on' => '2026-10-10', 'seconds' => 3150]);

    expect((new Analytics)->summary())->toMatchArray([
        'accounts' => 4, 'players' => 4,
        'active_today' => 1, 'active_7d' => 2, 'active_30d' => 3,
        'answers_today' => 2, 'play_minutes_today' => 53,
    ]);
});

it('プレイヤーを消しても、集計の表の過去の数字は残る', function () {
    $profile = makePlayerAt('2026-10-01 00:00:00');
    answerAt($profile, '2026-10-05 03:00:00');
    $row = (new Analytics)->aggregateDay('2026-10-05');
    AnalyticsDaily::create(['date' => '2026-10-05'] + $row);

    $profile->delete();

    expect((new Analytics)->daily('2026-10-05', '2026-10-05')[0])->toMatchArray(['answers' => 1, 'active_players' => 1]);
});
