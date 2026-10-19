<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 持っているきせかえ(docs/design/2026-10-17-spru-costumes-design.md 5章) */
class ProfileCostume extends Model
{
    public $timestamps = false;

    protected $fillable = ['user_profile_id', 'costume_key', 'acquired_at'];

    protected function casts(): array
    {
        return ['acquired_at' => 'datetime'];
    }
}
