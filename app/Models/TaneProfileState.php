<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Tane のプレイヤーごとの、ステージ以外の記録(チャレンジ・エンドレス・にわ・最後のあそび)。設計 5-2 */
class TaneProfileState extends Model
{
    public const CREATED_AT = null;

    protected $fillable = ['user_profile_id', 'challenge_best', 'endless_best', 'garden', 'garden_changed_at', 'last_mode', 'last_mode_at'];

    protected function casts(): array
    {
        return [
            'challenge_best' => 'array',
            'endless_best' => 'array',
            'garden' => 'array',
            'garden_changed_at' => 'datetime',
            'last_mode_at' => 'datetime',
        ];
    }
}
