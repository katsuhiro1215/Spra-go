<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileCompanion extends Model
{
    protected $fillable = ['companion_key', 'nickname', 'bond', 'in_town'];

    protected function casts(): array
    {
        return [
            'bond' => 'integer',
            'in_town' => 'boolean',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
