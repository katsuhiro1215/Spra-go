<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 4-1)。計算は App\Support\QuestionMemory */
class ProfileQuestionMemory extends Model
{
    protected $fillable = ['user_profile_id', 'question_id', 'level', 'due_on', 'mastered_on', 'last_answered_on'];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'due_on' => 'date',
            'mastered_on' => 'date',
            'last_answered_on' => 'date',
        ];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
