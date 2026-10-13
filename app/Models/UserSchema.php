<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserSchema extends Model
{
    protected $fillable = ['name', 'ranking_public'];

    protected function casts(): array
    {
        return ['ranking_public' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function profiles(): HasMany
    {
        return $this->hasMany(UserProfile::class);
    }
}
