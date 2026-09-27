<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileTrip extends Model
{
    protected $fillable = ['destination', 'arrived_at'];

    protected function casts(): array
    {
        return ['arrived_at' => 'datetime'];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
