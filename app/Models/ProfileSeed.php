<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileSeed extends Model
{
    protected $fillable = ['result_key', 'waterings', 'last_watered_on', 'bloomed_at'];

    // 誰が生まれるかを、うっかり画面に送らないようにする
    protected $hidden = ['result_key'];

    protected function casts(): array
    {
        return [
            'waterings' => 'integer',
            'last_watered_on' => 'date',
            'bloomed_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
