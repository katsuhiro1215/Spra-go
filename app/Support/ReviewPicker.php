<?php

namespace App\Support;

use App\Models\UserProfile;

/**
 * 復習に出す問題の選び方(docs/design/2026-10-09-review-priority-design.md 4-2)。
 * 種類ごとの枠(最近まちがえた・苦手の語・あと1回で覚える)から先に選び、残りを「いちばん遅れている問題」(出す日が古い順)で埋める。
 */
class ReviewPicker
{
    /**
     * 毎日の復習の問題。枠の順に選び(枠の合計が $limit より大きいときは切り詰める)、残りを出す日が古い順で埋める
     *
     * @return list<int>
     */
    public static function daily(UserProfile $profile, ?int $limit = null): array
    {
        $limit ??= config('review.daily_size');
        $chosen = [];

        foreach (config('review.priority.daily') as $slot => $cap) {
            $chosen = [...$chosen, ...QuestionMemory::slotIds($profile, $slot, min($cap, $limit - count($chosen)), $chosen)];
        }

        return [...$chosen, ...QuestionMemory::dueIds($profile, $limit - count($chosen), $chosen)];
    }

    /**
     * ステージのおさらいの問題(`review.stage_mix` 問)。先頭の1問は優先の枠から(国を先に)、残りは出す日が古い順(国を先に)
     *
     * @param  list<int>  $excludeIds  ステージ自身の問題
     * @param  ?int  $rootCategoryId  ステージの大もとのカテゴリ。あれば、そのカテゴリの問題だけ混ぜる
     * @return list<int>
     */
    public static function stage(UserProfile $profile, array $excludeIds, ?int $countryId, ?int $rootCategoryId = null): array
    {
        $size = config('review.stage_mix');
        $first = [];
        foreach (config('review.priority.stage') as $slot) {
            $first = QuestionMemory::slotIds($profile, $slot, min(1, $size), $excludeIds, $countryId, $rootCategoryId);
            if ($first !== []) {
                break;
            }
        }

        return [
            ...$first,
            ...QuestionMemory::dueIds($profile, $size - count($first), [...$excludeIds, ...$first], $countryId, $rootCategoryId),
        ];
    }
}
