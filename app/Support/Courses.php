<?php

namespace App\Support;

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\ProfileTitle;
use App\Models\Stage;
use App\Models\UserProfile;
use App\Support\Prefecture\PrefectureCatalog;

/**
 * コースの一覧(docs/design/2026-10-05-flag-quiz-design.md 7-3、docs/design/2026-10-05-prefecture-quiz-design.md 3-2)。
 * コース親(is_course_group)の子を、order の順に、問題のあるステージの数(total)と、今のプレイヤーがクリアした数(cleared)つきで返す。
 * 子がさらにコース親(都道府県クイズの地方)のときは、その下のコースのステージも合計に入れ、group を真にする。
 * 県のコースには、県のバッジの絵(badge)を付ける。title は、そのコースの上級のボスの称号、earned は、今のプレイヤーがその称号を持つか。
 * 鍵の国のステージは数えない(ステージ一覧の窓口と同じ決まり)
 */
class Courses
{
    /** @return list<array{id: int, name: string, cleared: int, total: int, group: bool, badge: ?string, title: ?string, earned: bool}> */
    public static function list(Category $group, ?UserProfile $profile): array
    {
        $locked = Travel::lockedCountryIds($profile);
        $children = $group->children()->get();

        // 子ごとの、その下(自分を含む)のカテゴリーのid
        $byParent = Category::query()->whereNotNull('parent_id')->get(['id', 'parent_id'])->groupBy('parent_id');
        $descendants = fn (int $id) => self::descendantIds($byParent, $id);
        $categoryIdsByChild = $children->mapWithKeys(fn (Category $child) => [$child->id => $descendants($child->id)]);

        $stagesByCategory = Stage::query()
            ->whereIn('category_id', $categoryIdsByChild->flatten()->unique())
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

        $bossTitles = Stage::query()
            ->whereIn('category_id', $children->pluck('id'))
            ->where('difficulty', '上級')
            ->where('is_boss', true)
            ->whereNotNull('title_reward')
            ->pluck('title_reward', 'category_id');

        $ownedTitles = $profile
            ? ProfileTitle::query()->where('user_profile_id', $profile->id)->pluck('title')->all()
            : [];

        return $children
            ->map(function (Category $course) use ($categoryIdsByChild, $stagesByCategory, $clearedIds, $bossTitles, $ownedTitles) {
                $stageIds = collect($categoryIdsByChild[$course->id])->flatMap(fn (int $id) => $stagesByCategory[$id] ?? [])->all();
                $title = $course->is_course_group ? null : ($bossTitles[$course->id] ?? null);

                return [
                    'id' => $course->id,
                    'name' => $course->name,
                    'cleared' => count(array_intersect($stageIds, $clearedIds)),
                    'total' => count($stageIds),
                    'group' => (bool) $course->is_course_group,
                    'badge' => $course->is_course_group ? null : PrefectureCatalog::badgeForName($course->name),
                    'title' => $title,
                    'earned' => $title !== null && in_array($title, $ownedTitles, true),
                ];
            })
            ->filter(fn (array $course) => $course['total'] > 0)
            ->values()
            ->all();
    }

    /** そのカテゴリーと、その下のカテゴリーすべてのid */
    public static function descendantIds($byParent, int $id): array
    {
        $ids = [$id];
        foreach ($byParent[$id] ?? [] as $child) {
            array_push($ids, ...self::descendantIds($byParent, $child->id));
        }

        return $ids;
    }
}
