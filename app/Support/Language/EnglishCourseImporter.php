<?php

namespace App\Support\Language;

use App\Models\Category;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use App\Models\Word;
use App\Support\Words;
use Illuminate\Support\Facades\DB;

/**
 * 英語コースの取り込み(docs/design/2026-10-07-english-levels-design.md 4-1・4-2)。
 * 原稿のCSV(words/*.csv・sentences/*.csv)から、「英語を学ぶ」の級ごとの問題と10ステージを作る。何度実行しても同じ結果になる。
 * 単語は、CSVの向きの問題はそのまま、反対向きは同じ品詞・近いレベルの別の語から作る(幼児は英語→日本語だけ)
 */
class EnglishCourseImporter
{
    public const CATEGORY = '英語を学ぶ';

    /** 幼児のレベル(日本語→英語を作らない) */
    private const PRESCHOOL_MAX = 10;

    /** @return array{questions: int, stages: int} */
    public static function import(string $path, array $titles = []): array
    {
        $words = self::readWords($path);
        $sentences = self::readSentences($path);

        return DB::transaction(function () use ($words, $sentences, $titles) {
            $category = Category::query()->firstOrCreate(['parent_id' => null, 'name' => self::CATEGORY], ['is_language_mode' => true]);
            $totals = ['questions' => 0, 'stages' => 0];
            $wordIds = self::writeWords($words);

            foreach (config('courses.language_levels') as $difficulty => [$from, $to]) {
                $specs = [
                    ...self::wordSpecs(array_values(array_filter($words, fn (array $w) => $w['level'] >= $from && $w['level'] <= $to)), $words, $wordIds),
                    ...array_map(self::sentenceSpec(...), array_values(array_filter($sentences, fn (array $s) => $s['level'] >= $from && $s['level'] <= $to))),
                ];
                if ($specs === []) {
                    continue;
                }

                $ids = self::writeQuestions($difficulty, $specs);
                $totals['questions'] += count($ids);
                $totals['stages'] += self::writeStages($category, $difficulty, $ids, $titles[$difficulty] ?? null);
            }

            return $totals;
        });
    }

    /** 古い英語コース(国に結びついたステージ、またはレベルのない問題)があるか */
    public static function hasOldContent(): bool
    {
        $category = Category::query()->where('name', self::CATEGORY)->first();
        $stages = $category ? Stage::query()->where('category_id', $category->id)->get() : collect();
        if ($stages->isEmpty()) {
            return false;
        }
        if ($stages->whereNotNull('country_id')->isNotEmpty()) {
            return true;
        }

        return ! Question::query()
            ->whereIn('id', DB::table('stage_questions')->whereIn('stage_id', $stages->pluck('id'))->select('question_id'))
            ->whereNotNull('meta->level')
            ->exists();
    }

    /**
     * 今の英語コース(ステージ・問題集とその問題・進み具合・覚え具合)を消す。元のボスの称号を、級ごとに返す(新しいボスに引き継ぐ)
     *
     * @return array<string, string>
     */
    public static function wipe(): array
    {
        $category = Category::query()->where('name', self::CATEGORY)->first();
        $titles = [];

        return DB::transaction(function () use ($category, &$titles) {
            if ($category) {
                $stages = Stage::query()->where('category_id', $category->id);
                $titles = (clone $stages)->where('is_boss', true)->whereNotNull('title_reward')->orderBy('id')->pluck('title_reward', 'difficulty')->all();
                $stages->delete();
            }
            Quiz::query()->where('title', 'like', self::CATEGORY.'%')->delete();
            Word::query()->where('language', 'en')->delete();

            return $titles;
        });
    }

    /** @return list<array{level: int, pos: string, cefr: ?string, direction: string, en: string, ja: string, prompt: string, correct: string, wrong: list<string>, summary: string}> */
    private static function readWords(string $path): array
    {
        $words = [];
        foreach (self::readCsv("{$path}/words") as $row) {
            $words[] = [
                'level' => (int) $row['英語レベル'],
                'pos' => $row['品詞'],
                'cefr' => ($row['CEFR'] ?? '') !== '' ? $row['CEFR'] : null,
                'direction' => $row['出題方向'] === '日英' ? 'ja_en' : 'en_ja',
                'en' => $row['英単語'],
                'ja' => $row['日本語'],
                'prompt' => $row['問題文'],
                'correct' => $row['正解'],
                'wrong' => [$row['まちがい1'], $row['まちがい2'], $row['まちがい3']],
                'summary' => $row['解説(要約)'],
            ];
        }

        return $words;
    }

