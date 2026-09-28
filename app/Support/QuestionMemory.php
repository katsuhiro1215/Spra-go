<?php

namespace App\Support;

use App\Models\ProfileCurrencyLedger;
use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\UserProfile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 3章)。
 * 段階1〜5で、出す日以降に正解すると1つ上がり、段階5で正解すると「覚えた」。
 * まちがえるといつでも段階1・次の日。出す日より前の正解と、覚えた問題の正解では変わらない。
 */
class QuestionMemory
{
    public static function record(UserProfile $profile, int $questionId, bool $correct, ?string $today = null): void
    {
        self::apply($profile->id, $questionId, $correct, $today ?? Garden::today());
    }

    /**
     * 出す日が来た問題を、$preferCountryId の国の問題を先に、そのあと出す日が古い順に最大 $limit 個返す。
     * 覚えた問題・鍵の国の問題・$excludeIds は出さない
     *
     * @param  list<int>  $excludeIds
     * @return list<int>
     */
    public static function dueIds(UserProfile $profile, int $limit, array $excludeIds = [], ?int $preferCountryId = null): array
    {
        if ($limit <= 0) {
            return [];
        }

        return self::dueQuery($profile)
            ->when($excludeIds !== [], fn (Builder $query) => $query->whereNotIn('profile_question_memories.question_id', $excludeIds))
            ->when($preferCountryId !== null, fn (Builder $query) => $query->orderByRaw(
                'CASE WHEN questions.country_id = ? THEN 0 ELSE 1 END',
                [$preferCountryId],
            ))
            ->orderBy('profile_question_memories.due_on')
            ->orderBy('profile_question_memories.id')
            ->limit($limit)
            ->pluck('profile_question_memories.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public static function masteredCount(UserProfile $profile): int
    {
        return ProfileQuestionMemory::query()
            ->where('user_profile_id', $profile->id)
            ->whereNotNull('mastered_on')
            ->count();
    }

    /**
     * 今までの答えの記録から覚え具合を作る(設計書3-5)。1回の答えには必ず体力の行が1つあるので、
     * 体力の行だけを古い順に読み直す(正解は体力・XP・コイン・ポイントの4行になるため)。消された問題の記録は読み飛ばす
     */
    public static function rebuildFromLedger(): void
    {
        $questionIds = Question::query()->pluck('id')->flip();

        ProfileCurrencyLedger::query()
            ->where('type', 'hp')
            ->whereIn('reason', ['answer_correct', 'answer_wrong'])
            ->whereNotNull('question_id')
            ->lazyById(500)
            ->each(function (ProfileCurrencyLedger $row) use ($questionIds) {
                if (! $questionIds->has($row->question_id)) {
                    return;
                }
                self::apply(
                    $row->user_profile_id,
                    $row->question_id,
                    $row->reason === 'answer_correct',
                    $row->created_at->timezone(Garden::TIMEZONE)->toDateString(),
                );
            });
    }

    /** 出す日が来た問題(覚えていない・鍵の国の問題でない)。国のない問題は鍵にならない */
    private static function dueQuery(UserProfile $profile): Builder
    {
        $locked = Travel::lockedCountryIds($profile);

        return ProfileQuestionMemory::query()
            ->join('questions', 'questions.id', '=', 'profile_question_memories.question_id')
            ->where('profile_question_memories.user_profile_id', $profile->id)
            ->whereNull('profile_question_memories.mastered_on')
            ->where('profile_question_memories.due_on', '<=', Garden::today())
            ->when($locked !== [], fn (Builder $query) => $query->where(
                fn (Builder $inner) => $inner->whereNull('questions.country_id')->orWhereNotIn('questions.country_id', $locked),
            ));
    }

    private static function apply(int $profileId, int $questionId, bool $correct, string $today): void
    {
        $memory = ProfileQuestionMemory::query()->firstOrNew([
            'user_profile_id' => $profileId,
            'question_id' => $questionId,
        ]);

        if (! $memory->exists || ! $correct) {
            $memory->fill(['level' => 1, 'due_on' => self::daysAfter($today, 1), 'mastered_on' => null]);
        } elseif ($memory->mastered_on === null && $memory->due_on->toDateString() <= $today) {
            if ($memory->level >= 5) {
                $memory->fill(['due_on' => null, 'mastered_on' => $today]);
            } else {
                $level = $memory->level + 1;
                $memory->fill(['level' => $level, 'due_on' => self::daysAfter($today, config('review.intervals')[$level])]);
            }
        }

        $memory->last_answered_on = $today;
        $memory->save();
    }

    private static function daysAfter(string $date, int $days): string
    {
        return Carbon::parse($date)->addDays($days)->toDateString();
    }
}
