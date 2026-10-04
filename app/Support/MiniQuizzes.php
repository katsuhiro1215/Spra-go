<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * ミニアプリのミニクイズの一覧(docs/design/2026-10-04-mini-app-tidy-design.md 3章)。
 * 大もとのカテゴリー(parent_id が空)のうち、自分のステージで問題があるものが config('quiz.mini_quiz.min_stages') 以上あるものだけ。
 * 鍵の国のステージは数えない(ステージ一覧の窓口と同じ決まり)。
 * コース親(is_course_group)は、子のカテゴリーのステージも合計に入れる(docs/design/2026-10-05-flag-quiz-design.md 3-2)
 */
class MiniQuizzes
{
    /** @return list<array{id: int, name: string, stage_count: int}> */
    public static function list(?UserProfile $profile): array
    {
        $locked = Travel::lockedCountryIds($profile);

        $counts = Stage::query()
            ->whereHas('questions')
            ->when($locked !== [], fn ($query) => $query->where(
                fn ($query) => $query->whereNull('country_id')->orWhereNotIn('country_id', $locked),
            ))
            ->groupBy('category_id')
            ->selectRaw('category_id, count(*) as total')
            ->pluck('total', 'category_id');

        $min = (int) config('quiz.mini_quiz.min_stages');

        $roots = Category::query()
            ->whereNull('parent_id')
            ->orderBy('order')
            ->orderBy('id')
            ->get();

        // コース親(is_course_group)は、子のステージも合計に入れる(docs/design/2026-10-05-flag-quiz-design.md 3-2)
        $groupIds = $roots->where('is_course_group', true)->pluck('id');
        $childrenByParent = $groupIds->isEmpty()
            ? collect()
            : Category::query()->whereIn('parent_id', $groupIds)->get(['id', 'parent_id'])->groupBy('parent_id');

        return $roots
            ->map(function (Category $category) use ($counts, $childrenByParent) {
                $total = (int) ($counts[$category->id] ?? 0);
                if ($category->is_course_group) {
                    $total += ($childrenByParent[$category->id] ?? collect())->sum(fn (Category $child) => (int) ($counts[$child->id] ?? 0));
                }

                return ['category' => $category, 'total' => $total];
            })
            ->filter(fn (array $row) => $row['total'] >= $min)
            ->map(fn (array $row) => [
                'id' => $row['category']->id,
                'name' => $row['category']->name,
                'stage_count' => $row['total'],
            ])
            ->values()
            ->all();
    }
}
