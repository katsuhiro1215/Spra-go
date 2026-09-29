<?php

namespace App\Support;

use App\Models\Question;
use App\Models\UserProfile;
use Illuminate\Support\Collection;

/**
 * 仲間からの復習(docs/design/2026-09-27-spru-wave-c-design.md 3-5)。出す問題は、問題ごとの覚え具合で
 * 出す日が来た問題(docs/design/2026-09-29-spaced-review-design.md 4-7)。
 */
class Review
{
    /** @return list<int> 出す日が古い順。$limit を省くと config('review.daily_size') */
    public static function questionIds(UserProfile $profile, ?int $limit = null): array
    {
        return QuestionMemory::dueIds($profile, $limit ?? config('review.daily_size'));
    }

    public static function doneToday(UserProfile $profile): bool
    {
        return $profile->last_review_on?->toDateString() === Garden::today();
    }

    /** @return array{kind: string, key: ?string, name: string} 相棒がいれば相棒、いなければスプル */
    public static function giver(UserProfile $profile): array
    {
        $partner = Bond::partner($profile);

        return $partner
            ? ['kind' => 'companion', 'key' => $partner->companion_key, 'name' => Bond::displayName($partner)]
            : ['kind' => 'spru', 'key' => null, 'name' => 'スプル'];
    }

    /** @return array{available: bool, count: int, giver: array{kind: string, key: ?string, name: string}} */
    public static function state(UserProfile $profile): array
    {
        $count = count(self::questionIds($profile, config('review.daily_size')));

        return [
            'available' => $count > 0 && ! self::doneToday($profile),
            'count' => $count,
            'giver' => self::giver($profile),
        ];
    }

    /** @return Collection<int, Question> 今日出す問題(正解の手がかりを隠した形) */
    public static function questions(UserProfile $profile): Collection
    {
        abort_if(self::doneToday($profile), 422, '今日の復習はもう終わったよ。また明日ね');
        $ids = self::questionIds($profile, config('review.daily_size'));
        abort_if($ids === [], 422, '復習する問題はないよ');

        $questions = Question::query()
            ->with(['choices', 'country'])
            ->whereIn('id', $ids)
            ->get(['id', 'type', 'prompt', 'country_id', 'meta'])
            ->sortBy(fn (Question $question) => array_search($question->id, $ids, true))
            ->values();

        return PlayableQuestion::present($questions);
    }

    /**
     * 今日の復習をやりきった記録を付け、相棒に review_bonus を足す。呼び出し側で lockForUpdate してから呼ぶ。
     *
     * @return array{bond_gained: int, partner: ?array}
     */
    public static function complete(UserProfile $profile): array
    {
        abort_if(self::doneToday($profile), 422, '今日の復習はもう終わったよ。また明日ね');

        $profile->last_review_on = Garden::today();
        // アンバーの種の条件(docs/design/2026-09-29-rare-spru-design.md 3-1)
        $profile->reviews_completed++;
        $profile->save();
        $partner = Bond::addToPartner($profile, config('companions.review_bonus'));

        return ['bond_gained' => $partner ? config('companions.review_bonus') : 0, 'partner' => $partner];
    }
}
