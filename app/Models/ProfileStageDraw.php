<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** プールのステージで、前回出した問題(docs/design/2026-10-06-prefecture-master-design.md 3章) */
class ProfileStageDraw extends Model
{
    protected $fillable = ['user_profile_id', 'stage_id', 'question_ids'];

    protected function casts(): array
    {
        return ['question_ids' => 'array'];
    }
}
