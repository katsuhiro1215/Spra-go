<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserProfile extends Model
{
    protected $fillable = ['name', 'hp', 'max_hp', 'xp', 'coins', 'level'];

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
