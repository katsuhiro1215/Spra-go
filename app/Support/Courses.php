<?php

namespace App\Support;

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * コースの一覧(docs/design/2026-10-05-flag-quiz-design.md 7-3)。
 * コース親(is_course_group)の子を、order の順に、問題のあるステージの数(total)と、今のプレイヤーがクリアした数(cleared)つきで返す。
 * 鍵の国のステージは数えない(ステージ一覧の窓口と同じ決まり)
 */
class Courses
{
    /** @return list<array{id: int, name: string, cleared: int, total: int}> */
    public static function list(Category $group, ?UserProfile $profile): array
    {
        $locked = Travel::lockedCountryIds($profile);
        $children = $group->children()->get();

        $stageIdsByCourse = Stage::query()
            ->whereIn('category_id', $children->pluck('id'))
            ->whereHas('questions')
            ->when($locked !== [], fn ($query) => $query->where(
                fn ($query) => $query->whereNull('country_id')->orWhereNotIn('country_id', $locked),
            ))
            ->get(['id', 'category_id'])
            ->groupBy('category_id')
            ->map(fn ($stages) => $stages->pluck('id')->all());

        $clearedIds = $profile
            ? ProfileStageProgress::query()
                ->where('user_profile_id', $profile->id)
                ->whereNotNull('cleared_at')
                ->pluck('stage_id')
                ->all()
            : [];

        return $children
            ->map(function (Category $course) use ($stageIdsByCourse, $clearedIds) {
                $stageIds = $stageIdsByCourse[$course->id] ?? [];

                return [
                    'id' => $course->id,
                    'name' => $course->name,
                    'cleared' => count(array_intersect($stageIds, $clearedIds)),
                    'total' => count($stageIds),
                ];
            })
            ->filter(fn (array $course) => $course['total'] > 0)
            ->values()
            ->all();
    }
}
