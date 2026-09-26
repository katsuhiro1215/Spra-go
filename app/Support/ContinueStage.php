<?php

namespace App\Support;

use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Models\UserProfile;

/**
 * 町の画面の「つづきから学ぶ」の行き先。復習を混ぜた「今日のレッスン」
 * (サブプロジェクト③)ができるまでの代わり。
 */
class ContinueStage
{
    public static function resolveId(UserProfile $profile): ?int
    {
        $last = ProfileStageProgress::query()
            ->where('user_profile_id', $profile->id)
            ->latest('updated_at')
            ->latest('id')
            ->first();

        if (! $last) {
            return null;
        }

        if ($last->cleared_at === null) {
            return $last->stage_id;
        }

        $stage = Stage::find($last->stage_id);

        if (! $stage) {
            return null;
        }

        return Stage::query()
            ->where('category_id', $stage->category_id)
            ->where('country_id', $stage->country_id)
            ->where('difficulty', $stage->difficulty)
            ->where('stage_number', $stage->stage_number + 1)
            ->value('id');
    }
}
