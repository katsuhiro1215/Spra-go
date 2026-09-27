<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileErrand extends Model
{
    protected $fillable = ['errand_on', 'slot', 'kind', 'target', 'giver', 'claimed_at'];

    protected function casts(): array
    {
        return [
            'errand_on' => 'date',
            'slot' => 'integer',
            'target' => 'integer',
            'claimed_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
