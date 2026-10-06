<?php

namespace App\Support;

use App\Models\ProfileQuestionMemory;
use App\Models\ProfileStageDraw;
use App\Models\Question;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * プールのステージで出す問題を選ぶ(docs/design/2026-10-06-prefecture-master-design.md 3章)。
 * 選んだ問題の id を、並べ替えて返し、次の回のために保存する
 */
class StageDraw
{
    /** @return list<int> */
    public static function pick(UserProfile $profile, Stage $stage): array
    {
        $pool = $stage->questions()->orderBy('stage_questions.order')->pluck('questions.id')->map(fn ($id) => (int) $id)->all();
        $count = $stage->playCount();

        if (count($pool) <= $count) {
            return self::arrange($pool);
        }

        if (self::isLanguageStage($stage)) {
            return self::pickLanguage($profile, $stage, $pool, $count);
        }

        $config = config('quiz.draw');
        $chosen = [];

        if ($stage->is_boss) {
            $chosen = array_slice($pool, 0, min($config['anchor'], $count));
        } else {
            $previous = ProfileStageDraw::query()->where('user_profile_id', $profile->id)->where('stage_id', $stage->id)->first();
            $kept = array_values(array_intersect($previous?->question_ids ?? [], $pool));
            shuffle($kept);
            $chosen = array_slice($kept, 0, min($config['keep'], $count));
        }

        $memories = ProfileQuestionMemory::query()->where('user_profile_id', $profile->id)->whereIn('question_id', $pool)->get();

        $wrong = $memories->whereNotNull('wrong_on')->sortByDesc('wrong_on')->pluck('question_id')->map(fn ($id) => (int) $id)
            ->reject(fn (int $id) => in_array($id, $chosen, true))->take($config['wrong_max'])->all();
        $chosen = array_merge($chosen, array_slice($wrong, 0, $count - count($chosen)));

        $seen = $memories->pluck('question_id')->map(fn ($id) => (int) $id)->all();
        $rest = array_values(array_diff($pool, $chosen));
        $unseen = array_values(array_diff($rest, $seen));
        $answered = array_values(array_intersect($rest, $seen));
        shuffle($unseen);
        shuffle($answered);
        $chosen = array_merge($chosen, array_slice(array_merge($unseen, $answered), 0, $count - count($chosen)));

        ProfileStageDraw::updateOrCreate(
            ['user_profile_id' => $profile->id, 'stage_id' => $stage->id],
            ['question_ids' => $chosen],
        );

        return self::arrange($chosen);
    }

    /** 言語のコース(「◯◯語を学ぶ」。国に結びつかないステージ)か */
    private static function isLanguageStage(Stage $stage): bool
    {
        return $stage->country_id === null && (bool) $stage->category?->is_language_mode;
    }

    /** 言語コースのステージの文章の割合(%)。ステージ1とステージ7の間を直線でつなぐ。ボス・設定のない級は null */
    public static function sentencePercent(Stage $stage): ?int
    {
        $mix = config('courses.language_mix')[$stage->difficulty] ?? null;
        if ($mix === null || $stage->is_boss) {
            return null;
        }
        [$first, $atSeven] = $mix;
        $number = min(7, max(1, $stage->stage_number));

        return (int) round($first + ($atSeven - $first) * ($number - 1) / 6);
    }

    /**
     * 英語コースのステージが受け持つレベルの範囲 [最初, 最後]。ステージ1〜9が、級のレベルを順に9つに分ける(余りは前のステージから1つずつ)。
     * ボス・設定のない級は null(級全体)。docs/design/2026-10-07-english-levels-design.md 4-3
     *
     * @return array{0: int, 1: int}|null
     */
    public static function levelRange(Stage $stage): ?array
    {
        $levels = config('courses.language_levels')[$stage->difficulty] ?? null;
        $definition = config('courses.default')[$stage->difficulty] ?? null;
        if ($levels === null || $definition === null || $stage->is_boss) {
            return null;
        }

        [$first, $last] = $levels;
        $count = $definition['stages'] - 1;
        $span = $last - $first + 1;
        $base = intdiv($span, $count);
        $extra = $span % $count;
        $index = min($count, max(1, $stage->stage_number)) - 1;
        $start = $first + $index * $base + min($index, $extra);

        return [$start, $start + $base + ($index < $extra ? 1 : 0) - 1];
    }

