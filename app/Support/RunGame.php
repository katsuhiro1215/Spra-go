<?php

namespace App\Support;

use App\Models\ProfileGamePlay;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * スプルラン(docs/design/2026-10-22-spru-run-design.md 14章)。クイズのミニゲーム(CatchGame)とは分ける。
 * 練習はサーバーに送らない。ここは本番だけ: 1日の回数・タネの財布・点数をサーバーで計算し直す
 */
class RunGame
{
    public const GAME = 'spru_run';

    /** 今日の本番の数(終えていない回、使った回も数える。10秒以内にやめた回は消えているので数えない) */
    public static function usedToday(UserProfile $profile): int
    {
        return $profile->gamePlays()->where('game', self::GAME)->where('played_on', Garden::today())->count();
    }

    public static function playsLeft(UserProfile $profile): int
    {
        return max(0, (int) config('games.spru_run.daily_real_plays') - self::usedToday($profile));
    }

    /** その日の1回目のボーナスが、まだ残っているか(今日、終えた本番がまだない) */
    public static function bonusAvailable(UserProfile $profile): bool
    {
        return ! $profile->gamePlays()->where('game', self::GAME)->where('played_on', Garden::today())->whereNotNull('finished_at')->exists();
    }

    /** 入口の情報(終えた・やめたあとにも返す) */
    public static function summary(UserProfile $profile): array
    {
        $catalog = config('games.spru_run.catalog');
        $endsOn = $catalog['ends_on'] ?? null;

        return [
            'best_score' => $profile->gamePlays()->where('game', self::GAME)->whereNotNull('finished_at')->max('score'),
            'real_plays_left' => self::playsLeft($profile),
            'real_plays_per_day' => (int) config('games.spru_run.daily_real_plays'),
            'seeds' => (int) $profile->fresh()->run_seeds,
            'bonus_available' => self::bonusAvailable($profile),
            'bonus' => (int) config('games.spru_run.first_play_bonus'),
            'limited' => $endsOn !== null,
            'ends_on' => $endsOn,
            'days_left' => $endsOn === null ? null : max(0, Carbon::parse(Garden::today())->diffInDays(Carbon::parse($endsOn))) + 1,
        ];
    }

    /** 本番を始める(1回ぶん使う)。種と画面の高さを回に残す */
    public static function start(UserProfile $profile, int $ceiling): array
    {
        abort_if(self::playsLeft($profile) <= 0, 422, 'きょうの本番はおしまい。あしたまた来てね。');

        $seed = random_int(1, 2_000_000_000);
        $play = $profile->gamePlays()->create([
            'game' => self::GAME,
            'difficulty' => config('games.spru_run.difficulty'),
            'question_ids' => [],
            'played_on' => Garden::today(),
            'started_at' => now(),
            'run_seed' => $seed,
            'ceiling' => $ceiling,
        ]);

        return ['play_id' => $play->id, 'seed' => $seed, 'ceiling' => $ceiling] + self::summary($profile);
    }

    /** 始めて abandon_free_ms 以内のやめる: 回を消して、のこりを戻す */
    public static function abandon(ProfileGamePlay $play): array
    {
        abort_if($play->finished_at !== null, 409, 'この回はもう終わっています。');
        abort_if(self::elapsedMs($play) > config('games.spru_run.abandon_free_ms'), 422, '始めてから時間がたっているので、「おわる」で終えてね。');
        $profile = $play->profile;
        $play->delete();

        return self::summary($profile);
    }

    /** 終える。距離・タネは、その時間で出せる量の中に入っているものだけ受け付ける */
    public static function finish(ProfileGamePlay $play, int $distanceM, int $seedValue): array
    {
        abort_if($play->finished_at !== null, 409, 'この回はもう終わっています。');
        $elapsed = self::elapsedMs($play);
        abort_if($elapsed > config('games.spru_run.unfinished_expire_ms'), 422, 'この回は時間が切れました。');
        abort_if($distanceM > self::maxDistanceM($elapsed) || $seedValue > self::maxSeedValue($elapsed), 422, 'この記録は受け付けられません。');

        $profile = $play->profile;
        $score = $distanceM * config('games.spru_run.score.distance') + $seedValue * config('games.spru_run.score.seed');
        $earned = min($seedValue, (int) config('games.spru_run.max_seeds_per_play'));
        $bonus = self::bonusAvailable($profile) ? (int) config('games.spru_run.first_play_bonus') : 0;

        DB::transaction(function () use ($play, $profile, $distanceM, $seedValue, $score, $earned, $bonus) {
            $play->update([
                'finished_at' => now(), 'distance_m' => $distanceM, 'seed_value' => $seedValue,
                'score' => $score, 'seeds_earned' => $earned + $bonus, 'rewarded' => true,
            ]);
            $profile->increment('run_seeds', $earned + $bonus);
        });

        return ['score' => $score, 'distance_m' => $distanceM, 'seed_value' => $seedValue, 'seeds_earned' => $earned + $bonus, 'bonus' => $bonus,
            'rank' => Ranking::rankOf($profile, self::GAME, config('games.spru_run.difficulty'), 'family', 'all')] + self::summary($profile);
    }

    private static function elapsedMs(ProfileGamePlay $play): int
    {
        return (int) ($play->started_at->diffInMilliseconds(now(), true));
    }

    /** その時間で走れる、いちばん長い距離(m)。速さは、始めから段々上がり、上限で止まる。少しの余裕つき */
    public static function maxDistanceM(int $elapsedMs): int
    {
        $speed = config('games.spru_run.speed');
        $px = 0.0;
        for ($t = 0; $t < $elapsedMs; $t += 100) {
            $v = min($speed['max'], $speed['start'] + $speed['step'] * intdiv($t, $speed['every_ms']));
            $px += $v * min(100, $elapsedMs - $t) / 1000;
        }

        return (int) ceil($px / $speed['px_per_m'] * 1.05) + 5;
    }

    /** その時間で集められる、いちばん多いタネ(数え方の合計) */
    public static function maxSeedValue(int $elapsedMs): int
    {
        return (int) ceil(config('games.spru_run.max_seed_value_per_sec') * $elapsedMs / 1000) + 20;
    }
}
