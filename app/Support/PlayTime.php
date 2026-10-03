<?php

namespace App\Support;

use App\Models\ProfilePlayDay;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/**
 * 遊んだ時間の記録(docs/design/2026-10-03-analytics-design.md 5章)。プレイヤーと1日ごとの合計秒数だけを持つ。
 * 増やす秒数は、送られた秒数・前回から経った秒数・60秒のうち、いちばん小さいもの(連続して送られても、
 * 時計がずれても、実際より多くは増えない)。最初の送信は30秒まで
 */
class PlayTime
{
    private const MAX_BEAT = 60;

    private const FIRST_BEAT = 30;

    public static function record(UserProfile $profile, int $seconds): int
    {
        $now = Carbon::now();

        $row = ProfilePlayDay::query()->firstOrCreate(
            ['user_profile_id' => $profile->id, 'played_on' => Garden::today()],
            ['seconds' => 0],
        );

        $elapsed = $row->last_beat_at
            ? max(0, $now->getTimestamp() - $row->last_beat_at->getTimestamp())
            : self::FIRST_BEAT;

        $row->seconds += min($seconds, $elapsed, self::MAX_BEAT);
        $row->last_beat_at = $now;
        $row->save();

        return $row->seconds;
    }
}
