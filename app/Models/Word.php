<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** 単語帳の語のマスター(docs/design/2026-10-07-word-book-design.md 4-1)。english:import が作る */
class Word extends Model
{
    protected $fillable = ['language', 'word', 'key', 'level', 'pos', 'cefr', 'importance', 'ipa', 'meanings', 'usage', 'examples', 'synonyms'];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'importance' => 'integer',
            'meanings' => 'array',
            'examples' => 'array',
            'synonyms' => 'array',
        ];
    }

    public function profileWords(): HasMany
    {
        return $this->hasMany(ProfileWord::class);
    }
}
