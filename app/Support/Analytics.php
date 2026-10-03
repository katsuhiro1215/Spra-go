<?php

namespace App\Support;

use App\Models\AnalyticsDaily;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * 分析の数え方(docs/design/2026-10-03-analytics-design.md 3章・4-2)。
 * 「遊んだ(答えた)」は、答えの体力の行(type = hp、reason が answer_correct か answer_wrong)。1日の区切りは日本時間の0時。
 * 1回のAPI呼び出しの中で、答えた日の一覧を何度も取らないよう、結果をインスタンスに覚える
 */
class Analytics
{
    public const TIMEZONE = 'Asia/Tokyo';

    /** @var array<int, list<string>>|null */
    private ?array $activeDays = null;

    /** 日本時間の日付を取るSQLの式 */
    public static function jst(string $column): string
    {
        return "DATE(CONVERT_TZ({$column}, '+00:00', '+09:00'))";
    }

    /** 日本時間の今日(Y-m-d) */
    public function today(): string
    {
        return Garden::today();
    }

    /** 日本時間の $from の0時と、$to(省略時は $from)の次の日の0時を、世界標準時のDBの文字にする */
    public static function utcRange(string $from, ?string $to = null): array
    {
        $start = Carbon::parse($from, self::TIMEZONE)->startOfDay()->utc();
        $end = Carbon::parse($to ?? $from, self::TIMEZONE)->startOfDay()->addDay()->utc();

        return [$start->toDateTimeString(), $end->toDateTimeString()];
    }

    /** 答えの行(体力)。解いた直後のやり直しは記録されないので入らない */
    public function answers(): Builder
    {
        return DB::table('profile_currency_ledger')
            ->where('type', 'hp')
            ->whereIn('reason', ['answer_correct', 'answer_wrong']);
    }

    /**
     * プレイヤーの番号 => 答えた日(日本時間・古い順)の一覧。
     * 人数が増えて重くなったら、SQLでの集計や集計の表に切り替える
     *
     * @return array<int, list<string>>
     */
    public function activeDays(): array
    {
        return $this->activeDays ??= $this->answers()
            ->selectRaw('user_profile_id, '.self::jst('created_at').' as d')
            ->distinct()
            ->orderBy('d')
            ->get()
            ->groupBy('user_profile_id')
            ->map(fn ($rows) => $rows->pluck('d')->all())
            ->all();
    }

    /** 1日分を数える(日本時間の日付) */
    public function aggregateDay(string $date): array
    {
        [$start, $end] = self::utcRange($date);

        $answers = $this->answers()->where('created_at', '>=', $start)->where('created_at', '<', $end)
            ->selectRaw("count(*) as answers, coalesce(sum(reason = 'answer_correct'), 0) as correct, count(distinct user_profile_id) as active")
            ->first();

        $play = DB::table('profile_play_days')->where('played_on', $date)
            ->selectRaw('coalesce(sum(seconds >= 10), 0) as opened, coalesce(sum(seconds), 0) as seconds')
            ->first();

        return [
            'new_accounts' => User::query()->where('created_at', '>=', $start)->where('created_at', '<', $end)->count(),
            'new_players' => UserProfile::query()->where('created_at', '>=', $start)->where('created_at', '<', $end)->count(),
            'active_players' => (int) $answers->active,
            'opened_players' => (int) $play->opened,
            'answers' => (int) $answers->answers,
            'correct_answers' => (int) $answers->correct,
            'play_seconds' => (int) $play->seconds,
        ];
    }

    /**
     * 日ごとの一覧(古い順に全日)。集計の表に行がある日は表を使い、無い日(今日など)は、そのつど数えて補う(保存はしない)
     *
     * @return list<array<string, mixed>>
     */
    public function daily(string $from, string $to): array
    {
        $saved = AnalyticsDaily::query()->whereBetween('date', [$from, $to])->get()->keyBy(fn ($row) => $row->date->toDateString());

        $rows = [];
        for ($day = Carbon::parse($from); $day->toDateString() <= $to; $day->addDay()) {
            $date = $day->toDateString();
            $values = $saved->has($date)
                ? $saved[$date]->only(['new_accounts', 'new_players', 'active_players', 'opened_players', 'answers', 'correct_answers', 'play_seconds'])
                : $this->aggregateDay($date);

            $rows[] = ['date' => $date] + $values + [
                'accuracy' => $values['answers'] > 0 ? round($values['correct_answers'] / $values['answers'], 4) : null,
                'play_minutes' => (int) round($values['play_seconds'] / 60),
            ];
        }

        return $rows;
    }

