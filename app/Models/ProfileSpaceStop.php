<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 宇宙ぼうけんマップの、星ごとのいちばんよい評価(docs/design/2026-10-10-space-adventure-map-design.md 3-1)。計算は App\Support\SpaceMap */
class ProfileSpaceStop extends Model
{
    protected $fillable = ['user_profile_id', 'stop', 'stars', 'cleared_on'];

    protected function casts(): array
    {
        return ['stars' => 'integer', 'cleared_on' => 'date'];
    }
}
