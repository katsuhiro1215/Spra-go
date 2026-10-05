<?php

namespace App\Support\FlagQuiz;

/**
 * 国旗クイズの計画(docs/design/2026-10-05-flag-quiz-design.md 4章)。
 * 国の一覧から、コース・級・ステージ・問題の「計画」を作る純粋な計算。データベースには触らない。
 * ランダムの代わりに、名前から決まる並び(crc32)を使うので、同じ一覧からは、いつも同じ計画ができる
 */
class FlagQuizPlanner
{
    public const QUESTIONS_PER_STAGE = 10;

    /** ステージの何問目をはめ込みにするか(1始まり。中級・上級) */
    public const FIT_POSITIONS = [3, 8];

    /** 1問に持たせる、まちがいの候補の数の上限(初級・中級) */
    public const WRONG_POOL = 8;

    /** まちがいの候補に、最低限そろえる数 */
    public const MIN_WRONG = 3;

    /** この数より国の少ないコースは作らない */
    public const MIN_COURSE_COUNTRIES = 8;

    public const LEVELS = [
        'beginner' => ['difficulty' => '初級', 'title' => 'みならい'],
        'intermediate' => ['difficulty' => '中級', 'title' => 'めいじん'],
        'advanced' => ['difficulty' => '上級', 'title' => 'はかせ'],
    ];

    /**
     * @param  array<string, array{key: string, name: string, continent: string, tier: int, similar: list<string>}>  $catalog
     */
    public static function plan(array $catalog): array
    {
        $courses = [];
        $order = 0;

        foreach (FlagCatalog::COURSES as $courseKey => $courseName) {
            $countries = array_values(array_filter(
                $catalog,
                fn (array $country) => $courseKey === 'world' || $country['continent'] === $courseKey,
            ));
            if (count($countries) < self::MIN_COURSE_COUNTRIES) {
                continue;
            }

            $levels = [];
            foreach (self::LEVELS as $code => $level) {
                $levelCountries = $code === 'beginner'
                    ? array_values(array_filter($countries, fn (array $country) => $country['tier'] <= 2))
                    : $countries;
                $levels[] = self::level($catalog, $courseKey, $courseName, $code, $level, $levelCountries, $countries);
            }

            $courses[] = ['key' => $courseKey, 'name' => $courseName, 'order' => ++$order, 'levels' => $levels];
        }

        return $courses;
    }

    private static function level(array $catalog, string $courseKey, string $courseName, string $code, array $level, array $levelCountries, array $courseCountries): array
    {
        // 知名度の高い国から先に(同じ知名度は、一覧の順のまま)
        $sorted = $levelCountries;
        usort($sorted, fn (array $a, array $b) => $a['tier'] <=> $b['tier']);

        $groups = self::split($sorted, max(1, (int) ceil(count($sorted) / self::QUESTIONS_PER_STAGE)));

        $stages = [];
        foreach ($groups as $index => $group) {
            $stages[] = self::stage($catalog, $courseKey, $code, $index + 1, null, $group, $levelCountries, $courseCountries);
        }

        $boss = array_slice(self::byHash($levelCountries, "boss:{$courseKey}:{$code}", count($levelCountries)), 0, self::QUESTIONS_PER_STAGE);
        $stages[] = self::stage($catalog, $courseKey, $code, count($groups) + 1, "{$courseName}の国旗{$level['title']}", $boss, $levelCountries, $courseCountries);

        return ['code' => $code, 'difficulty' => $level['difficulty'], 'stages' => $stages];
    }

    /** 国を、なるべく均等に、k個の組に分ける(前の組から、1つずつ多く) */
    private static function split(array $countries, int $groups): array
    {
        $base = intdiv(count($countries), $groups);
        $extra = count($countries) % $groups;

        $result = [];
        $offset = 0;
        for ($i = 0; $i < $groups; $i++) {
            $size = $base + ($i < $extra ? 1 : 0);
            $result[] = array_slice($countries, $offset, $size);
            $offset += $size;
        }

        return $result;
    }

    private static function stage(array $catalog, string $courseKey, string $code, int $number, ?string $titleReward, array $group, array $levelCountries, array $courseCountries): array
    {
        $prefix = "flag:{$courseKey}:{$code}:{$number}";
        $questions = [];

        foreach (self::primaries($group, $prefix) as $index => $country) {
            $position = $index + 1;
            $key = "{$prefix}:q{$position}";
            $salt = $key;

            if ($code === 'beginner') {
                $questions[] = self::flagToName($key, $country, self::wrongCountries($country, $code, $levelCountries, $courseCountries, $catalog, $salt));
            } elseif (in_array($position, self::FIT_POSITIONS, true)) {
                $questions[] = self::fit($key, self::fitSet($country, $code, $levelCountries, $catalog, $salt));
            } elseif ($code === 'advanced' && $position % 2 === 0) {
                $questions[] = self::flagToName($key, $country, self::wrongCountries($country, $code, $levelCountries, $courseCountries, $catalog, $salt));
            } else {
                $questions[] = self::nameToFlag($key, $country, self::wrongCountries($country, $code, $levelCountries, $courseCountries, $catalog, $salt));
            }
        }

        return ['number' => $number, 'boss' => $titleReward !== null, 'title_reward' => $titleReward, 'questions' => $questions];
    }

