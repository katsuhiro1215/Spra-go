<?php

namespace App\Support\Prefecture;

use App\Models\ProfileStageProgress;
use App\Models\ProfileTitle;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * 県マスター(docs/design/2026-10-06-prefecture-master-design.md 2・4章)。
 * 「◯◯はかせ」(一般の上級ボス)を持ち、かつ地名の上級ボスを全問正解したときに、「◯◯マスター」を渡す。順番は問わない
 */
class PrefectureMaster
{
    /** 県の上級のボス(一般または地名)なら、その県の名前。そうでなければ null */
    public static function prefectureOf(Stage $stage): ?string
    {
        if (! $stage->is_boss || $stage->difficulty !== '上級') {
            return null;
        }
        $name = $stage->category?->name;
        foreach (PrefectureCatalog::all() as $prefecture) {
            if ($name === $prefecture['name'] || $name === PlaceNameQuizPlanner::courseName($prefecture['name'])) {
                return $prefecture['name'];
            }
        }

        return null;
    }

    /** 条件がそろい、まだ持っていなければ、マスターの称号を付けて返す */
    public static function grantIfReady(UserProfile $profile, string $prefectureName): ?ProfileTitle
    {
        $hasHakase = ProfileTitle::query()->where('user_profile_id', $profile->id)->where('title', PrefectureCatalog::title($prefectureName))->exists();
        if (! $hasHakase) {
            return null;
        }

        $place = Stage::query()
            ->where('difficulty', '上級')
            ->where('is_boss', true)
            ->whereHas('category', fn ($query) => $query->where('name', PlaceNameQuizPlanner::courseName($prefectureName)))
            ->first();
        if (! $place) {
            return null;
        }

        $best = ProfileStageProgress::query()->where('user_profile_id', $profile->id)->where('stage_id', $place->id)->value('best_score') ?? 0;
        if ($best < $place->playCount()) {
            return null;
        }

        $title = ProfileTitle::query()->firstOrCreate(
            ['user_profile_id' => $profile->id, 'title' => PrefectureCatalog::masterTitle($prefectureName)],
            ['source_stage_id' => $place->id, 'unlocked_at' => now()],
        );

        return $title->wasRecentlyCreated ? $title : null;
    }
}
