<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** 日ごとの集計(docs/design/2026-10-03-analytics-design.md 4-1)。プレイヤーを消しても過去の数字が残る */
class AnalyticsDaily extends Model
{
    protected $table = 'analytics_daily';

    protected $primaryKey = 'date';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'date', 'new_accounts', 'new_players', 'active_players', 'opened_players', 'answers', 'correct_answers', 'play_seconds',
    ];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d'];
    }
}
