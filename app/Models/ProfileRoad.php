<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 自分で引いた町の道(docs/design/2026-10-19-town-roads-design.md 4章) */
class ProfileRoad extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_profile_id', 'x', 'y'];

    protected function casts(): array
    {
        return ['x' => 'integer', 'y' => 'integer'];
    }
}
