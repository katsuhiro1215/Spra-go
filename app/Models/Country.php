<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Country extends Model
{
    protected $fillable = [
        'code', 'name', 'stages', 'order', 'mood_emoji', 'intro_message',
        'three_code', 'name_en', 'country_code',
    ];

    public function languages(): BelongsToMany
    {
        return $this->belongsToMany(Language::class, 'country_language')
            ->withPivot('is_primary');
    }
}
