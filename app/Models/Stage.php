<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Stage extends Model
{
    protected $fillable = [
        'category_id',
        'country_id',
        'region_id',
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

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function questionTheme(): BelongsTo
    {
        return $this->belongsTo(QuestionTheme::class);
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'stage_questions')
            ->withPivot('order')
            ->withTimestamps()
            ->orderByPivot('order');
    }
}
