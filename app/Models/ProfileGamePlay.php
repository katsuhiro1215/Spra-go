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
        'stop',
        'question_ids',
        'finished_at',
        'played_on',
        'answered_count',
        'correct_count',
        'score',
        'best_combo',
        'stars',
        'elapsed_ms',
        'rewarded',
        'time_verified',
        'distance_m',
        'seeds_earned',
        'seed_value',
        'run_seed',
        'ceiling',
        'started_at',
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
            'time_verified' => 'boolean',
            'started_at' => 'datetime',
            'distance_m' => 'integer',
            'seeds_earned' => 'integer',
            'seed_value' => 'integer',
            'run_seed' => 'integer',
            'ceiling' => 'integer',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
