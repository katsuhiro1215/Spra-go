<?php

namespace App\Support\Prefecture;

use App\Models\Category;

/**
 * パスポートの「日本のバッジ」(docs/design/2026-10-06-passport-prefecture-badges-design.md 3章)。
 * 47県のバッジを、地方の順(地方の中は、県のデータ表の順)に返す。
 * earned は、称号「◯◯はかせ」を持っているか。course_id は、その県のコース(コース親の地方カテゴリーの下の、県名のカテゴリー)の番号
 */
class PrefectureBadges
{
    /**
     * @param  array<int, string>  $titles  今のプレイヤーがもらった称号
     * @return list<array{key: string, name: string, region: string, region_name: string, badge: string, earned: bool, course_id: ?int}>
     */
    public static function list(array $titles): array
    {
        $catalog = PrefectureCatalog::all();

        $courseIds = Category::query()
            ->whereIn('name', array_column($catalog, 'name'))
            ->whereHas('parent', fn ($query) => $query->where('is_course_group', true))
            ->pluck('id', 'name');

        $badges = [];
        foreach (PrefectureCatalog::REGIONS as $regionKey => $regionName) {
            foreach ($catalog as $prefecture) {
                if ($prefecture['region'] !== $regionKey) {
                    continue;
                }
                $badges[] = [
                    'key' => $prefecture['key'],
                    'name' => $prefecture['name'],
                    'region' => $regionKey,
                    'region_name' => $regionName,
                    'badge' => PrefectureCatalog::badgeForName($prefecture['name']),
                    'earned' => in_array(PrefectureCatalog::title($prefecture['name']), $titles, true),
                    'course_id' => $courseIds[$prefecture['name']] ?? null,
                ];
            }
        }

        return $badges;
    }
}
