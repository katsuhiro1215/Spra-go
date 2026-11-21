<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Spraと鹿。の、プロフィールごと・面ごとの記録(遊んだ数・クリア数・★・いちばん速いタイム) */
class DeerStageRecord extends Model
{
    public const CREATED_AT = null;

    protected $fillable = ['user_profile_id', 'level_id', 'plays', 'clears', 'stars', 'best_ms', 'best_at'];

    protected function casts(): array
    {
        return ['best_at' => 'datetime'];
    }

    /** Spraと鹿。に返す形 */
    public function payload(): array
    {
        return ['plays' => $this->plays, 'clears' => $this->clears, 'stars' => $this->stars, 'best_ms' => $this->best_ms];
    }
}
