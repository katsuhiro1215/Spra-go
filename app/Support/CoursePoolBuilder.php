<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Country;
use App\Models\Question;
use App\Models\Stage;
use Illuminate\Support\Facades\DB;

/**
 * 国のコース(メインの道)を、級ごとに10ステージ(最後がボス)のプールに並べ直す(docs/design/2026-10-07-main-game-levels-design.md 4-2)。
 * 今ある級のステージの問題を集めてプールにし、すべてのステージにつなぐ。何度実行しても同じ結果になる。
 * 定義にないステージ(大きい番号・定義にない級)は消す(公開前の作り直し)
 */
class CoursePoolBuilder
{
    /** @return array<string, array{stages: int, draw: int, boss: int}> */
    public static function definition(string $code): array
    {
        $own = require database_path('data/country-courses.php');

        return $own[strtolower($code)] ?? config('courses.default');
    }

    /**
     * @param  array<string, array{stages: int, draw: int, boss: int}>|null  $definition  省略すると、国の定義
     * @return array{stages: int, pool: int}
     */
    public static function buildCountry(Country $country, ?array $definition = null): array
    {
        $definition ??= self::definition($country->code);
        // カテゴリーの名前は国名と一致しないことがある(アメリカ合衆国)ので、その国のステージが付いている、ルート直下のカテゴリーを探す
        $category = Category::query()
            ->whereIn('parent_id', Category::query()->where('name', config('courses.country_root'))->whereNull('parent_id')->select('id'))
            ->whereHas('stages', fn ($query) => $query->where('country_id', $country->id))
            ->first();
        if (! $category) {
            return ['stages' => 0, 'pool' => 0];
        }

        return DB::transaction(function () use ($country, $category, $definition) {
            $totals = ['stages' => 0, 'pool' => 0];

            foreach (Stage::query()->where('category_id', $category->id)->where('country_id', $country->id)->get()->groupBy('difficulty') as $difficulty => $existing) {
                if (! isset($definition[$difficulty])) {
                    Stage::query()->whereIn('id', $existing->pluck('id'))->delete();

                    continue;
                }
                $built = self::buildLevel($country, $category, $difficulty, $existing, $definition[$difficulty]);
                $totals['stages'] += $built['stages'];
                $totals['pool'] += $built['pool'];
            }

            return $totals;
        });
    }

    /** @return array{stages: int, pool: int} */
    private static function buildLevel(Country $country, Category $category, string $difficulty, $existing, array $level): array
    {
        $ordered = $existing->sortBy('stage_number');
        $title = $ordered->first(fn (Stage $stage) => $stage->is_boss && $stage->title_reward)?->title_reward;
        $poolIds = DB::table('stage_questions')
            ->whereIn('stage_id', $ordered->pluck('id'))
            ->join('stages', 'stages.id', '=', 'stage_questions.stage_id')
            ->orderBy('stages.stage_number')->orderBy('stage_questions.order')
            ->pluck('stage_questions.question_id')->unique()->values()->all();
        if ($poolIds === []) {
            return ['stages' => 0, 'pool' => 0];
        }

        $sync = [];
        foreach ($poolIds as $index => $id) {
            $sync[$id] = ['order' => $index + 1];
        }

        for ($number = 1; $number <= $level['stages']; $number++) {
            $boss = $number === $level['stages'];
            $stage = Stage::query()->updateOrCreate(
                ['category_id' => $category->id, 'country_id' => $country->id, 'difficulty' => $difficulty, 'stage_number' => $number],
                [
                    'question_count' => $boss ? $level['boss'] : $level['draw'],
                    'is_boss' => $boss,
                    'is_pool' => true,
                    'reward_percent' => config($boss ? 'courses.boss_reward_percent' : 'courses.normal_reward_percent'),
                    'title_reward' => $boss ? $title : null,
                ],
            );
            $stage->questions()->sync($sync);
        }

        Stage::query()->where('category_id', $category->id)->where('country_id', $country->id)->where('difficulty', $difficulty)
            ->where('stage_number', '>', $level['stages'])->delete();

        return ['stages' => $level['stages'], 'pool' => count($poolIds)];
    }

