<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 毎日、日本時間の0時10分に、前の日の分析を集計する。本番では、サーバーの cron で `php artisan schedule:run` を毎分動かす
Schedule::command('analytics:aggregate')->dailyAt('00:10')->timezone('Asia/Tokyo');

// 中央管理システム(Spra)へ送れていない保護者のご意見を、5分ごとに送り直す(設定がなければ何もしない)
Schedule::command('feedbacks:relay')->everyFiveMinutes()->withoutOverlapping();
