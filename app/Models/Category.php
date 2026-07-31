<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['parent_id', 'name', 'order', 'is_language_mode'];

    protected function casts(): array
    {
        return [
            'is_language_mode' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id')->orderBy('order');
    }

    public function quizzes(): BelongsToMany
    {
        return $this->belongsToMany(Quiz::class);
    }

    public function stages(): HasMany
    {
        return $this->hasMany(Stage::class);
    }
}
