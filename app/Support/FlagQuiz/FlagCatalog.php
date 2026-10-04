<?php

namespace App\Support\FlagQuiz;

use InvalidArgumentException;

/**
 * 国旗クイズの国の一覧(docs/design/2026-10-05-flag-quiz-design.md 5章)。
 * database/data/flag-countries.php を読み、似ている国(similar)を組から作る
 */
class FlagCatalog
{
    /** 大陸のキー => 日本語名 */
    public const CONTINENTS = [
        'asia' => 'アジア',
        'europe' => 'ヨーロッパ',
        'africa' => 'アフリカ',
        'north-america' => '北アメリカ',
        'south-america' => '南アメリカ',
        'oceania' => 'オセアニア',
    ];

    /** コースのキー => 日本語名。大陸6つと、世界ぜんぶ(最難関) */
    public const COURSES = self::CONTINENTS + ['world' => '世界ぜんぶ'];

    /** @return array<string, array{key: string, name: string, continent: string, tier: int, similar: list<string>}> */
    public static function all(): array
    {
        $data = require base_path('database/data/flag-countries.php');

        $countries = [];
        foreach ($data['countries'] as [$key, $name, $continent, $tier]) {
            $countries[$key] = ['key' => $key, 'name' => $name, 'continent' => $continent, 'tier' => $tier, 'similar' => []];
        }

        foreach ($data['similar_groups'] as $group) {
            foreach ($group as $key) {
                if (! isset($countries[$key])) {
                    throw new InvalidArgumentException("似ている国の組に、一覧にない国がある: {$key}");
                }
                foreach ($group as $other) {
                    if ($other !== $key && ! in_array($other, $countries[$key]['similar'], true)) {
                        $countries[$key]['similar'][] = $other;
                    }
                }
            }
        }

        return $countries;
    }
}
