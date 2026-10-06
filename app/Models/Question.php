<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Question extends Model
{
    protected $fillable = ['quiz_id', 'country_id', 'type', 'prompt', 'order', 'meta', 'explanation'];

    /** 解説は、答えるまで見せない。問題を返すどの口にも出ないよう隠し、答えのAPIだけが、属性を直接読んで返す */
    protected $hidden = ['explanation'];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'explanation' => 'array',
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
