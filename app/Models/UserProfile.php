<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserProfile extends Model
{
    protected $fillable = ['name', 'hp', 'max_hp', 'xp', 'coins', 'level', 'combo', 'best_combo'];

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
