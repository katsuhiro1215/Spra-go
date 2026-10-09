<?php

namespace App\Support;

use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/**
 * ミニゲームの小出し(docs/design/2026-10-09-minigame-rollout-design.md)。
 * 出す日・季節・NEW・今週のゲームを決める。設定は config('games.{ゲーム}.catalog') と config('games.rollout')
 */
class GameRollout
{
    /** @var array<string, string> 画面・APIの名前(パス) => ゲームの名前。一覧の順番もこの順 */
    public const PATHS = [
        'catch' => CatchGame::GAME,
        'flag-catch' => CatchGame::FLAG_GAME,
        'space-trip' => CatchGame::SPACE_GAME,
    ];

    /**
     * 今日出ているゲーム(出す日が来ていて、季節の中)
     *
     * @return list<string>
     */
    public static function available(?string $today = null): array
    {
        $today ??= Garden::today();

        return array_values(array_filter(
            self::PATHS,
            fn (string $game) => self::isAvailable($game, $today),
        ));
    }

    public static function assertAvailable(string $game): void
    {
        abort_unless(in_array($game, self::available(), true), 404);
    }

    /** 今週のゲーム。季節のゲームが出ていればそのゲーム。なければ、季節でないゲームを週ごとに順に選ぶ */
    public static function featured(?string $today = null): ?string
    {
        $today ??= Garden::today();
        $available = self::available($today);

        $seasonal = array_values(array_filter($available, fn (string $game) => self::catalog($game)['season'] !== null));
        if ($seasonal !== []) {
            return $seasonal[0];
        }
        if ($available === []) {
            return null;
        }

        $date = Carbon::parse($today);

        return $available[($date->isoWeekYear() * 53 + $date->isoWeek()) % count($available)];
    }

    /** 出す日から new_days 日のあいだ(季節のゲームは期間のあいだ)、その子がまだ遊んでいなければ NEW */
    public static function isNew(UserProfile $profile, string $game, ?string $today = null): bool
    {
        $today ??= Garden::today();
        $catalog = self::catalog($game);

        if ($catalog['released_on'] === null && $catalog['season'] === null) {
            return false;
        }
        if ($catalog['released_on'] !== null
            && Carbon::parse($catalog['released_on'])->diffInDays(Carbon::parse($today)) >= config('games.rollout.new_days')) {
            return false;
        }

        return ! $profile->gamePlays()->where('game', $game)->exists();
    }

    /** ごほうびの倍率(今週のゲームは featured_multiplier、ほかは1) */
    public static function multiplier(string $game): float
    {
        return $game === self::featured() ? (float) config('games.rollout.featured_multiplier') : 1.0;
    }

    /** @return list<array{key: string, new: bool, featured: bool, seasonal: bool}> */
    public static function list(UserProfile $profile): array
    {
        $today = Garden::today();
        $featured = self::featured($today);
        $items = [];

        foreach (self::PATHS as $key => $game) {
            if (! self::isAvailable($game, $today)) {
                continue;
            }
            $items[] = [
                'key' => $key,
                'new' => self::isNew($profile, $game, $today),
                'featured' => $game === $featured,
                'seasonal' => self::catalog($game)['season'] !== null,
            ];
        }

        return $items;
    }

    private static function isAvailable(string $game, string $today): bool
    {
        $catalog = self::catalog($game);
        if ($catalog['released_on'] !== null && $today < $catalog['released_on']) {
            return false;
        }

        return $catalog['season'] === null || self::inSeason($catalog['season'], substr($today, 5));
    }

    /** 毎年の期間('MM-DD' 〜 'MM-DD'、両端を含む。12-20〜01-05 のような年またぎも) */
    private static function inSeason(array $season, string $monthDay): bool
    {
        ['from' => $from, 'until' => $until] = $season;

        return $from <= $until
            ? ($monthDay >= $from && $monthDay <= $until)
            : ($monthDay >= $from || $monthDay <= $until);
    }

    /** @return array{released_on: ?string, season: ?array{from: string, until: string}} */
    private static function catalog(string $game): array
    {
        return (config("games.{$game}.catalog") ?? []) + ['released_on' => null, 'season' => null];
    }
}
