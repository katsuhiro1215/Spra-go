<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileCurrencyLedger extends Model
{
    const UPDATED_AT = null;

    protected $table = 'profile_currency_ledger';

    protected $fillable = ['user_profile_id', 'type', 'delta', 'reason', 'question_id', 'stage_id'];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(Stage::class);
    }
}
