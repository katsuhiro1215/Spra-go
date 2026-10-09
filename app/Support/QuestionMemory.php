<?php

namespace App\Support;

use App\Models\ProfileCurrencyLedger;
use App\Models\ProfileQuestionMemory;
use App\Models\ProfileWord;
use App\Models\Question;
use App\Models\UserProfile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 3章)。
 * 段階1〜5で、出す日以降に正解すると1つ上がり、段階5で正解すると「覚えた」。
 * まちがえるといつでも段階1・次の日。出す日より前の正解と、覚えた問題の正解では変わらない。
 */
class QuestionMemory
{
    /** 問題の「所」: 国があれば c{国id}、なければステージのカテゴリ(子は親)の k{id}。どちらもなければ NULL */
    private const AREA = "COALESCE(CONCAT('c', questions.country_id), CONCAT('k', (SELECT COALESCE(cat.parent_id, cat.id) FROM stage_questions sq JOIN stages st ON st.id = sq.stage_id JOIN categories cat ON cat.id = st.category_id WHERE sq.question_id = questions.id ORDER BY st.id LIMIT 1)))";

    /**
     * 答えを覚え具合に書く。返すのは、復習の一言の種類(docs/design/2026-10-09-review-variety-design.md 5章)。出さないときは null
     *
     * @return array{event: string, days: ?int}|null
     */
    public static function record(UserProfile $profile, int $questionId, bool $correct, ?string $today = null): ?array
    {
        $event = self::apply($profile->id, $questionId, $correct, $today ?? Garden::today());
        Words::encounter($profile->id, $questionId); // 単語帳: この問題の語に出会った(docs/design/2026-10-07-word-book-design.md 5章)

        return $event;
    }

