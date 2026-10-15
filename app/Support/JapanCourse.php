<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageDraw;
use App\Models\ProfileStageProgress;
use App\Models\Question;
use App\Models\Stage;
use Illuminate\Support\Facades\DB;

/**
 * 日本のメインの道を、級ごとに「8つの分野(1分野＝1ステージ)＋ボス」の9ステージに並べ直す(docs/design/2026-10-21-japan-themed-course-design.md)。
 * 分野の問題は、取り込みのステージ(番号 20+分野の番号)と、前からあった問題(地図・祝日行事)から集める。
 * ステージの意味が変わったとき(テーマの名前が変わったとき)だけ、そのステージの進み具合・抽選の記録を消す。何度実行しても同じ結果になる
 */
class JapanCourse
{
    /** @return array{stages: int, pool: int} */
    public static function build(Country $country, Category $category): array
    {
        return DB::transaction(function () use ($country, $category) {
            $totals = ['stages' => 0, 'pool' => 0];
            $all = Stage::query()->where('category_id', $category->id)->where('country_id', $country->id)->get()->groupBy('difficulty');

            foreach (config('japan_course.levels') as $difficulty => $level) {
                $built = self::buildLevel($country, $category, $difficulty, $all->get($difficulty) ?? collect(), $level);
                $totals['stages'] += $built['stages'];
                $totals['pool'] += $built['pool'];
            }

            return $totals;
        });
    }

    /** @return array{stages: int, pool: int} */
    private static function buildLevel(Country $country, Category $category, string $difficulty, $existing, array $level): array
    {
        $offset = config('japan_course.import_offset');
        $fields = config('japan_course.fields');
        $legacy = config('japan_course.legacy_stages');

        // 分野ごとの問題(難しさの低い順。難しさのない問題は、真ん中の3)
        $byField = [];
        $imported = false;
        foreach ($existing as $stage) {
            $field = $stage->stage_number - $offset;
            if (isset($fields[$field])) {
                $imported = true;
            } elseif (isset($legacy[$stage->stage_number])) {
                $field = $legacy[$stage->stage_number];
            } else {
                continue;
            }
            foreach (DB::table('stage_questions')->where('stage_id', $stage->id)->orderBy('order')->pluck('question_id') as $id) {
                $byField[$field][(int) $id] = true;
            }
        }
        // 原稿を取り込んでいない級は、いまのまま(道を壊さない)
        if (! $imported) {
            return ['stages' => 0, 'pool' => 0];
        }

        // 難しさ(grade)のない問題(前からあった地図・祝日行事)には、級に合う印を書く(初級2・中級3・上級4)。ステージのなかの並びに使う
        $default = ['初級' => 2, '中級' => 3, '上級' => 4][$difficulty] ?? 3;
        $grades = [];
        foreach (Question::query()->whereIn('id', collect($byField)->flatMap(fn ($ids) => array_keys($ids))->unique()->all())->get() as $question) {
            $meta = $question->meta ?? [];
            // 絵・地図のない問題には、その国の国旗を出さない(食べ物の問題に日の丸が出てしまうため)
            $extra = (isset($meta['grade']) ? [] : ['grade' => $default])
                + (isset($meta['image']) || isset($meta['map']) || isset($meta['no_flag']) ? [] : ['no_flag' => true]);
            if ($extra !== []) {
                $question->meta = $meta + $extra;
                $question->save();
            }
            $grades[$question->id] = (int) ($question->meta['grade']);
        }
        $byField = array_map(function (array $ids) use ($grades) {
            $list = array_keys($ids);
            usort($list, fn (int $a, int $b) => [$grades[$a], $a] <=> [$grades[$b], $b]);

            return $list;
        }, $byField);

        $title = $existing->first(fn (Stage $stage) => $stage->is_boss && $stage->title_reward)?->title_reward ?? config('japan_course.boss_title');
        $totals = ['stages' => 0, 'pool' => 0];

        foreach ($fields as $number => $name) {
            $ids = $byField[$number] ?? [];
            if ($ids === []) {
                continue;
            }
            self::upsert($country, $category, $difficulty, $number, $name, $level['draw'], false, null, $ids);
            $totals['stages']++;
            $totals['pool'] += count($ids);
        }

        // ボス: 全分野のまとめ。先頭の5問(固定)が、いろいろな分野の難しい問題になるように、分野を順に回って、難しい順に集める
        $boss = [];
        $queues = array_map('array_reverse', $byField);
        while ($queues !== []) {
            foreach (array_keys($queues) as $field) {
                $boss[] = array_shift($queues[$field]);
                if ($queues[$field] === []) {
                    unset($queues[$field]);
                }
            }
        }
        $bossNumber = count($fields) + 1;
        self::upsert($country, $category, $difficulty, $bossNumber, '日本のまとめ', $level['boss'], true, $title, $boss);
        $totals['stages']++;
        $totals['pool'] += count($boss);

        // 取り込みのステージ・前の道の余りのステージを消す(ボスより後ろの番号)
        Stage::query()->where('category_id', $category->id)->where('country_id', $country->id)->where('difficulty', $difficulty)
            ->where('stage_number', '>', $bossNumber)->delete();

        return $totals;
    }

    /** @param list<int> $ids */
    private static function upsert(Country $country, Category $category, string $difficulty, int $number, string $themeName, int $draw, bool $boss, ?string $title, array $ids): void
    {
        $stage = Stage::query()->firstOrNew(['category_id' => $category->id, 'country_id' => $country->id, 'difficulty' => $difficulty, 'stage_number' => $number]);
        $meaningChanged = $stage->exists && $stage->theme_name !== $themeName;

        $stage->fill([
            'theme_name' => $themeName,
            'question_count' => $draw,
            'is_boss' => $boss,
            'is_pool' => true,
            'reward_percent' => config($boss ? 'courses.boss_reward_percent' : 'courses.normal_reward_percent'),
            'title_reward' => $boss ? $title : null,
        ])->save();

        // ステージの中身が別のものになったときは、前の進み具合(クリア・点数・抽選)を消す
        if ($meaningChanged) {
            ProfileStageProgress::query()->where('stage_id', $stage->id)->delete();
            ProfileStageDraw::query()->where('stage_id', $stage->id)->delete();
        }

        $sync = [];
        foreach ($ids as $index => $id) {
            $sync[$id] = ['order' => $index + 1];
        }
        $stage->questions()->sync($sync);
    }
}