    /** @return list<array{level: int, prompt: string, correct: string, wrong: list<string>, summary: string}> */
    private static function readSentences(string $path): array
    {
        return array_map(fn (array $row) => [
            'level' => (int) $row['英語レベル'],
            'prompt' => $row['問題文'],
            'correct' => $row['正解'],
            'wrong' => [$row['まちがい1'], $row['まちがい2'], $row['まちがい3']],
            'summary' => $row['解説(要約)'],
        ], self::readCsv("{$path}/sentences"));
    }

    /** @return list<array<string, string>> フォルダ内のCSVを名前順に読み、見出しの名前をキーにした行にする(BOMつきでも読む) */
    private static function readCsv(string $dir): array
    {
        $files = glob("{$dir}/*.csv") ?: [];
        sort($files);
        $rows = [];

        foreach ($files as $file) {
            $handle = fopen($file, 'r');
            $header = null;
            while (($line = fgetcsv($handle, 0, ',', '"', '')) !== false) {
                if ($line === [null]) {
                    continue;
                }
                if ($header === null) {
                    $header = array_map(fn (?string $name) => trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $name)), $line);

                    continue;
                }
                $rows[] = array_combine($header, array_pad($line, count($header), ''));
            }
            fclose($handle);
        }

        return $rows;
    }

    /**
     * 級の単語の問題(CSVの向きと、反対向き)。幼児は英語→日本語だけ
     *
     * @param  list<array<string, mixed>>  $tier
     * @param  list<array<string, mixed>>  $all  反対向きの選択肢を選ぶ元(全部の語)
     * @param  array<string, int>  $wordIds  語のキー(小文字) => 単語帳の語の番号
     * @return list<array<string, mixed>>
     */
    private static function wordSpecs(array $tier, array $all, array $wordIds): array
    {
        $specs = [];
        foreach ($tier as $word) {
            $key = mb_strtolower($word['en']);
            $meta = ['kind' => 'word', 'level' => $word['level'], 'word' => $key, 'word_id' => $wordIds[$key]];
            $preschool = $word['level'] <= self::PRESCHOOL_MAX;

            if (! ($preschool && $word['direction'] === 'ja_en')) {
                $specs[] = ['meta' => $meta + ['direction' => $word['direction']], 'prompt' => $word['prompt'], 'correct' => $word['correct'], 'wrong' => $word['wrong'], 'summary' => $word['summary'], 'key' => $word['en']];
            }

            $reverse = $word['direction'] === 'en_ja' ? 'ja_en' : 'en_ja';
            if ($preschool && $reverse === 'ja_en') {
                continue;
            }
            $field = $reverse === 'ja_en' ? 'en' : 'ja';
            $specs[] = [
                'meta' => $meta + ['direction' => $reverse],
                'prompt' => $reverse === 'ja_en' ? "「{$word['ja']}」を表す英単語は？" : "「{$word['en']}」の意味は？",
                'correct' => $word[$field],
                'wrong' => self::distractors($word, $all, $field),
                'summary' => $word['summary'],
                'key' => $word['en'],
            ];
        }

        return $specs;
    }

    /**
     * 単語帳の語を、語ごとに1行書く(同じ語は、最初に出るレベルで1つ)。何度実行しても増えず、番号も変わらない(子どもの記録が結びついているため)。
     * 発音記号・例文などの内容は、ここでは触らない(word-details の取り込みが書く)
     *
     * @param  list<array<string, mixed>>  $words
     * @return array<string, int> 語のキー(小文字) => 語の番号
     */
    private static function writeWords(array $words): array
    {
        $first = [];
        foreach ($words as $word) {
            $key = mb_strtolower($word['en']);
            if (! isset($first[$key]) || $word['level'] < $first[$key]['level']) {
                $first[$key] = $word;
            }
        }

        $ids = [];
        foreach ($first as $key => $word) {
            $model = Word::query()->firstOrNew(['language' => 'en', 'key' => $key]);
            $isNew = ! $model->exists;
            $model->fill([
                'word' => $word['en'],
                'level' => $word['level'],
                'pos' => Words::posLabel($word['pos']),
                'cefr' => $word['cefr'],
                // 内容の原稿が書いた意味・重要度は、取り込みの再実行で上書きしない
                'meanings' => $isNew ? [['pos' => Words::posLabel($word['pos']), 'ja' => [$word['ja']]]] : $model->meanings,
                'importance' => $isNew ? Words::defaultImportance($word['level']) : $model->importance,
            ])->save();
            $ids[$key] = $model->id;
        }

        return $ids;
    }

    /** @return array<string, mixed> */
    private static function sentenceSpec(array $sentence): array
    {
        return ['meta' => ['kind' => 'sentence', 'level' => $sentence['level']], 'prompt' => $sentence['prompt'], 'correct' => $sentence['correct'], 'wrong' => $sentence['wrong'], 'summary' => $sentence['summary'], 'key' => $sentence['prompt']];
    }

    /**
     * 反対向きのまちがい3つ。同じ品詞・近いレベルの別の語から、語ごとに決まった順で選ぶ(再実行しても同じ)。
     * 正解と同じ英語、同じ訳(「・」で区切った訳が1つでも重なる語)は入れない
     *
     * @return list<string>
     */
    private static function distractors(array $word, array $all, string $field): array
    {
        $own = self::tokens($word['ja']);
        $candidates = array_filter($all, fn (array $other) => mb_strtolower($other['en']) !== mb_strtolower($word['en']) && array_intersect($own, self::tokens($other['ja'])) === []);
        usort($candidates, fn (array $a, array $b) => [$a['pos'] !== $word['pos'], abs($a['level'] - $word['level']), crc32($word['en'].'|'.$a['en'])]
            <=> [$b['pos'] !== $word['pos'], abs($b['level'] - $word['level']), crc32($word['en'].'|'.$b['en'])]);

        $chosen = [];
        foreach ($candidates as $candidate) {
            if ($candidate[$field] !== $word[$field] && ! in_array($candidate[$field], $chosen, true)) {
                $chosen[] = $candidate[$field];
            }
            if (count($chosen) === 3) {
                break;
            }
        }

        return $chosen;
    }

    /** @return list<string> */
    private static function tokens(string $ja): array
    {
        return array_values(array_filter(array_map('trim', explode('・', $ja))));
    }

    /**
     * 問題集に問題を書き、ステージの順(取り出しの先頭5問のもと)に並べた問題の番号を返す
     *
     * @param  list<array<string, mixed>>  $specs
     * @return list<int>
     */
    private static function writeQuestions(string $difficulty, array $specs): array
    {
        $quiz = Quiz::query()->firstOrCreate(['title' => self::CATEGORY." {$difficulty}"], ['difficulty' => $difficulty, 'is_published' => true]);
        $existing = Question::query()->with('choices')->where('quiz_id', $quiz->id)->get()
            ->keyBy(fn (Question $q) => $q->prompt.'|'.$q->choices->firstWhere('is_correct', true)?->label);

        usort($specs, fn (array $a, array $b) => crc32($a['prompt'].'|'.$a['correct']) <=> crc32($b['prompt'].'|'.$b['correct']));

        $ids = [];
        foreach ($specs as $index => $spec) {
            $explanation = ['summary' => $spec['summary']];
            $question = $existing->get($spec['prompt'].'|'.$spec['correct']);

            if ($question) {
                $question->update(['meta' => $spec['meta'], 'explanation' => $explanation, 'order' => $index]);
            } else {
                $question = Question::query()->create(['quiz_id' => $quiz->id, 'type' => 'multiple_choice', 'prompt' => $spec['prompt'], 'order' => $index, 'meta' => $spec['meta'], 'explanation' => $explanation]);
                $choices = [['label' => $spec['correct'], 'is_correct' => true], ...array_map(fn (string $label) => ['label' => $label, 'is_correct' => false], $spec['wrong'])];
                usort($choices, fn (array $a, array $b) => crc32($spec['prompt'].'|'.$a['label']) <=> crc32($spec['prompt'].'|'.$b['label']));
                foreach ($choices as $order => $choice) {
                    $question->choices()->create($choice + ['order' => $order]);
                }
            }
            $ids[] = $question->id;
        }

        return $ids;
    }

    /** @param  list<int>  $ids */
    private static function writeStages(Category $category, string $difficulty, array $ids, ?string $title): int
    {
        $level = config('courses.default')[$difficulty];
        $sync = [];
        foreach ($ids as $index => $id) {
            $sync[$id] = ['order' => $index + 1];
        }

        for ($number = 1; $number <= $level['stages']; $number++) {
            $boss = $number === $level['stages'];
            $existing = Stage::query()->where(['category_id' => $category->id, 'country_id' => null, 'difficulty' => $difficulty, 'stage_number' => $number])->first();
            $stage = Stage::query()->updateOrCreate(
                ['category_id' => $category->id, 'country_id' => null, 'difficulty' => $difficulty, 'stage_number' => $number],
                [
                    'question_count' => $boss ? $level['boss'] : $level['draw'],
                    'is_boss' => $boss,
                    'is_pool' => true,
                    'reward_percent' => config($boss ? 'courses.boss_reward_percent' : 'courses.normal_reward_percent'),
                    'title_reward' => $boss ? ($title ?? $existing?->title_reward ?? config('courses.english_titles')[$difficulty] ?? null) : null,
                ],
            );
            $stage->questions()->sync($sync);
        }

        return $level['stages'];
    }
}
