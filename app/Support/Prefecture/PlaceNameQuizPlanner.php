<?php

namespace App\Support\Prefecture;

/**
 * 地名コース(docs/design/2026-10-06-prefecture-master-design.md)の計画。
 * 元原稿は database/data/place-names/{番号2桁}-{県のkey}.csv(列: 級・ステージ・番号・形・問題文・正解・まちがい1〜3・解説)。
 * 級ごとに1ステージ(ボス)で、問題はプールとして持ち、出すときに抽選する。出し方は App\Support\StageDraw
 */
class PlaceNameQuizPlanner
{
    public const LEVELS = ['beginner' => '初級', 'intermediate' => '中級', 'advanced' => '上級', 'expert' => '最高難易度'];

    private const DRAW = ['beginner' => 10, 'intermediate' => 10, 'advanced' => 10, 'expert' => 5];

    private const REWARD_PERCENT = 50;

    /** 県の地名コースの名前(例: 北海道 地名) */
    public static function courseName(string $prefectureName): string
    {
        return "{$prefectureName} 地名";
    }

    /** 地方ごとの計画(PrefectureQuizPlanner::plan と同じ形。コースは地名コースだけ) */
    public static function plan(array $catalog, ?string $directory = null): array
    {
        $directory ??= database_path('data/place-names');
        $number = 0;
        $courses = [];
        foreach ($catalog as $prefecture) {
            $number++;
            $file = sprintf('%s/%02d-%s.csv', $directory, $number, $prefecture['key']);
            if (! is_file($file)) {
                continue;
            }
            $courses[$prefecture['region']][] = [
                'key' => "{$prefecture['key']}-place",
                'name' => self::courseName($prefecture['name']),
                'order' => 100 + $number,
                'levels' => self::levels($prefecture, self::read($file)),
            ];
        }

        $regions = [];
        $regionOrder = 0;
        foreach (PrefectureCatalog::REGIONS as $regionKey => $regionName) {
            $regionOrder++;
            if (isset($courses[$regionKey])) {
                $regions[] = ['key' => $regionKey, 'name' => $regionName, 'order' => $regionOrder, 'group' => true, 'courses' => $courses[$regionKey]];
            }
        }

        return $regions;
    }

    /** @return list<list<string>> */
    private static function read(string $file): array
    {
        $handle = fopen($file, 'r');
        $rows = [];
        while (($row = fgetcsv($handle, 0, ',', '"', '')) !== false) {
            $rows[] = $row;
        }
        fclose($handle);
        $rows[0][0] = ltrim($rows[0][0], "\xEF\xBB\xBF");

        return array_slice($rows, 1);
    }

    private static function levels(array $prefecture, array $rows): array
    {
        $levels = [];
        foreach (self::LEVELS as $code => $difficulty) {
            $questions = [];
            foreach (array_filter($rows, fn (array $row) => $row[0] === $difficulty) as $row) {
                $questions[] = self::question($prefecture, $code, count($questions) + 1, $row);
            }
            if ($questions === []) {
                continue;
            }
            $levels[] = [
                'code' => $code,
                'difficulty' => $difficulty,
                'stages' => [[
                    'number' => 1,
                    'boss' => true,
                    'title_reward' => null,
                    'draw' => self::DRAW[$code],
                    'reward_percent' => self::REWARD_PERCENT,
                    'questions' => $questions,
                ]],
            ];
        }

        return $levels;
    }

    private static function question(array $prefecture, string $code, int $number, array $row): array
    {
        [, , , , $prompt, $correct, $wrong1, $wrong2, $wrong3, $summary] = $row;
        preg_match_all('/『(.+?)』/u', $prompt, $matches);

        return [
            'key' => "pref:{$prefecture['region']}:{$prefecture['key']}:place:{$code}:{$number}",
            'type' => 'multiple_choice',
            'prompt' => $prompt,
            'image' => null,
            'choices' => array_merge(
                [['label' => $correct, 'correct' => true, 'image' => null]],
                array_map(fn (string $label) => ['label' => $label, 'correct' => false, 'image' => null], [$wrong1, $wrong2, $wrong3]),
            ),
            'plain' => $matches[1],
            'explanation' => ['summary' => $summary],
        ];
    }
}
