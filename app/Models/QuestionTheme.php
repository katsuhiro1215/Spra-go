<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuestionTheme extends Model
{
    protected $fillable = ['key', 'label', 'description'];

    public function stages(): HasMany
    {
        return $this->hasMany(Stage::class);
    }
}
