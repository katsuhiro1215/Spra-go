<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * ミニアプリのミニクイズの一覧(docs/design/2026-10-04-mini-app-tidy-design.md 3章)。
 * 大もとのカテゴリー(parent_id が空)のうち、自分のステージで問題があるものが config('quiz.mini_quiz.min_stages') 以上あるものだけ。
 * 鍵の国のステージは数えない(ステージ一覧の窓口と同じ決まり)
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

        return Category::query()
            ->whereNull('parent_id')
            ->orderBy('order')
            ->orderBy('id')
            ->get()
            ->filter(fn (Category $category) => (int) ($counts[$category->id] ?? 0) >= $min)
            ->map(fn (Category $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'stage_count' => (int) $counts[$category->id],
            ])
            ->values()
            ->all();
    }
}
