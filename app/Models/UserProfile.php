<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class UserProfile extends Model
{
    protected $fillable = [
        'name', 'hp', 'max_hp', 'xp', 'coins', 'level', 'combo', 'best_combo',
        'current_streak', 'best_streak', 'last_played_date',
    ];

    /**
     * ストリーク(継続プレイ)の日境界に使うタイムゾーン。サービスの主な利用者層に合わせて
     * 固定する(多言語対応でユーザーごとのタイムゾーンに分ける場合は要見直し、TASKS.md参照)。
     */
    private const STREAK_TIMEZONE = 'Asia/Tokyo';

    /** 何日おきにボーナスコインを付与するか */
    private const STREAK_BONUS_INTERVAL_DAYS = 7;

    private const STREAK_BONUS_COIN = 50;

    protected function casts(): array
    {
        return [
            'last_played_date' => 'date',
        ];
    }

    /**
     * コンボ(連続正解)は経済ロジックとは別に管理する通貨ではないため、
     * applyEconomy()とは別メソッドにしている。docs/AppInfo.mdが
     * 「最重要要素」の1つとして挙げる要素。
     *
     * @return array{combo: int, best_combo: int, milestone_bonus_coin: int}
     */
    public function registerComboResult(bool $correct): array
    {
        if ($correct) {
            $this->combo += 1;
            $this->best_combo = max($this->best_combo, $this->combo);
        } else {
            $this->combo = 0;
        }
        $this->save();

        $milestoneBonusCoin = ($correct && $this->combo > 0 && $this->combo % 5 === 0)
            ? 20
            : 0;

        return [
            'combo' => $this->combo,
            'best_combo' => $this->best_combo,
            'milestone_bonus_coin' => $milestoneBonusCoin,
        ];
    }

    /**
     * 毎日プレイのストリーク(継続日数)を更新する。1日1回だけカウントし
     * (同じ日に何問答えても増えない)、前日にプレイしていなければリセットする。
     * 日の境界はSTREAK_TIMEZONE(Asia/Tokyo)固定。docs/AppInfo.mdが
     * 「最重要要素」の1つとして挙げるが、これまで未実装だった(docs/AppRoadmap.md)。
     *
     * @return array{streak: int, best_streak: int, streak_extended_today: bool, milestone_bonus_coin: int}
     */
    public function registerDailyStreak(): array
    {
        $today = Carbon::now(self::STREAK_TIMEZONE)->toDateString();
        $lastPlayed = $this->last_played_date?->toDateString();

        if ($lastPlayed === $today) {
            return [
                'streak' => $this->current_streak,
                'best_streak' => $this->best_streak,
                'streak_extended_today' => false,
                'milestone_bonus_coin' => 0,
            ];
        }

        $yesterday = Carbon::now(self::STREAK_TIMEZONE)->subDay()->toDateString();
        $this->current_streak = $lastPlayed === $yesterday ? $this->current_streak + 1 : 1;
        $this->best_streak = max($this->best_streak, $this->current_streak);
        $this->last_played_date = $today;
        $this->save();

        $milestoneBonusCoin = $this->current_streak % self::STREAK_BONUS_INTERVAL_DAYS === 0
            ? self::STREAK_BONUS_COIN
            : 0;

        return [
            'streak' => $this->current_streak,
            'best_streak' => $this->best_streak,
            'streak_extended_today' => true,
            'milestone_bonus_coin' => $milestoneBonusCoin,
        ];
    }

    public function schema(): BelongsTo
    {
        return $this->belongsTo(UserSchema::class);
    }

    public function currencyLedger(): HasMany
    {
        return $this->hasMany(ProfileCurrencyLedger::class);
    }

    /**
     * @param  array<string,int>  $deltas  type(hp/coin/xp) => delta
     * @return array{leveled_up: bool, deltas: array<string,int>}
     */
    public function applyEconomy(array $deltas, string $reason, ?Question $question = null, ?Stage $stage = null): array
    {
        $leveledUp = false;

        foreach ($deltas as $type => $delta) {
            if ($delta === 0) {
                continue;
            }

            match ($type) {
                'hp' => $this->hp = max(0, min($this->max_hp, $this->hp + $delta)),
                'coin' => $this->coins = max(0, $this->coins + $delta),
                'xp' => $this->xp = max(0, $this->xp + $delta),
            };

            $this->currencyLedger()->create([
                'type' => $type,
                'delta' => $delta,
                'reason' => $reason,
                'question_id' => $question?->id,
                'stage_id' => $stage?->id,
            ]);
        }

        if (isset($deltas['xp'])) {
            $newLevel = intdiv($this->xp, 100) + 1;

            if ($newLevel > $this->level) {
                $this->level = $newLevel;
                $healAmount = $this->max_hp - $this->hp;
                $this->hp = $this->max_hp;
                $leveledUp = true;

                if ($healAmount > 0) {
                    $this->currencyLedger()->create([
                        'type' => 'hp',
                        'delta' => $healAmount,
                        'reason' => 'level_up_heal',
                    ]);
                }
            }
        }

        $this->save();

        return ['leveled_up' => $leveledUp, 'deltas' => $deltas];
    }
}
