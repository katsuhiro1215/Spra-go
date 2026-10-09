<?php

namespace App\Support\Space;

/**
 * 宇宙クイズの計画(docs/design/2026-10-09-space-quiz-design.md 3・5章)。
 * 読み込んだ問題を、難しさごとにステージへ区切って、FlagQuizWriter::writeTree が受ける形にする純粋な計算。
 * データベースにも、ファイルにも触らない(絵が届いているかは、キーの一覧で受け取る)
 */
class SpaceQuizPlanner
{
    public const ROOT_NAME = '宇宙';

    public const COURSE_NAME = '宇宙たんけん';

    /** 難しさ => [コードと称号と、1ステージの問題数] */
    public const LEVELS = [
        '初級' => ['code' => 'beginner', 'title' => 'うちゅうたんけんたい', 'stage_size' => 8],
        '中級' => ['code' => 'intermediate', 'title' => 'うちゅうパイロット', 'stage_size' => 8],
        '上級' => ['code' => 'advanced', 'title' => 'うちゅうはかせ', 'stage_size' => 6],
    ];

    /**
     * @param  list<array<string, mixed>>  $questions  SpaceCatalog::load の questions
     * @param  array<string, array{key: string, name: string}>  $pictures  名前 => 絵
     * @param  list<string>  $availableImages  絵が届いているキー
     * @return array{nodes: list<array<string, mixed>>, skipped: list<string>}
     */
    public static function plan(array $questions, array $pictures, array $availableImages): array
    {
        $available = array_flip($availableImages);
        $skipped = [];
        $byLevel = [];

        foreach ($questions as $question) {
            $spec = self::spec($question, $pictures);
            if ($question['kind'] === 'picture' && self::missingImage($spec, $available)) {
                $skipped[] = $spec['key'];

                continue;
            }
            $byLevel[$question['level']][] = $spec;
        }

        $levels = [];
        foreach (self::LEVELS as $difficulty => $level) {
            $specs = $byLevel[$difficulty] ?? [];
            if ($specs === []) {
                continue;
            }
            $groups = self::split($specs, (int) ceil(count($specs) / $level['stage_size']));
            $stages = [];
            foreach ($groups as $index => $group) {
                $boss = $index === count($groups) - 1;
                $stages[] = [
                    'number' => $index + 1,
                    'boss' => $boss,
                    'title_reward' => $boss ? $level['title'] : null,
                    'questions' => $group,
                ];
            }
            $levels[] = ['code' => $level['code'], 'difficulty' => $difficulty, 'stages' => $stages];
        }

        return [
            'nodes' => [['name' => self::COURSE_NAME, 'order' => 1, 'levels' => $levels]],
            'skipped' => $skipped,
        ];
    }

    /** @return array<string, mixed> */
    private static function spec(array $question, array $pictures): array
    {
        $names = [$question['correct'], ...$question['wrong']];
        $choices = array_map(fn (string $name, bool $correct) => [
            'label' => $name,
            'correct' => $correct,
            'image' => $question['kind'] === 'picture' ? '/space/'.$pictures[$name]['key'].'.webp' : null,
        ], $names, [true, false, false, false]);

        return [
            'key' => "space:{$question['level']}:{$question['number']}",
            'type' => 'multiple_choice',
            'prompt' => $question['prompt'],
            'image' => null,
            'choices' => $choices,
            'explanation' => ['summary' => $question['explanation']],
        ];
    }

    /** 選択肢の絵が1つでも届いていないか */
    private static function missingImage(array $spec, array $available): bool
    {
        foreach ($spec['choices'] as $choice) {
            $key = basename((string) $choice['image'], '.webp');
            if (! isset($available[$key])) {
                return true;
            }
        }

        return false;
    }

    /** 問題を、なるべく均等に、k個の組に分ける(前の組から、1つずつ多く) */
    private static function split(array $specs, int $groups): array
    {
        $base = intdiv(count($specs), $groups);
        $extra = count($specs) % $groups;

        $result = [];
        $offset = 0;
        for ($i = 0; $i < $groups; $i++) {
            $size = $base + ($i < $extra ? 1 : 0);
            $result[] = array_slice($specs, $offset, $size);
            $offset += $size;
        }

        return $result;
    }
}
