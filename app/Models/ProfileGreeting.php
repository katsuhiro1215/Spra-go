<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileGreeting extends Model
{
    protected $fillable = ['from_profile_id', 'to_profile_id', 'stamp', 'greeted_on', 'seen_at'];

    protected function casts(): array
    {
        return [
            'greeted_on' => 'date',
            'seen_at' => 'datetime',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'from_profile_id');
    }
}
