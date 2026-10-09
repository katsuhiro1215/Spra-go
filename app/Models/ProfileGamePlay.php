<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** ミニゲームを遊んだ回(docs/design/2026-09-29-spru-catch-design.md 5-1) */
class ProfileGamePlay extends Model
{
    protected $fillable = [
        'game',
        'difficulty',
        'question_ids',
        'finished_at',
        'played_on',
        'answered_count',
        'correct_count',
        'score',
        'best_combo',
        'stars',
        'rewarded',
    ];

    protected function casts(): array
    {
        return [
            'question_ids' => 'array',
            'finished_at' => 'datetime',
            'played_on' => 'date',
            'answered_count' => 'integer',
            'correct_count' => 'integer',
            'score' => 'integer',
            'best_combo' => 'integer',
            'stars' => 'integer',
            'rewarded' => 'boolean',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
