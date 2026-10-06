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
