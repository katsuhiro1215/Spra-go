<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileTitle extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_profile_id', 'title', 'source_stage_id', 'unlocked_at'];

    protected function casts(): array
    {
        return [
            'unlocked_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }

    public function sourceStage(): BelongsTo
    {
        return $this->belongsTo(Stage::class, 'source_stage_id');
    }
}