    /** 英語→日本語の割合(%)。問題のレベルが属する区分で決まる(設計書 4-4) */
    public static function directionShare(int $level): int
    {
        $shares = config('courses.direction_share');
        ksort($shares);
        foreach ($shares as $upTo => $share) {
            if ($level <= $upTo) {
                return $share;
            }
        }

        return (int) end($shares);
    }

    /**
     * 言語コースの選び方(言語コースの設計書 4-2・4-3、英語のレベルの設計書 4-3・4-4)。
     * 1. 語(meta.word)ごとに、向きを割合で決めて1問にまとめる(同じ語を1ステージで2回出さない)
     * 2. レベル(meta.level)のあるコースは、ボス以外は、ステージの範囲の問題と、前の範囲(復習。出す数の review_share% まで)から選ぶ。範囲より後のレベルは、足りないときだけ
     * 3. ボスは先頭5問を固定し、残りを種類を分けずに選ぶ
     * 選び順: まちがえた問題(全体で最大 wrong_max) → 答えたことのある問題(必要数の learned_share% まで) → まだ答えていない問題 → 残りの答えたことのある問題。
     * 文章の割合で単語と文章の数を決め、足りない種類は、もう一方で埋める
     *
     * @param  list<int>  $pool
     * @return list<int>
     */
    private static function pickLanguage(UserProfile $profile, Stage $stage, array $pool, int $count): array
    {
        $memories = ProfileQuestionMemory::query()->where('user_profile_id', $profile->id)->whereIn('question_id', $pool)->get();
        $wrongIds = $memories->whereNotNull('wrong_on')->sortByDesc('wrong_on')->pluck('question_id')->map(fn ($id) => (int) $id)->all();
        $learnedIds = $memories->pluck('question_id')->map(fn ($id) => (int) $id)->all();
        $metas = Question::query()->whereIn('id', $pool)->get(['id', 'meta'])->mapWithKeys(fn (Question $q) => [$q->id => $q->meta ?? []])->all();
        $kinds = array_map(fn (array $meta) => $meta['kind'] ?? 'word', $metas);

        // 語ごとに向きを決めて、1問にまとめる。答えた・まちがえた記録は、同じ語のどちらの向きでも、選んだ問題の記録とみなす
        $byWord = [];
        foreach ($pool as $id) {
            if (isset($metas[$id]['word'])) {
                $byWord[$metas[$id]['word']][] = $id;
            }
        }
        $candidates = [];
        $seenWords = [];
        foreach ($pool as $id) {
            $word = $metas[$id]['word'] ?? null;
            if ($word === null) {
                $candidates[] = $id;

                continue;
            }
            if (isset($seenWords[$word])) {
                continue;
            }
            $seenWords[$word] = true;
            $group = $byWord[$word];
            $chosenId = $group[0];
            if (count($group) > 1) {
                $wanted = random_int(1, 100) <= self::directionShare((int) ($metas[$id]['level'] ?? 1)) ? 'en_ja' : 'ja_en';
                $chosenId = collect($group)->first(fn (int $member) => ($metas[$member]['direction'] ?? null) === $wanted) ?? $group[0];
                if (array_intersect($group, $wrongIds) !== []) {
                    $wrongIds[] = $chosenId;
                }
                if (array_intersect($group, $learnedIds) !== []) {
                    $learnedIds[] = $chosenId;
                }
            }
            $candidates[] = $chosenId;
        }

        $wrongLeft = config('quiz.draw')['wrong_max'];
        $take = function (array $list, int $need) use ($wrongIds, $learnedIds, &$wrongLeft): array {
            $wrong = array_slice(array_values(array_intersect($wrongIds, $list)), 0, max(0, $wrongLeft));
            $wrongLeft -= count($wrong);
            $others = array_values(array_diff($list, $wrong));
            $learned = array_values(array_intersect($others, $learnedIds));
            $fresh = array_values(array_diff($others, $learnedIds));
            shuffle($learned);
            shuffle($fresh);
            $learnedFirst = array_slice($learned, 0, (int) ceil($need * config('courses.learned_share') / 100));
            $ordered = [...$wrong, ...$learnedFirst, ...$fresh, ...array_slice($learned, count($learnedFirst))];

            return array_slice($ordered, 0, max(0, $need));
        };

        if ($stage->is_boss) {
            $chosen = array_slice($candidates, 0, min(config('quiz.draw')['anchor'], $count));
            $chosen = [...$chosen, ...$take(array_values(array_diff($candidates, $chosen)), $count - count($chosen))];
        } else {
            $range = self::levelRange($stage);
            $levelOf = fn (int $id) => $metas[$id]['level'] ?? null;
            $current = $range === null ? $candidates : array_values(array_filter($candidates, fn (int $id) => $levelOf($id) === null || ($levelOf($id) >= $range[0] && $levelOf($id) <= $range[1])));
            $earlier = $range === null ? [] : array_values(array_filter($candidates, fn (int $id) => $levelOf($id) !== null && $levelOf($id) < $range[0]));

            $sentenceNeed = (int) round($count * (self::sentencePercent($stage) ?? 0) / 100);
            $chosen = [];
            foreach (['sentence' => $sentenceNeed, 'word' => $count - $sentenceNeed] as $kind => $need) {
                $now = array_values(array_filter($current, fn (int $id) => ($kinds[$id] === 'sentence') === ($kind === 'sentence')));
                $before = array_values(array_filter($earlier, fn (int $id) => ($kinds[$id] === 'sentence') === ($kind === 'sentence')));
                $review = min(count($before), (int) round($need * config('courses.review_share') / 100));
                $chosen = [...$chosen, ...$take($now, $need - $review), ...$take($before, $review)];
            }
            // 足りないときは、範囲の中のもう一方の種類 → 前の範囲 → (最後に)範囲より後のレベルで埋める
            foreach ([$current, $earlier, $candidates] as $source) {
                if (count($chosen) < $count) {
                    $chosen = [...$chosen, ...$take(array_values(array_diff($source, $chosen)), $count - count($chosen))];
                }
            }
        }

        ProfileStageDraw::updateOrCreate(
            ['user_profile_id' => $profile->id, 'stage_id' => $stage->id],
            ['question_ids' => $chosen],
        );

        return self::arrange($chosen);
    }

    /**
     * 同じ問題文が続かないように並べる(できる範囲で)。残りの多い問題文から先に置く
     *
     * @param  list<int>  $ids
     * @return list<int>
     */
    private static function arrange(array $ids): array
    {
        shuffle($ids);
        $groups = Question::query()->whereIn('id', $ids)->pluck('prompt', 'id')->all();
        $byPrompt = [];
        foreach ($ids as $id) {
            $byPrompt[$groups[$id]][] = $id;
        }

        $result = [];
        $last = null;
        while ($byPrompt !== []) {
            uasort($byPrompt, fn (array $a, array $b) => count($b) <=> count($a));
            $prompt = array_key_first($byPrompt);
            if ($prompt === $last && count($byPrompt) > 1) {
                $prompt = array_keys($byPrompt)[1];
            }
            $result[] = array_shift($byPrompt[$prompt]);
            if ($byPrompt[$prompt] === []) {
                unset($byPrompt[$prompt]);
            }
            $last = $prompt;
        }

        return $result;
    }
}
