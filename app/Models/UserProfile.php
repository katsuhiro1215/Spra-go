<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    protected $fillable = ['name'];

    public function schema(): BelongsTo
    {
        return $this->belongsTo(UserSchema::class);
    }
}
