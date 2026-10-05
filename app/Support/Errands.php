<?php

namespace App\Support;

use App\Models\ProfileErrand;
use App\Models\UserProfile;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * 今日のおつかい(docs/design/2026-09-27-spru-wave-d-design.md 3-1)。
 * 進み具合は保存せず、今ある記録(答えの記録・水やりの日・復習の日・配置の更新時刻・あいさつ)から数える。
 */
class Errands
{
    /** 2つ目・3つ目の候補(「問題に5問正解する」は1つ目に必ず出す) */
    private const CHOICES = ['stage_clear', 'water', 'review', 'decorate', 'family_greet'];

    /** @return Collection<int, ProfileErrand> 今日のおつかい。まだ無ければ決める */
    public static function today(UserProfile $profile): Collection
    {
        $today = Garden::today();
        $errands = self::forDate($profile, $today);
        if ($errands->isNotEmpty()) {
            return $errands;
        }

        try {
            DB::transaction(function () use ($profile, $today) {
                foreach (self::plan($profile) as $i => $errand) {
                    $profile->errands()->create([...$errand, 'errand_on' => $today, 'slot' => $i + 1]);
                }
            });
        } catch (UniqueConstraintViolationException) {
            // 同時に開いて先に作られたときは、そちらを使う
        }

        return self::forDate($profile, $today);
    }

    /** 今日数えた進み具合(目標で止める) */
    public static function progress(UserProfile $profile, ProfileErrand $errand): int
    {
        $date = $errand->errand_on->toDateString();
        // 記録の時刻はUTCで保存しているので、日本時間の0時をUTCに直して比べる
        $since = Carbon::parse($date, Garden::TIMEZONE)->utc();

        $count = match ($errand->kind) {
            'correct' => self::ledgerCount($profile, 'answer_correct', 'xp', $since),
            'stage_clear' => self::ledgerCount($profile, 'stage_clear', 'point', $since),
            'water' => (int) $profile->seeds()->where('last_watered_on', $date)->exists(),
            'review' => (int) ($profile->last_review_on?->toDateString() === $date),
            'decorate' => (int) $profile->worldItems()->whereNotNull('x')->where('updated_at', '>=', $since)->exists(),
            'family_greet' => (int) $profile->sentGreetings()->where('greeted_on', $date)->exists(),
            default => 0,
        };

        return min($count, $errand->target);
    }

    /** @return array{date: string, items: list<array<string, mixed>>, bonus: array{amount: int, claimed: bool, gift_left: int}} */
    public static function state(UserProfile $profile): array
    {
        $errands = self::today($profile);
        $partner = Bond::partner($profile);

        return [
            'date' => Garden::today(),
            'items' => $errands->map(fn (ProfileErrand $errand) => [
                'slot' => $errand->slot,
                'kind' => $errand->kind,
                'target' => $errand->target,
                'progress' => self::progress($profile, $errand),
                'claimed' => $errand->claimed_at !== null,
                'giver' => $errand->giver === 'partner' && $partner
                    ? ['kind' => 'partner', 'key' => $partner->companion_key, 'name' => Bond::displayName($partner)]
                    : ['kind' => 'spru', 'key' => null, 'name' => 'スプル'],
            ])->values()->all(),
            'bonus' => [
                'amount' => config('world.errands.bonus'),
                'claimed' => $errands->every(fn (ProfileErrand $errand) => $errand->claimed_at !== null),
                // ずかんにまだ贈れる物の数(0なら、おくりものは出ない。docs/design/2026-10-05-bread-zukan-design.md)
                'gift_left' => max(0, count(Zukan::items()) - $profile->zukan()->count()),
            ],
        ];
    }

    /**
     * おつかいのごほうびを渡す。呼び出し側で、プロフィールを lockForUpdate してから呼ぶ。
     *
     * @return array{errands: array, points: int, gained: array{points: int, bonus: int, bond: int}, partner: ?array, gift: ?array}
     */
    public static function claim(UserProfile $profile, int $slot): array
    {
        $errand = self::today($profile)->firstWhere('slot', $slot);
        abort_unless($errand, 404);
        abort_if($errand->claimed_at !== null, 422, 'もう受け取ったよ');
        abort_if(self::progress($profile, $errand) < $errand->target, 422, 'まだおつかいが終わっていないよ');

        $errand->update(['claimed_at' => now()]);
        $reward = config('world.errands.reward');
        $profile->applyEconomy(['point' => $reward], 'errand');

        $bonus = 0;
        $gift = null;
        if (self::today($profile)->every(fn (ProfileErrand $e) => $e->claimed_at !== null)) {
            $bonus = config('world.errands.bonus');
            $profile->applyEconomy(['point' => $bonus], 'errand_bonus');
            // パン屋さんからのおくりもの(ずかん)。おまけと同じ日に1回だけ
            $gift = Zukan::gift($profile);
        }

        // 相棒のなかよし度は、受け取った時点の相棒に足す
        $partner = $errand->giver === 'partner' ? Bond::addToPartner($profile, config('world.errands.partner_bond')) : null;

        return [
            'errands' => self::state($profile),
            'points' => $profile->points,
            'gained' => ['points' => $reward, 'bonus' => $bonus, 'bond' => $partner ? config('world.errands.partner_bond') : 0],
            'partner' => $partner,
            'gift' => $gift,
        ];
    }

    /** @return Collection<int, ProfileErrand> */
    private static function forDate(UserProfile $profile, string $date): Collection
    {
        return $profile->errands()->where('errand_on', $date)->orderBy('slot')->get();
    }

    /** @return list<array{kind: string, target: int, giver: string}> */
    private static function plan(UserProfile $profile): array
    {
        $choices = array_values(array_filter(self::CHOICES, fn (string $kind) => self::available($profile, $kind)));
        shuffle($choices);
        $fallback = ['kind' => 'correct', 'target' => config('world.errands.fallback_target')];
        $second = isset($choices[0]) ? ['kind' => $choices[0], 'target' => 1] : $fallback;
        $third = isset($choices[1]) ? ['kind' => $choices[1], 'target' => 1] : $fallback;

        return [
            ['kind' => 'correct', 'target' => config('world.errands.first_target'), 'giver' => 'spru'],
            [...$second, 'giver' => 'spru'],
            [...$third, 'giver' => Bond::partner($profile) ? 'partner' : 'spru'],
        ];
    }

    /** おつかいが決まる時点で、その日に出せるか(設計書3-1の表) */
    private static function available(UserProfile $profile, string $kind): bool
    {
        return match ($kind) {
            'stage_clear' => true,
            'water' => self::canWaterToday($profile),
            'review' => Review::state($profile)['available'],
            'decorate' => $profile->worldItems()->exists(),
            'family_greet' => Family::others($profile)->isNotEmpty(),
            default => false,
        };
    }

    /** 畑に種か芽があり、今日まだ水をあげていない(今日正解したかは見ない) */
    private static function canWaterToday(UserProfile $profile): bool
    {
        $seed = Garden::activeSeed($profile);

        return $seed !== null && $seed->last_watered_on?->toDateString() !== Garden::today();
    }

    private static function ledgerCount(UserProfile $profile, string $reason, string $type, Carbon $since): int
    {
        return $profile->currencyLedger()
            ->where('reason', $reason)
            ->where('type', $type)
            ->where('created_at', '>=', $since)
            ->count();
    }
}
