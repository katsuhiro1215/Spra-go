<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Language extends Model
{
    protected $fillable = ['code', 'name'];

    public function countries(): BelongsToMany
    {
        return $this->belongsToMany(Country::class, 'country_language')
            ->withPivot('is_primary');
    }
}
