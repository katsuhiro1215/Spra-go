<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** プレイヤーと1日ごとの、遊んだ時間の合計秒数(docs/design/2026-10-03-analytics-design.md 4-1) */
class ProfilePlayDay extends Model
{
    protected $fillable = ['user_profile_id', 'played_on', 'seconds', 'last_beat_at'];

    protected function casts(): array
    {
        return [
            'played_on' => 'date',
            'last_beat_at' => 'datetime',
        ];
    }
}
