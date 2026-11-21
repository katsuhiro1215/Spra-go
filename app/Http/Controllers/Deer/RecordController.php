<?php

namespace App\Http\Controllers\Deer;

use App\Http\Controllers\Controller;
use App\Models\DeerStageRecord;
use App\Models\UserProfile;
use App\Support\Deer\DeerProfiles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** プレイヤーの、面ごとの記録(別の端末でログインしたときに、記録を引きつぐ) */
class RecordController extends Controller
{
    public function index(Request $request, UserProfile $profile): JsonResponse
    {
        DeerProfiles::authorize($request->user(), $profile);

        $records = DeerStageRecord::query()->where('user_profile_id', $profile->id)->orderBy('level_id')->get()
            ->mapWithKeys(fn (DeerStageRecord $r) => [$r->level_id => $r->payload()]);

        return response()->json(['records' => (object) $records->all()]);
    }
}
