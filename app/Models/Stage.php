<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stage extends Model
{
    protected $fillable = [
        'category_id',
        'difficulty',
        'stage_number',
        'question_theme_id',
        'question_count',
        'is_boss',
        'title_reward',
    ];

    protected function casts(): array
    {
        return [
            'is_boss' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function questionTheme(): BelongsTo
    {
        return $this->belongsTo(QuestionTheme::class);
    }
}
