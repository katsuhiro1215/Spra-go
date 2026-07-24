<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileStageProgress extends Model
{
    protected $fillable = ['user_profile_id', 'stage_id', 'best_score', 'cleared_at', 'attempts'];

    protected function casts(): array
    {
        return [
            'cleared_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(Stage::class);
    }
}
