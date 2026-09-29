<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** がんばった記念にもらった特別な種(docs/design/2026-09-29-rare-spru-design.md 4-1) */
class ProfileSpecialSeed extends Model
{
    protected $fillable = ['rare_key', 'granted_at', 'planted_at'];

    protected function casts(): array
    {
        return [
            'granted_at' => 'datetime',
            'planted_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
