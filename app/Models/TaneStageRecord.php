<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Tane のステージごとの記録(★と最高点)。設計: company/spra/tane/docs/2026-10-21-account-sync-design.md 5-1 */
class TaneStageRecord extends Model
{
    public const CREATED_AT = null;

    protected $fillable = ['user_profile_id', 'stage_id', 'stars', 'best_score'];
}