    /**
     * 出す日が来た問題を、$preferCountryId の国の問題を先に、そのあと出す日が古い順に最大 $limit 個返す。
     * 覚えた問題・鍵の国の問題・$excludeIds は出さない
     *
     * @param  list<int>  $excludeIds
     * @return list<int>
     */
    public static function dueIds(UserProfile $profile, int $limit, array $excludeIds = [], ?int $preferCountryId = null, ?int $rootCategoryId = null): array
    {
        if ($limit <= 0) {
            return [];
        }

        return self::narrow(self::dueQuery($profile), $excludeIds, $preferCountryId, $rootCategoryId)
            ->orderBy('profile_question_memories.due_on')
            ->orderBy('profile_question_memories.id')
            ->limit($limit)
            ->pluck('profile_question_memories.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * 優先の枠(docs/design/2026-10-09-review-priority-design.md 4-2)で、問題を最大 $limit 個返す。
     * $slot: recent_wrong(7日以内にまちがえた・出す日が来た・新しい順) / weak(苦手の語・出す日が来たか、3日あいた・古い順) /
     * almost(段階5で出す日が来た・出す日が古い順)。覚えた問題・鍵の国・国旗キャッチ専用・$excludeIds は出さない(苦手の語は覚えた問題も出す)
     *
     * @param  list<int>  $excludeIds
     * @return list<int>
     */
    public static function slotIds(UserProfile $profile, string $slot, int $limit, array $excludeIds = [], ?int $preferCountryId = null, ?int $rootCategoryId = null): array
    {
        if ($limit <= 0) {
            return [];
        }

        $today = Garden::today();
        $config = config('review.priority');

        $hot = $slot === 'now' ? self::hotArea($profile) : null;
        if ($slot === 'now' && $hot === null) {
            return [];
        }

        $query = match ($slot) {
            'now' => self::dueQuery($profile)->whereRaw(self::AREA.' = ?', [$hot]),
            'recent_wrong' => self::dueQuery($profile)
                ->where('profile_question_memories.wrong_on', '>=', self::daysAfter($today, -$config['recent_wrong_days'])),
            'weak' => self::weakQuery($profile, $today, $config['weak_gap_days']),
            'almost' => self::dueQuery($profile)->where('profile_question_memories.level', '>=', 5),
        };
        self::narrow($query, $excludeIds, $preferCountryId, $rootCategoryId);
        match ($slot) {
            'recent_wrong' => $query->orderByDesc('profile_question_memories.wrong_on'),
            'weak' => $query->orderBy('profile_question_memories.last_answered_on'),
            'almost', 'now' => $query->orderBy('profile_question_memories.due_on'),
        };

        return $query
            ->orderBy('profile_question_memories.id')
            ->limit($limit)
            ->pluck('profile_question_memories.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * 今学んでいる所(docs/design/2026-10-09-review-now-area-design.md): 直近 window_days 日に答えた問題を所ごとに数え、最も多い所
     * (同数は最後に答えた日が新しいほう)。所のない問題は数えない。記録がなければ null
     */
    public static function hotArea(UserProfile $profile): ?string
    {
        $since = self::daysAfter(Garden::today(), -(config('review.priority.window_days') - 1));

        return self::baseQuery($profile)
            ->where('profile_question_memories.last_answered_on', '>=', $since)
            ->whereRaw(self::AREA.' IS NOT NULL')
            ->groupBy(DB::raw(self::AREA))
            ->orderByRaw('COUNT(*) DESC')
            ->orderByRaw('MAX(profile_question_memories.last_answered_on) DESC')
            ->selectRaw(self::AREA.' AS area')
            ->value('area');
    }

    public static function masteredCount(UserProfile $profile): int
    {
        return ProfileQuestionMemory::query()
            ->where('user_profile_id', $profile->id)
            ->whereNotNull('mastered_on')
            ->count();
    }

    /**
     * 最後の答えがまちがいだった問題を、まちがえた日の新しい順に最大 $limit 個返す。$questionIds の中から選ぶ
     * (スプルキャッチ。docs/design/2026-09-29-spru-catch-design.md 4-2)
     *
     * @param  list<int>  $questionIds
     * @return list<int>
     */
    public static function wrongIdsAmong(UserProfile $profile, array $questionIds, int $limit): array
    {
        if ($limit <= 0 || $questionIds === []) {
            return [];
        }

        return ProfileQuestionMemory::query()
            ->where('user_profile_id', $profile->id)
            ->whereIn('question_id', $questionIds)
            ->whereNotNull('wrong_on')
            ->orderByDesc('wrong_on')
            ->orderByDesc('id')
            ->limit($limit)
            ->pluck('question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * 出す日が来た問題を、出す日の古い順に最大 $limit 個返す。$questionIds の中から選ぶ(覚えた問題・鍵の国の問題は出さない)
     *
     * @param  list<int>  $questionIds
     * @return list<int>
     */
    public static function dueIdsAmong(UserProfile $profile, array $questionIds, int $limit): array
    {
        if ($limit <= 0 || $questionIds === []) {
            return [];
        }

        return self::dueQuery($profile)
            ->whereIn('profile_question_memories.question_id', $questionIds)
            ->orderBy('profile_question_memories.due_on')
            ->orderBy('profile_question_memories.id')
            ->limit($limit)
            ->pluck('profile_question_memories.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
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

    /** 覚え具合の行と問題を結んだもの(鍵の国の問題でない。国のない問題は鍵にならない) */
    private static function baseQuery(UserProfile $profile): Builder
    {
        $locked = Travel::lockedCountryIds($profile);

        return ProfileQuestionMemory::query()
            ->join('questions', 'questions.id', '=', 'profile_question_memories.question_id')
            ->where('profile_question_memories.user_profile_id', $profile->id)
            ->when($locked !== [], fn (Builder $query) => $query->where(
                fn (Builder $inner) => $inner->whereNull('questions.country_id')->orWhereNotIn('questions.country_id', $locked),
            ));
    }

    /** 出す日が来た問題(覚えていない・鍵の国の問題でない)。国のない問題は鍵にならない */
    private static function dueQuery(UserProfile $profile): Builder
    {
        return self::baseQuery($profile)
            ->whereNull('profile_question_memories.mastered_on')
            ->where('profile_question_memories.due_on', '<=', Garden::today());
    }

    /** 苦手にした語(profile_words.status = weak)の問題で、出す日が来たもの、または最後に答えてから $gapDays 日以上あいたもの(覚えた問題も含む) */
    private static function weakQuery(UserProfile $profile, string $today, int $gapDays): Builder
    {
        $weakWordIds = ProfileWord::query()
            ->where('user_profile_id', $profile->id)
            ->where('status', ProfileWord::WEAK)
            ->select('word_id');

        return self::baseQuery($profile)
            ->whereIn(DB::raw('CAST(JSON_UNQUOTE(JSON_EXTRACT(questions.meta, "$.word_id")) AS UNSIGNED)'), $weakWordIds)
            ->where(fn (Builder $inner) => $inner
                ->where(fn (Builder $due) => $due
                    ->whereNull('profile_question_memories.mastered_on')
                    ->where('profile_question_memories.due_on', '<=', $today))
                ->orWhere('profile_question_memories.last_answered_on', '<=', self::daysAfter($today, -$gapDays)));
    }

    /**
     * 出す問題の共通の絞り込み: 国旗キャッチ専用の問題は、ステージのおさらいと仲間の復習には出さない(国旗キャッチの中は dueIdsAmong)。
     * $excludeIds は出さない。$preferCountryId の国の問題を先に並べる(並べ替えの先頭に足す)。
     * $rootCategoryId があれば、その大もとのカテゴリのステージにある問題だけ(ステージのおさらいで、ほかのカテゴリの問題を混ぜない)
     *
     * @param  list<int>  $excludeIds
     */
    private static function narrow(Builder $query, array $excludeIds, ?int $preferCountryId, ?int $rootCategoryId = null): Builder
    {
        return $query
            ->whereNull('questions.meta->catch_only')
            ->when($rootCategoryId !== null, fn (Builder $inner) => $inner->whereExists(fn ($sub) => $sub
                ->selectRaw('1')
                ->from('stage_questions as sq')
                ->join('stages as st', 'st.id', '=', 'sq.stage_id')
                ->join('categories as cat', 'cat.id', '=', 'st.category_id')
                ->whereColumn('sq.question_id', 'profile_question_memories.question_id')
                ->whereRaw('COALESCE(cat.parent_id, cat.id) = ?', [$rootCategoryId])))
            ->when($excludeIds !== [], fn (Builder $inner) => $inner->whereNotIn('profile_question_memories.question_id', $excludeIds))
            ->when($preferCountryId !== null, fn (Builder $inner) => $inner->orderByRaw(
                'CASE WHEN questions.country_id = ? THEN 0 ELSE 1 END',
                [$preferCountryId],
            ));
    }

    /** @return array{event: string, days: ?int}|null */
    private static function apply(int $profileId, int $questionId, bool $correct, string $today): ?array
    {
        $memory = ProfileQuestionMemory::query()->firstOrNew([
            'user_profile_id' => $profileId,
            'question_id' => $questionId,
        ]);

        // 答える前の状態(復習の一言のため)
        $existed = $memory->exists;
        $beforeLevel = $memory->level;
        $beforeMastered = $memory->mastered_on !== null;
        $beforeWrong = $memory->wrong_on !== null;
        $beforeLast = $memory->last_answered_on?->toDateString();

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

        // 最後の答えがまちがいだった日(スプルキャッチ。docs/design/2026-09-29-spru-catch-design.md 4-4)
        $memory->wrong_on = $correct ? null : $today;
        $memory->last_answered_on = $today;
        $memory->save();

        return $correct && $existed ? self::event($memory, $beforeLevel, $beforeMastered, $beforeWrong, $beforeLast, $today) : null;
    }

    /**
     * 復習の一言(設計書5-1)。優先: 覚えた → まちがえたあとの正解 → あと1回で覚える → 何日かぶり
     *
     * @return array{event: string, days: ?int}|null
     */
    private static function event(ProfileQuestionMemory $memory, ?int $beforeLevel, bool $beforeMastered, bool $beforeWrong, ?string $beforeLast, string $today): ?array
    {
        if (! $beforeMastered && $memory->mastered_on !== null) {
            return ['event' => 'mastered', 'days' => null];
        }
        if ($beforeMastered) {
            return null;
        }
        if ($beforeWrong) {
            return ['event' => 'recovered', 'days' => null];
        }
        if (($beforeLevel ?? 0) < 5 && $memory->level >= 5) {
            return ['event' => 'almost', 'days' => null];
        }
        if ($beforeLast !== null) {
            $days = (int) Carbon::parse($beforeLast)->diffInDays(Carbon::parse($today));
            if ($days >= 3) {
                return ['event' => 'returned', 'days' => $days];
            }
        }

        return null;
    }

    private static function daysAfter(string $date, int $days): string
    {
        return Carbon::parse($date)->addDays($days)->toDateString();
    }
}
