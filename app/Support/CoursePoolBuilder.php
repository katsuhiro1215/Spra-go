<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Country;
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
        $category = Category::query()
            ->where('name', $country->name)
            ->whereIn('parent_id', Category::query()->where('name', config('courses.country_root'))->whereNull('parent_id')->select('id'))
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
}
