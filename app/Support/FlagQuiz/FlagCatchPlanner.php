<?php

namespace App\Support\FlagQuiz;

/**
 * 国旗キャッチの問題の計画(docs/design/2026-10-05-flag-catch-design.md 4章)。
 * 国の一覧から、難しさごとに、知名度で絞った国を1か国1問で作る純粋な計算。データベースには触らない。
 * 問題は「『国名』の国旗は？」、選択肢は国旗の絵。まちがいの選び方は、国旗クイズと同じ(FlagQuizPlanner::wrongCountries)
 */
class FlagCatchPlanner
{
    public const QUIZ_PREFIX = '国旗キャッチ';

    /** code => 難しさと、出す国の知名度の上限(初級は知名度1、中級は1・2、上級は全部) */
    public const LEVELS = [
        'beginner' => ['difficulty' => '初級', 'max_tier' => 1],
        'intermediate' => ['difficulty' => '中級', 'max_tier' => 2],
        'advanced' => ['difficulty' => '上級', 'max_tier' => 3],
    ];

    /**
     * @param  array<string, array{key: string, name: string, continent: string, tier: int, similar: list<string>}>  $catalog
     */
    public static function plan(array $catalog): array
    {
        $all = array_values($catalog);
        $levels = [];

        foreach (self::LEVELS as $code => $level) {
            $countries = array_values(array_filter($all, fn (array $country) => $country['tier'] <= $level['max_tier']));

            $questions = array_map(function (array $country) use ($code, $countries, $all, $catalog) {
                $key = "catch:{$code}:{$country['key']}";
                $wrong = FlagQuizPlanner::wrongCountries($country, $code, $countries, $all, $catalog, $key);

                return [
                    'key' => $key,
                    'type' => 'multiple_choice',
                    'prompt' => "「{$country['name']}」の国旗は？",
                    'image' => null,
                    'choices' => array_map(
                        fn (array $other, bool $correct) => ['label' => $other['name'], 'correct' => $correct, 'image' => "/flag/{$other['key']}.svg"],
                        array_merge([$country], $wrong),
                        array_merge([true], array_fill(0, count($wrong), false)),
                    ),
                ];
            }, $countries);

            $levels[] = [
                'code' => $code,
                'difficulty' => $level['difficulty'],
                'title' => self::QUIZ_PREFIX.' '.$level['difficulty'],
                'questions' => $questions,
            ];
        }

        return $levels;
    }
}