    /** 組の国を、10個になるまで繰り返して、名前から決まる順に並べる(同じ国が続かないように、何回目かも並べ方に入れる) */
    private static function primaries(array $group, string $salt): array
    {
        $cycle = [];
        for ($i = 0; $i < self::QUESTIONS_PER_STAGE; $i++) {
            $cycle[] = ['country' => $group[$i % count($group)], 'round' => intdiv($i, count($group))];
        }
        usort($cycle, fn (array $a, array $b) => self::hash($salt, "{$a['country']['key']}#{$a['round']}") <=> self::hash($salt, "{$b['country']['key']}#{$b['round']}"));

        return array_column($cycle, 'country');
    }

    /** まちがいの候補。上級は似ている国(足りなければ同じコースの国で足す)。ほかは、その級の国から */
    public static function wrongCountries(array $country, string $code, array $levelCountries, array $courseCountries, array $catalog, string $salt): array
    {
        if ($code === 'advanced') {
            $pool = [];
            foreach ($country['similar'] as $similarKey) {
                if (isset($catalog[$similarKey])) {
                    $pool[] = $catalog[$similarKey];
                }
            }

            return self::fill($pool, $courseCountries, $country, $salt, self::MIN_WRONG);
        }

        $candidates = array_values(array_filter($levelCountries, fn (array $other) => $other['key'] !== $country['key']));
        $pool = self::byHash($candidates, $salt, self::WRONG_POOL);

        return self::fill($pool, $courseCountries, $country, $salt, self::MIN_WRONG);
    }

    /** 候補が $min に足りなければ、コースの国から、名前から決まる順に足す(自分と、すでにある国は除く) */
    private static function fill(array $pool, array $courseCountries, array $country, string $salt, int $min): array
    {
        if (count($pool) >= $min) {
            return $pool;
        }

        $taken = array_merge([$country['key']], array_column($pool, 'key'));
        $rest = array_values(array_filter($courseCountries, fn (array $other) => ! in_array($other['key'], $taken, true)));

        return array_merge($pool, array_slice(self::byHash($rest, "{$salt}:fill", count($rest)), 0, $min - count($pool)));
    }

    /** はめ込みの4か国。アンカーと、(上級は)似ている国、残りはその級の国から */
    private static function fitSet(array $anchor, string $code, array $levelCountries, array $catalog, string $salt): array
    {
        $set = [$anchor];

        if ($code === 'advanced') {
            foreach ($anchor['similar'] as $similarKey) {
                if (count($set) < 4 && isset($catalog[$similarKey])) {
                    $set[] = $catalog[$similarKey];
                }
            }
        }

        $taken = array_column($set, 'key');
        $rest = array_values(array_filter($levelCountries, fn (array $other) => ! in_array($other['key'], $taken, true)));
        $rest = self::byHash($rest, "{$salt}:fit", count($rest));
        while (count($set) < 4) {
            $set[] = array_shift($rest);
        }

        return $set;
    }

    private static function flagToName(string $key, array $country, array $wrong): array
    {
        return [
            'key' => $key,
            'type' => 'multiple_choice',
            'prompt' => 'この国旗は、どこの国？',
            'image' => self::image($country),
            'choices' => self::choices($country, $wrong, false),
        ];
    }

    private static function nameToFlag(string $key, array $country, array $wrong): array
    {
        return [
            'key' => $key,
            'type' => 'multiple_choice',
            'prompt' => "{$country['name']}の国旗は、どれ？",
            'image' => null,
            'choices' => self::choices($country, $wrong, true),
        ];
    }

    private static function fit(string $key, array $set): array
    {
        return [
            'key' => $key,
            'type' => 'matching',
            'prompt' => '国旗を、ばんごうの国に はめよう',
            'layout' => 'slots',
            'items' => array_map(fn (array $country) => ['id' => $country['key'], 'image' => self::image($country), 'label' => $country['name']], $set),
        ];
    }

    private static function choices(array $correct, array $wrong, bool $withImage): array
    {
        return array_map(
            fn (array $country, bool $isCorrect) => ['label' => $country['name'], 'correct' => $isCorrect, 'image' => $withImage ? self::image($country) : null],
            array_merge([$correct], $wrong),
            array_merge([true], array_fill(0, count($wrong), false)),
        );
    }

    private static function image(array $country): string
    {
        return "/flag/{$country['key']}.svg";
    }

    /** 名前から決まる順に並べて、先頭から $limit 個 */
    private static function byHash(array $countries, string $salt, int $limit): array
    {
        $countries = array_values($countries);
        usort($countries, fn (array $a, array $b) => self::hash($salt, $a['key']) <=> self::hash($salt, $b['key']));

        return array_slice($countries, 0, $limit);
    }

    private static function hash(string $salt, string $key): int
    {
        return crc32("{$salt}|{$key}");
    }
}
