<?php

namespace App\Console\Commands;

use App\Models\AnalyticsDaily;
use App\Models\User;
use App\Support\Analytics;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/** 日ごとの集計を作る(docs/design/2026-10-03-analytics-design.md 4-3)。引数なしで、前の日(日本時間) */
class AnalyticsAggregateCommand extends Command
{
    protected $signature = 'analytics:aggregate {--date= : この日だけ集計する(Y-m-d、日本時間)} {--from= : この日から昨日まで集計する(Y-m-d、または earliest でデータのいちばん古い日から)}';

    protected $description = '日ごとの分析の数字を集計して、集計の表に保存する';

    public function handle(Analytics $analytics): int
    {
        $yesterday = Carbon::parse($analytics->today())->subDay()->toDateString();

        try {
            $dates = $this->dates($analytics, $yesterday);
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        foreach ($dates as $date) {
            AnalyticsDaily::query()->updateOrCreate(['date' => $date], $analytics->aggregateDay($date));
        }

        $this->info(count($dates).'日分を集計しました。');

        return self::SUCCESS;
    }

    /** @return list<string> */
    private function dates(Analytics $analytics, string $yesterday): array
    {
        if ($this->option('date')) {
            return [$this->parse($this->option('date'))];
        }

        if ($from = $this->option('from')) {
            $start = $from === 'earliest' ? $this->earliest($analytics) : $this->parse($from);
            $dates = [];
            for ($day = Carbon::parse($start); $day->toDateString() <= $yesterday; $day->addDay()) {
                $dates[] = $day->toDateString();
            }

            return $dates;
        }

        return [$yesterday];
    }

    private function parse(string $value): string
    {
        try {
            $date = Carbon::createFromFormat('!Y-m-d', $value, Analytics::TIMEZONE);
        } catch (\Throwable) {
            throw new \InvalidArgumentException("日付が正しくありません: {$value}（Y-m-d で書いてください）");
        }

        if ($date->format('Y-m-d') !== $value) {
            throw new \InvalidArgumentException("日付が正しくありません: {$value}（Y-m-d で書いてください）");
        }

        return $value;
    }

    /** データのいちばん古い日(日本時間)。答えか登録のうち古いほう。データが無ければ昨日 */
    private function earliest(Analytics $analytics): string
    {
        $first = collect([$analytics->answers()->min('created_at'), User::query()->min('created_at')])->filter()->min();

        return $first
            ? Carbon::parse($first, 'UTC')->setTimezone(Analytics::TIMEZONE)->toDateString()
            : Carbon::parse($analytics->today())->subDay()->toDateString();
    }
}
