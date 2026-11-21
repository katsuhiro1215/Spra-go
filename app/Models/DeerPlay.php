<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Spraと鹿。を遊んだ1回(docs/design/2026-11-21-deer-account-request.md) */
class DeerPlay extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_profile_id', 'anon_id', 'player_key', 'level_id', 'result', 'time_ms', 'stars', 'time_verified', 'started_at', 'finished_at', 'played_on'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'finished_at' => 'datetime', 'played_on' => 'date', 'time_verified' => 'boolean'];
    }
}
