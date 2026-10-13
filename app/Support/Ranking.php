<?php

namespace App\Support;

use App\Models\ProfileGamePlay;
use App\Models\UserProfile;
use App\Models\UserSchema;
use Illuminate\Support\Carbon;

/**
 * ミニゲームのランキング(docs/design/2026-10-13-ranking-design.md)。
 * 終えた回から、プロフィールごとのベストを、その場で集計する。点数は高い順、パズルの時間は短い順
 */
class Ranking
{
    public const TOP = 10;

    /** みんなのランキングの名前: 色 + どうぶつ */
    private const COLORS = ['あかい', 'あおい', 'きいろい', 'みどりの', 'むらさきの', 'ももいろの', 'しろい', 'おれんじの', 'みずいろの', 'ちゃいろの'];

    private const ANIMALS = ['うさぎ', 'くま', 'ことり', 'ねこ', 'いぬ', 'ぞう', 'ぺんぎん', 'きつね', 'りす', 'ぱんだ', 'らいおん', 'かめ'];

    /** パズルの1ピースを動かすのに、最低かかるはずの時間(ミリ秒)。これより短い記録は載せない */
    public const MIN_MS_PER_PIECE = 300;

    public static function isTimeGame(string $game): bool
    {
        return isset(config("games.{$game}.difficulties")['初級']['grid']);
    }

    /**
     * 並びと、自分の順位。みんな(public)のときは、名前・番号・レベルを出さない
     *
     * @return array{rows: list<array>, me: array{rank: int, value: int}|null}
     */
    public static function board(UserProfile $viewer, string $game, string $difficulty, string $scope, string $period): array
    {
        $time = self::isTimeGame($game);
        $query = ProfileGamePlay::query()
            ->where('game', $game)
            ->where('difficulty', $difficulty)
            ->whereNotNull('finished_at');

        if ($time) {
            $query->where('time_verified', true)->whereNotNull('elapsed_ms');
        }
        if ($period === 'week') {
            $query->where('played_on', '>=', self::weekStart(Garden::today()));
        }

        $profileIds = UserProfile::query()
            ->when(
                $scope === 'family',
                fn ($q) => $q->where('user_schema_id', $viewer->user_schema_id),
                fn ($q) => $q->whereIn('user_schema_id', UserSchema::query()->where('ranking_public', true)->select('id')),
            )
            ->pluck('id');
        $query->whereIn('user_profile_id', $profileIds);

        $column = $time ? 'elapsed_ms' : 'score';
        $best = [];
        foreach ($query->get(['user_profile_id', $column, 'finished_at']) as $play) {
            $value = (int) $play->{$column};
            $at = $play->finished_at->getTimestamp();
            $current = $best[$play->user_profile_id] ?? null;
            $better = $current === null || ($time ? $value < $current['value'] : $value > $current['value']);
            if ($better || ($value === $current['value'] && $at < $current['at'])) {
                $best[$play->user_profile_id] = ['value' => $value, 'at' => $at];
            }
        }

        $ordered = collect($best)->map(fn (array $row, int $id) => $row + ['id' => $id])->sort(
            fn (array $a, array $b) => ($time ? $a['value'] <=> $b['value'] : $b['value'] <=> $a['value']) ?: $a['at'] <=> $b['at'],
        )->values();

        // 同じ値は同じ順位。次の順位は詰めない
        $ranked = [];
        foreach ($ordered as $i => $row) {
            $rank = $i > 0 && $ranked[$i - 1]['value'] === $row['value'] ? $ranked[$i - 1]['rank'] : $i + 1;
            $ranked[] = $row + ['rank' => $rank];
        }

        $top = array_slice($ranked, 0, self::TOP);
        $profiles = UserProfile::query()->whereIn('id', array_column($top, 'id'))->get()->keyBy('id');
        $rows = array_map(function (array $row) use ($profiles, $viewer, $scope) {
            $profile = $profiles[$row['id']];

            return [
                'rank' => $row['rank'],
                ($scope === 'family' ? 'name' : 'nickname') => $scope === 'family' ? $profile->name : self::nickname($profile),
                'avatar' => $profile->avatar,
                'value' => $row['value'],
                'is_me' => $row['id'] === $viewer->id,
            ];
        }, $top);

        $me = collect($ranked)->firstWhere('id', $viewer->id);
        $inTop = collect($top)->contains(fn (array $row) => $row['id'] === $viewer->id);

        return [
            'rows' => $rows,
            'me' => $me !== null && ! $inTop ? ['rank' => $me['rank'], 'value' => $me['value']] : null,
        ];
    }

    /** 自分の順位(記録がなければ null) */
    public static function rankOf(UserProfile $viewer, string $game, string $difficulty, string $scope, string $period = 'week'): ?int
    {
        $board = self::board($viewer, $game, $difficulty, $scope, $period);
        $mine = collect($board['rows'])->firstWhere('is_me', true);

        return $mine['rank'] ?? $board['me']['rank'] ?? null;
    }

    /** その日を含む週の月曜(Y-m-d) */
    public static function weekStart(string $today): string
    {
        return Carbon::parse($today)->startOfWeek(Carbon::MONDAY)->toDateString();
    }

    /** 付け直したものがあればそれ。なければ、プロフィールの番号から決まる(同じ人はいつも同じ) */
    public static function nickname(UserProfile $profile): string
    {
        return $profile->ranking_nickname ?? self::generate($profile->id);
    }

    public static function generate(int $seed): string
    {
        return self::COLORS[$seed % count(self::COLORS)].' '.self::ANIMALS[intdiv($seed, count(self::COLORS)) % count(self::ANIMALS)];
    }

    public static function reroll(UserProfile $profile): string
    {
        $current = self::nickname($profile);
        do {
            $next = self::COLORS[array_rand(self::COLORS)].' '.self::ANIMALS[array_rand(self::ANIMALS)];
        } while ($next === $current);
        $profile->update(['ranking_nickname' => $next]);

        return $next;
    }

    /**
     * パズルの時間が、サーバーが測った時間と合うか。始めてから終えるまでより長ければ(通信の誤差10%＋2秒を許す)、
     * または 1ピースあたり MIN_MS_PER_PIECE より短ければ、ランキングに載せない
     */
    public static function timeVerified(ProfileGamePlay $play, ?int $elapsedMs, string $game): bool
    {
        if ($elapsedMs === null) {
            return false;
        }
        $settings = config("games.{$game}.difficulties")[$play->difficulty];
        $pieces = $settings['grid'][0] * $settings['grid'][1] * ($settings['question_count'] ?? config("games.{$game}.question_count"));
        $spanMs = max(0, $play->created_at->diffInMilliseconds(now(), false));

        return $elapsedMs >= $pieces * self::MIN_MS_PER_PIECE && $elapsedMs <= $spanMs * 1.1 + 2000;
    }
}
