<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoinPurchase extends Model
{
    protected $fillable = [
        'user_profile_id',
        'package_key',
        'coins',
        'amount',
        'currency',
        'stripe_checkout_session_id',
        'status',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'completed_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }

    /**
     * StripeのCheckout Session完了を受けてコインを付与する。
     * 同じセッションIDに対して二重に付与しない(Webhookは再送されうるため)。
     */
    public static function completeFromStripeSession(string $sessionId): bool
    {
        $purchase = static::query()
            ->where('stripe_checkout_session_id', $sessionId)
            ->first();

        if (! $purchase || $purchase->status === 'completed') {
            return false;
        }

        $purchase->update(['status' => 'completed', 'completed_at' => now()]);

        $purchase->profile?->applyEconomy(
            ['coin' => $purchase->coins],
            'stripe_purchase'
        );

        return true;
    }
}