    /**
     * 言語のコース(「◯◯語を学ぶ」)を、国に結びつかない10ステージ×級のプールに並べ直す(設計書 4-1)。
     * 国ごとに別々にあった同じ言語のステージの問題を、1つのプールにまとめる(問題文と正解が同じ問題は1つ)。
     * ステージのない言語は何もしない。何度実行しても同じ結果になる
     *
     * @return array<string, array{stages: int, pool: int}>
     */
    public static function buildLanguages(): array
    {
        $result = [];

        foreach (config('courses.languages') as $key => $language) {
            $category = Category::query()->where('name', $language['category'])->first();
            $existing = $category ? Stage::query()->where('category_id', $category->id)->get() : collect();
            if ($existing->isEmpty()) {
                continue;
            }

            $totals = DB::transaction(function () use ($category, $existing, $language) {
                $totals = ['stages' => 0, 'pool' => 0];
                $definition = config('courses.default');

                foreach ($existing->groupBy('difficulty') as $difficulty => $stages) {
                    if (! isset($definition[$difficulty])) {
                        continue;
                    }
                    $level = $definition[$difficulty];
                    $poolIds = self::languagePool($stages);
                    self::tagKinds($stages, $poolIds);
                    if ($poolIds === []) {
                        continue;
                    }
                    $title = $stages->sortBy('id')->first(fn (Stage $stage) => $stage->is_boss && $stage->title_reward)?->title_reward;
                    $sync = [];
                    foreach ($poolIds as $index => $id) {
                        $sync[$id] = ['order' => $index + 1];
                    }

                    for ($number = 1; $number <= $level['stages']; $number++) {
                        $boss = $number === $level['stages'];
                        $stage = Stage::query()->updateOrCreate(
                            ['category_id' => $category->id, 'country_id' => null, 'difficulty' => $difficulty, 'stage_number' => $number],
                            [
                                'question_count' => $boss ? $level['boss'] : $level['draw'],
                                'is_boss' => $boss,
                                'is_pool' => true,
                                'reward_percent' => config($boss ? 'courses.boss_reward_percent' : 'courses.normal_reward_percent'),
                                'title_reward' => $boss ? $title : null,
                            ],
                        );
                        $stage->questions()->sync($sync);
                    }
                    $totals['stages'] += $level['stages'];
                    $totals['pool'] += count($poolIds);
                }

                // 国に結びついていた、元のステージと、10を超える番号のステージを消す(公開前の作り直し)
                Stage::query()->where('category_id', $category->id)
                    ->where(fn ($query) => $query->whereNotNull('country_id')->orWhere('stage_number', '>', 10))
                    ->delete();

                return $totals;
            });

            if ($totals['stages'] > 0) {
                $result[$key] = $totals;
            }
        }

        return $result;
    }

    /** 言語のステージの問題を集めて、重複(問題文と正解が同じ)を除いたプールにする @return list<int> */
    private static function languagePool($stages): array
    {
        $ids = DB::table('stage_questions')
            ->whereIn('stage_id', $stages->pluck('id'))
            ->join('stages', 'stages.id', '=', 'stage_questions.stage_id')
            ->orderBy('stages.stage_number')->orderBy('stage_questions.order')->orderBy('stages.id')
            ->pluck('stage_questions.question_id')->unique()->values()->all();

        $questions = Question::query()->with('choices')->whereIn('id', $ids)->get()->keyBy('id');
        $seen = [];
        $pool = [];
        foreach ($ids as $id) {
            $question = $questions[$id];
            $key = $question->prompt.'|'.$question->choices->firstWhere('is_correct', true)?->label;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $pool[] = (int) $id;
        }

        return $pool;
    }

    /**
     * 言語コースの問題に、種類(meta.kind = word / sentence)を、元のステージのテーマから付ける。
     * すでに付いている問題は変えない(並べ直しをやり直しても、元のテーマがなくなっているため)。既存の meta は残す
     *
     * @param  list<int>  $poolIds
     */
    private static function tagKinds($stages, array $poolIds): void
    {
        $themeKeys = DB::table('question_themes')->pluck('key', 'id');
        $kindByTheme = config('courses.language_kind_by_theme');
        $found = [];
        $rows = DB::table('stage_questions')
            ->join('stages', 'stages.id', '=', 'stage_questions.stage_id')
            ->whereIn('stage_questions.stage_id', $stages->pluck('id'))
            ->orderBy('stages.stage_number')->orderBy('stages.id')
            ->get(['stage_questions.question_id', 'stages.question_theme_id']);
        foreach ($rows as $row) {
            $found[$row->question_id] ??= $kindByTheme[$themeKeys[$row->question_theme_id] ?? ''] ?? 'word';
        }

        foreach (Question::query()->whereIn('id', $poolIds)->get() as $question) {
            $meta = $question->meta ?? [];
            if (isset($meta['kind'])) {
                continue;
            }
            $question->update(['meta' => $meta + ['kind' => $found[$question->id] ?? 'word']]);
        }
    }
}
