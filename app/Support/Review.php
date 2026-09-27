<?php

namespace App\Support;

use App\Models\ProfileCurrencyLedger;
use App\Models\Question;
use App\Models\UserProfile;
use Illuminate\Support\Collection;

/**
 * 仲間からの復習(docs/design/2026-09-27-spru-wave-c-design.md 3-5)。
 * 「まちがえたままの問題」は列を作らず、答えの記録で問題ごとに一番新しい行が
 * answer_wrong のものとする(やり直しは記録を残さないので影響しない)。
 */
class Review
{
    private const ANSWER_REASONS = ['answer_correct', 'answer_wrong'];

    /** @return list<int> まちがえたのが古い順 */
    public static function questionIds(UserProfile $profile, ?int $limit = null): array
    {
        $latest = ProfileCurrencyLedger::query()
            ->selectRaw('MAX(id) as last_id')
            ->where('user_profile_id', $profile->id)
            ->whereIn('reason', self::ANSWER_REASONS)
            ->whereNotNull('question_id')
            ->groupBy('question_id');

        return ProfileCurrencyLedger::query()
            ->joinSub($latest, 'latest', 'latest.last_id', '=', 'profile_currency_ledger.id')
            ->where('profile_currency_ledger.reason', 'answer_wrong')
            ->orderBy('profile_currency_ledger.id')
            ->when($limit !== null, fn ($query) => $query->limit($limit))
            ->pluck('profile_currency_ledger.question_id')
            ->map(fn ($id) => (int) $id)
            ->all();
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
        $count = count(self::questionIds($profile, config('companions.review_size')));

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
        $ids = self::questionIds($profile, config('companions.review_size'));
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
        $profile->save();
        $partner = Bond::addToPartner($profile, config('companions.review_bonus'));

        return ['bond_gained' => $partner ? config('companions.review_bonus') : 0, 'partner' => $partner];
    }
}
