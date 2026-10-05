<?php

namespace App\Support\FlagQuiz;

use App\Models\Category;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use Illuminate\Support\Facades\DB;

/**
 * 国旗クイズの計画を、データベースに書く(docs/design/2026-10-05-flag-quiz-design.md 6-2)。
 * 何度実行しても重複しない。問題は meta.flag_key で見つけ、あれば更新する。選択肢は、中身が変わったときだけ作り直す。
 * 計画から消えたステージ・問題は、消さずに残す(進み具合を守るため)
 */
class FlagQuizWriter
{
    public const ROOT_NAME = '国旗クイズ';

    /** @return array{courses: int, stages: int, questions: int} */
    public static function write(array $plan): array
    {
        return DB::transaction(function () use ($plan) {
            $existing = self::existingQuestions();

            $root = Category::updateOrCreate(['name' => self::ROOT_NAME, 'parent_id' => null], ['is_course_group' => true]);

            $stages = 0;
            $questions = 0;

            foreach ($plan as $course) {
                $category = Category::updateOrCreate(
                    ['name' => $course['name'], 'parent_id' => $root->id],
                    ['order' => $course['order']],
                );

                foreach ($course['levels'] as $level) {
                    $quiz = Quiz::firstOrCreate(
                        ['title' => self::ROOT_NAME." {$course['name']} {$level['difficulty']}"],
                        ['difficulty' => $level['difficulty'], 'is_published' => true],
                    );

                    foreach ($level['stages'] as $stagePlan) {
                        $stage = Stage::updateOrCreate(
                            ['category_id' => $category->id, 'difficulty' => $level['difficulty'], 'stage_number' => $stagePlan['number']],
                            [
                                'country_id' => null,
                                'question_count' => count($stagePlan['questions']),
                                'is_boss' => $stagePlan['boss'],
                                'title_reward' => $stagePlan['title_reward'],
                            ],
                        );

                        $pivot = [];
                        foreach ($stagePlan['questions'] as $index => $spec) {
                            $question = self::question($quiz, $spec, $index + 1, $existing);
                            $pivot[$question->id] = ['order' => $index + 1];
                            $questions++;
                        }
                        $stage->questions()->sync($pivot);
                        $stages++;
                    }
                }
            }

            return ['courses' => count($plan), 'stages' => $stages, 'questions' => $questions];
        });
    }

    /**
     * 国旗キャッチ専用の問題(ステージには入れない)を書く(docs/design/2026-10-05-flag-catch-design.md 4-2)。
     * 何度実行しても重複しない
     *
     * @return array{quizzes: int, questions: int}
     */
    public static function writeCatch(array $plan): array
    {
        return DB::transaction(function () use ($plan) {
            $existing = self::existingQuestions();
            $questions = 0;

            foreach ($plan as $level) {
                $quiz = Quiz::firstOrCreate(['title' => $level['title']], ['difficulty' => $level['difficulty'], 'is_published' => true]);

                foreach ($level['questions'] as $index => $spec) {
                    self::question($quiz, $spec + ['catch_only' => true], $index + 1, $existing);
                    $questions++;
                }
            }

            return ['quizzes' => count($plan), 'questions' => $questions];
        });
    }

    /** 問題は、meta.flag_key で見つける。1問ごとに探すと遅いので、最初に全部読んでおく @return array<string, Question> */
    private static function existingQuestions(): array
    {
        return Question::query()->whereNotNull('meta->flag_key')->get()->keyBy(fn (Question $question) => $question->meta['flag_key'])->all();
    }

    private static function question(Quiz $quiz, array $spec, int $order, array &$existing): Question
    {
        $attributes = [
            'quiz_id' => $quiz->id,
            'country_id' => null,
            'type' => $spec['type'],
            'prompt' => $spec['prompt'],
            'order' => $order,
            'meta' => self::questionMeta($spec),
        ];

        $question = $existing[$spec['key']] ?? null;
        if ($question) {
            $question->update($attributes);
        } else {
            $question = $existing[$spec['key']] = Question::create($attributes);
        }

        self::syncChoices($question, self::choiceRows($spec));

        return $question;
    }

    private static function questionMeta(array $spec): array
    {
        if ($spec['type'] === 'matching') {
            return [
                'flag_key' => $spec['key'],
                'layout' => $spec['layout'],
                'items' => array_map(fn (array $item) => ['id' => $item['id'], 'image' => $item['image']], $spec['items']),
            ];
        }

        $meta = ['flag_key' => $spec['key']];
        if (($spec['image'] ?? null) !== null) {
            $meta['image'] = $spec['image'];
        }
        if ($spec['catch_only'] ?? false) {
            $meta['catch_only'] = true;
        }

        return $meta;
    }

    /** @return list<array{label: string, is_correct: bool, order: int, meta: ?array}> */
    private static function choiceRows(array $spec): array
    {
        if ($spec['type'] === 'matching') {
            return array_map(fn (array $item, int $index) => [
                'label' => $item['label'],
                'is_correct' => true,
                'order' => $index + 1,
                'meta' => ['item_id' => $item['id']],
            ], $spec['items'], array_keys($spec['items']));
        }

        return array_map(fn (array $choice, int $index) => [
            'label' => $choice['label'],
            'is_correct' => $choice['correct'],
            'order' => $index + 1,
            'meta' => $choice['image'] !== null ? ['image' => $choice['image']] : null,
        ], $spec['choices'], array_keys($spec['choices']));
    }

    private static function syncChoices(Question $question, array $rows): void
    {
        $current = $question->choices()->get()
            ->map(fn ($choice) => ['label' => $choice->label, 'is_correct' => $choice->is_correct, 'order' => $choice->order, 'meta' => $choice->meta])
            ->all();

        if ($current === $rows) {
            return;
        }

        $question->choices()->delete();
        $question->choices()->createMany($rows);
    }
}
