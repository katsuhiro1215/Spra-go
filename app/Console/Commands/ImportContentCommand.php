<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Country;
use App\Models\Question;
use App\Models\QuestionTheme;
use App\Models\Quiz;
use App\Models\Stage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportContentCommand extends Command
{
    protected $signature = 'content:import {file : docs/content/drafts配下のJSONファイルへのパス} {--dry-run : 検証のみ行い、DBへは書き込まない}';

    protected $description = 'コンテンツ制作担当が作成したJSON原稿を検証し、Stage/Question/Choiceとして取り込む';

    public function handle(): int
    {
        $path = $this->argument('file');

        if (! is_file($path)) {
            $this->error("ファイルが見つかりません: {$path}");

            return self::FAILURE;
        }

        $data = json_decode((string) file_get_contents($path), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->error('JSONの構文が不正です: '.json_last_error_msg());

            return self::FAILURE;
        }

        $errors = $this->validate($data);

        if ($errors !== []) {
            $this->error('コンテンツの検証に失敗しました:');
            foreach ($errors as $error) {
                $this->line(" - {$error}");
            }

            return self::FAILURE;
        }

        $this->info("検証OK: {$data['country_name']}（{$data['difficulty']}） Stage数=".count($data['stages']));

        if ($this->option('dry-run')) {
            $this->comment('--dry-run のためDBへの書き込みは行いません。');

            return self::SUCCESS;
        }

        DB::transaction(fn () => $this->import($data));

        $this->info('取り込みが完了しました。');

        return self::SUCCESS;
    }

    /**
     * @return list<string>
     */
    private function validate(mixed $data): array
    {
        $errors = [];

        if (! is_array($data)) {
            return ['JSONのトップレベルはオブジェクトである必要があります。'];
        }

        foreach (['country_name', 'country_code', 'difficulty', 'stages'] as $key) {
            if (! array_key_exists($key, $data)) {
                $errors[] = "必須キー `{$key}` がありません。";
            }
        }

        if ($errors !== []) {
            return $errors;
        }

        if (! Country::query()->whereRaw('LOWER(code) = ?', [strtolower($data['country_code'])])->exists()) {
            $errors[] = "国コード `{$data['country_code']}` が countries テーブルに存在しません。";
        }

        $validThemeKeys = QuestionTheme::query()->pluck('key')->all();

        foreach ($data['stages'] as $i => $stage) {
            $label = "stages[{$i}]";

            foreach (['stage_number', 'theme_key', 'is_boss', 'questions'] as $key) {
                if (! array_key_exists($key, $stage)) {
                    $errors[] = "{$label}: 必須キー `{$key}` がありません。";
                }
            }

            if (isset($stage['theme_key']) && ! in_array($stage['theme_key'], $validThemeKeys, true)) {
                $errors[] = "{$label}: theme_key `{$stage['theme_key']}` は question_themes に存在しません（QuestionThemeSeederの実行を確認してください）。";
            }

            if (isset($stage['is_boss']) && $stage['is_boss'] === true && empty($stage['title_reward'])) {
                $errors[] = "{$label}: is_boss=true のステージには title_reward が必要です。";
            }

            foreach ($stage['questions'] ?? [] as $j => $question) {
                $qLabel = "{$label}.questions[{$j}]";

                if (empty($question['prompt'])) {
                    $errors[] = "{$qLabel}: prompt が空です。";
                }

                $choices = $question['choices'] ?? [];

                if (count($choices) !== 4) {
                    $errors[] = "{$qLabel}: choices は4件である必要があります（実際: ".count($choices).'件）。';
                }

                $correctCount = collect($choices)->where('is_correct', true)->count();

                if ($correctCount !== 1) {
                    $errors[] = "{$qLabel}: is_correct:true の選択肢はちょうど1件である必要があります（実際: {$correctCount}件）。";
                }
            }
        }

        return $errors;
    }

    private function import(array $data): void
    {
        $country = Country::query()->whereRaw('LOWER(code) = ?', [strtolower($data['country_code'])])->firstOrFail();

        $flagCategory = Category::query()->firstOrCreate(['parent_id' => null, 'name' => '国旗']);
        $category = Category::query()->firstOrCreate([
            'parent_id' => $flagCategory->id,
            'name' => $data['country_name'],
        ]);

        $quiz = Quiz::query()->firstOrCreate(
            ['title' => "{$data['country_name']} {$data['difficulty']} 問題集"],
            ['difficulty' => $data['difficulty'], 'country_id' => $country->id, 'is_published' => true]
        );

        $stagesCreated = 0;
        $questionsCreated = 0;
        $questionsSkipped = 0;

        foreach ($data['stages'] as $stageData) {
            $theme = QuestionTheme::query()->where('key', $stageData['theme_key'])->firstOrFail();

            $stage = Stage::query()->updateOrCreate(
                [
                    'category_id' => $category->id,
                    'difficulty' => $data['difficulty'],
                    'stage_number' => $stageData['stage_number'],
                ],
                [
                    'country_id' => $country->id,
                    'question_theme_id' => $theme->id,
                    'question_count' => count($stageData['questions']),
                    'is_boss' => $stageData['is_boss'],
                    'title_reward' => $stageData['title_reward'] ?? null,
                ]
            );
            $stagesCreated++;

            foreach ($stageData['questions'] as $index => $questionData) {
                $question = Question::query()
                    ->where('quiz_id', $quiz->id)
                    ->where('prompt', $questionData['prompt'])
                    ->first();

                if ($question) {
                    $questionsSkipped++;
                } else {
                    $question = Question::query()->create([
                        'quiz_id' => $quiz->id,
                        'country_id' => $country->id,
                        'prompt' => $questionData['prompt'],
                        'order' => $index,
                    ]);

                    foreach ($questionData['choices'] as $choiceIndex => $choiceData) {
                        $question->choices()->create([
                            'label' => $choiceData['label'],
                            'is_correct' => $choiceData['is_correct'],
                            'order' => $choiceIndex,
                        ]);
                    }

                    $questionsCreated++;
                }

                $stage->questions()->syncWithoutDetaching([
                    $question->id => ['order' => $index + 1],
                ]);
            }
        }

        $this->line("Stage: {$stagesCreated}件 / Question新規: {$questionsCreated}件 / 既存スキップ: {$questionsSkipped}件");
    }
}
