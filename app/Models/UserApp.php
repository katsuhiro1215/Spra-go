<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// 1人のユーザーが、どの Spra のアプリを、いつから・いつまで使っているか
#[Fillable(['user_id', 'app', 'first_used_at', 'last_used_at'])]
class UserApp extends Model
{
    protected function casts(): array
    {
        return [
            'first_used_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
