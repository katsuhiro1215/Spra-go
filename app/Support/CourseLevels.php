<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Stage;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/**
 * 国レベル・言語レベル(docs/design/2026-10-07-main-game-levels-design.md 4-5)。
 * レベル = クリアしたステージの数(1ステージ1レベル)、最大 = ステージの数。記録からその場で数える
 */
class CourseLevels
{
    /** 国のメインの道(ルート「国旗」の下の国のカテゴリー)の番号 @return list<int> */
    public static function mainCategoryIds(): array
    {
        return Category::query()
            ->whereIn('parent_id', Category::query()->where('name', config('courses.country_root'))->whereNull('parent_id')->select('id'))
            ->pluck('id')->map(fn ($id) => (int) $id)->all();
    }

    /** @return list<array{code: string, name: string, level: int, max: int}> */
    public static function forCountries(UserProfile $profile): array
    {
        $rows = Stage::query()
            ->join('countries', 'countries.id', '=', 'stages.country_id')
            ->leftJoin('profile_stage_progress as p', fn ($join) => $join->on('p.stage_id', '=', 'stages.id')->where('p.user_profile_id', $profile->id)->whereNotNull('p.cleared_at'))
            ->whereIn('stages.category_id', self::mainCategoryIds())
            ->groupBy('countries.id', 'countries.code', 'countries.name', 'countries.order')
            ->orderBy('countries.order')
            ->get(['countries.code', 'countries.name', DB::raw('COUNT(stages.id) as max'), DB::raw('COUNT(p.id) as level')]);

        return $rows->map(fn ($row) => ['code' => $row->code, 'name' => $row->name, 'level' => (int) $row->level, 'max' => (int) $row->max])->all();
    }

    /** @return list<array{key: string, name: string, level: int, max: int}> */
    public static function forLanguages(UserProfile $profile, string $homeCountry): array
    {
        $homeLanguage = config('courses.country_language')[strtolower($homeCountry)] ?? null;
        $levels = [];

        foreach (config('courses.languages') as $key => $language) {
            if ($key === $homeLanguage) {
                continue;
            }
            $row = Stage::query()
                ->join('categories', 'categories.id', '=', 'stages.category_id')
                ->leftJoin('profile_stage_progress as p', fn ($join) => $join->on('p.stage_id', '=', 'stages.id')->where('p.user_profile_id', $profile->id)->whereNotNull('p.cleared_at'))
                ->where('categories.name', $language['category'])
                ->whereNull('stages.country_id')
                ->first([DB::raw('COUNT(stages.id) as max'), DB::raw('COUNT(p.id) as level')]);
            if ($row && (int) $row->max > 0) {
                $levels[] = ['key' => $key, 'name' => $language['name'], 'level' => (int) $row->level, 'max' => (int) $row->max];
            }
        }

        return $levels;
    }
}
