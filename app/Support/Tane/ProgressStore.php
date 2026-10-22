<?php

namespace App\Support\Tane;

use App\Models\TanePlayDay;
use App\Models\TaneProfileState;
use App\Models\TaneStageRecord;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Tane の記録と、3つの表(tane_stage_records・tane_profile_states・tane_play_days)の行き来 */
class ProgressStore
{
    /** 日の境目に使うタイムゾーン(Spra Go のストリークと同じ) */
    private const TIMEZONE = 'Asia/Tokyo';

    /** GET で返す、あそんだ日の日数(今日をふくむ) */
    private const PLAY_DAYS_SHOWN = 8;

    /** 表の中身を、Tane と Spra Go の約束の形にする */
    public static function load(UserProfile $profile): array
    {
        $progress = ProgressMerge::empty();

        foreach (TaneStageRecord::where('user_profile_id', $profile->id)->get() as $row) {
            $progress['stars'][$row->stage_id] = $row->stars;
            if ($row->best_score !== null) {
                $progress['best'][$row->stage_id] = $row->best_score;
            }
        }
        ksort($progress['stars'], SORT_STRING);
        ksort($progress['best'], SORT_STRING);

        $state = TaneProfileState::where('user_profile_id', $profile->id)->first();
        if ($state !== null) {
            $progress['challengeBest'] = $state->challenge_best ?? [];
            $progress['endless'] = $state->endless_best ?? [];
            $progress['garden'] = $state->garden ?? [];
            $progress['gardenChangedAt'] = $state->garden_changed_at?->toAtomString();
            $progress['lastModeId'] = $state->last_mode;
            $progress['lastModeAt'] = $state->last_mode_at?->toAtomString();
        }

        return $progress;
    }

    /** 合わせた結果を表に書く(1つのトランザクション。表にあって結果に無いステージは消す) */
    public static function save(UserProfile $profile, array $merged): void
    {
        DB::transaction(function () use ($profile, $merged) {
            $now = now();
            $rows = [];
            foreach ($merged['stars'] as $stageId => $stars) {
                $rows[] = [
                    'user_profile_id' => $profile->id,
                    'stage_id' => $stageId,
                    'stars' => $stars,
                    'best_score' => $merged['best'][$stageId] ?? null,
                    'updated_at' => $now,
                ];
            }
            if ($rows !== []) {
                TaneStageRecord::upsert($rows, ['user_profile_id', 'stage_id'], ['stars', 'best_score', 'updated_at']);
            }
            TaneStageRecord::where('user_profile_id', $profile->id)->whereNotIn('stage_id', array_keys($merged['stars']))->delete();

            TaneProfileState::updateOrCreate(['user_profile_id' => $profile->id], [
                'challenge_best' => $merged['challengeBest'],
                'endless_best' => $merged['endless'],
                'garden' => $merged['garden'],
                'garden_changed_at' => $merged['gardenChangedAt'] === null ? null : self::toAppTime($merged['gardenChangedAt']),
                'last_mode' => $merged['lastModeId'],
                'last_mode_at' => $merged['lastModeAt'] === null ? null : self::toAppTime($merged['lastModeAt']),
            ]);
        });
    }

    /**
     * あそんだ日を足す。日本時間の今日より未来・play_days_window 日より前、形のちがう日付は捨てる。
     * 同じ日を重ねて送っても1日1行
     */
    public static function addPlayDays(UserProfile $profile, array $days): void
    {
        $today = Carbon::now(self::TIMEZONE)->startOfDay();
        $oldest = $today->copy()->subDays(config('tane.play_days_window'));

        $valid = [];
        foreach ($days as $day) {
            $date = self::parseDay($day);
            if ($date !== null && $date->between($oldest, $today)) {
                $valid[$date->toDateString()] = ['user_profile_id' => $profile->id, 'played_on' => $date->toDateString()];
            }
        }
        if ($valid !== []) {
            TanePlayDay::query()->insertOrIgnore(array_values($valid));
        }
    }

    /** @return list<string> 直近の、あそんだ日(新しい順) */
    public static function recentPlayDays(UserProfile $profile): array
    {
        $since = Carbon::now(self::TIMEZONE)->startOfDay()->subDays(self::PLAY_DAYS_SHOWN - 1)->toDateString();

        return TanePlayDay::where('user_profile_id', $profile->id)
            ->where('played_on', '>=', $since)
            ->orderByDesc('played_on')
            ->get()
            ->map(fn (TanePlayDay $row) => $row->played_on->toDateString())
            ->all();
    }

    /** GET と PUT が返す形 */
    public static function payload(UserProfile $profile): array
    {
        return [
            'progress' => ProgressMerge::forJson(self::load($profile)),
            'playDays' => self::recentPlayDays($profile),
        ];
    }

    /** 日時を、アプリのタイムゾーンに直す(Eloquent は時刻をそのままの表記で書くので、+09:00 のまま渡すと9時間ずれる) */
    private static function toAppTime(string $iso): Carbon
    {
        return Carbon::parse($iso)->setTimezone(config('app.timezone'));
    }

    private static function parseDay(mixed $day): ?Carbon
    {
        if (! is_string($day) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $day)) {
            return null;
        }
        $date = Carbon::createFromFormat('Y-m-d', $day, self::TIMEZONE);

        // 2026-13-40 のような、存在しない日付を弾く(Carbon は繰り上げてしまう)
        return $date !== false && $date->toDateString() === $day ? $date->startOfDay() : null;
    }
}