    /** 概要のカード */
    public function summary(): array
    {
        $today = $this->today();
        $active = function (int $days) use ($today) {
            [$start, $end] = self::utcRange(Carbon::parse($today)->subDays($days - 1)->toDateString(), $today);

            return $this->answers()->where('created_at', '>=', $start)->where('created_at', '<', $end)->distinct()->count('user_profile_id');
        };
        $todayRow = $this->aggregateDay($today);

        return [
            'accounts' => User::query()->count(),
            'players' => UserProfile::query()->count(),
            'active_today' => $active(1),
            'active_7d' => $active(7),
            'active_30d' => $active(30),
            'answers_today' => $todayRow['answers'],
            'play_minutes_today' => (int) round($todayRow['play_seconds'] / 60),
        ];
    }

    /**
     * 1日後・3日後・7日後に、また答えたプレイヤーの割合。初めて答えた日から、その日数が経ったプレイヤーだけを母数にする。
     * 期間の選択には関係なく、全プレイヤーで数える
     *
     * @return array<string, array{rate: ?float, base: int}>
     */
    public function retention(): array
    {
        $today = $this->today();
        $result = [];

        foreach ([1, 3, 7] as $n) {
            $base = 0;
            $hit = 0;

            foreach ($this->activeDays() as $days) {
                $target = Carbon::parse($days[0])->addDays($n)->toDateString();
                if ($target > $today) {
                    continue;
                }
                $base++;
                $hit += in_array($target, $days, true) ? 1 : 0;
            }

            $result["d{$n}"] = ['rate' => $base > 0 ? round($hit / $base, 4) : null, 'base' => $base];
        }

        return $result;
    }

    /**
     * 登録した週(プレイヤーを作った週。日本時間の月曜始まり)ごとの続き具合。weeks は、登録した週・1週後〜4週後に、
     * そのプレイヤーのうち遊んだ人の割合。まだ始まっていない週は null(始まった週は、そこまでのデータで数える)。
     * 答えたことのないプレイヤーも、人数に入れる
     *
     * @return list<array{week: string, players: int, weeks: list<?float>}>
     */
    public function cohorts(int $weeks = 8): array
    {
        $thisWeek = Carbon::now(self::TIMEZONE)->startOfWeek(Carbon::MONDAY);
        $firstWeek = $thisWeek->copy()->subWeeks($weeks - 1);
        $days = $this->activeDays();

        $byWeek = DB::table('user_profiles')
            ->where('created_at', '>=', $firstWeek->copy()->utc()->toDateTimeString())
            ->get(['id', 'created_at'])
            ->groupBy(fn ($player) => Carbon::parse($player->created_at, 'UTC')->setTimezone(self::TIMEZONE)->startOfWeek(Carbon::MONDAY)->toDateString());

        $result = [];
        foreach ($byWeek->sortKeys() as $week => $players) {
            $cohortStart = Carbon::parse($week, self::TIMEZONE);
            $rates = [];

            foreach (range(0, 4) as $k) {
                $start = $cohortStart->copy()->addWeeks($k);
                if ($start->greaterThan($thisWeek)) {
                    $rates[] = null;

                    continue;
                }
                [$from, $to] = [$start->toDateString(), $start->copy()->addDays(6)->toDateString()];
                $hit = $players->filter(
                    fn ($player) => collect($days[$player->id] ?? [])->contains(fn ($d) => $d >= $from && $d <= $to),
                )->count();
                $rates[] = round($hit / $players->count(), 4);
            }

            $result[] = ['week' => $week, 'players' => $players->count(), 'weeks' => $rates];
        }

        return $result;
    }
}
