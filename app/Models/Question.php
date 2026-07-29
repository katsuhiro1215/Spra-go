<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Question extends Model
{
    protected $fillable = ['quiz_id', 'country_id', 'type', 'prompt', 'order', 'meta'];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function choices(): HasMany
    {
        return $this->hasMany(QuestionChoice::class)->orderBy('order');
    }
}
