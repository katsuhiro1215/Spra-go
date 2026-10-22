<?php

namespace App\Http\Controllers\Tane;

use App\Http\Controllers\Controller;
use App\Models\UserProfile;
use App\Support\Tane\ProgressMerge;
use App\Support\Tane\ProgressStore;
use App\Support\Tane\TaneProfiles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function show(Request $request, UserProfile $profile): JsonResponse
    {
        TaneProfiles::authorize($request, $profile);

        return response()->json(ProgressStore::payload($profile));
    }

    /**
     * 記録のまるごとを受け取り、サーバーの記録と合わせて保存し、合わせた結果を返す。
     * まるごと送るので、何度送っても同じ結果になる(途中で失敗しても壊れない)
     */
    public function update(Request $request, UserProfile $profile): JsonResponse
    {
        TaneProfiles::authorize($request, $profile);

        $data = $request->validate([
            'progress' => ['required', 'array'],
            'playDays' => ['nullable', 'array'],
        ]);

        $max = config('tane.max_stage_records');
        $incoming = ProgressMerge::validate($data['progress'], $max);
        // 合わせたあとにも件数を確かめる(サーバーの分と受け取った分で、上限を超えないように)
        $merged = ProgressMerge::validate(ProgressMerge::merge(ProgressStore::load($profile), $incoming), $max);

        ProgressStore::save($profile, $merged);
        ProgressStore::addPlayDays($profile, $data['playDays'] ?? []);

        return response()->json(ProgressStore::payload($profile));
    }
}
