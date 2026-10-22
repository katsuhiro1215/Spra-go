<?php

namespace App\Http\Controllers\Tane;

use App\Http\Controllers\Controller;
use App\Models\UserProfile;
use App\Support\Tane\ProgressMerge;
use App\Support\Tane\ProgressStore;
use App\Support\Tane\TaneProfiles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        // 件数の上限は、正しい記録の最大(ステージ200件など)の数倍。中身の確かめ(ProgressMerge::validate)に入る前の、入口の守り
        $data = $request->validate([
            'progress' => ['required', 'array'],
            'progress.stars' => ['nullable', 'array', 'max:1000'],
            'progress.best' => ['nullable', 'array', 'max:1000'],
            'progress.endless' => ['nullable', 'array', 'max:1000'],
            'progress.challengeBest' => ['nullable', 'array', 'max:100'],
            'progress.garden' => ['nullable', 'array', 'max:100'],
            'playDays' => ['nullable', 'array', 'max:60'],
        ]);

        $max = config('tane.max_stage_records');
        // validate() が返す $data['progress'] は、上の規則に書いたキーだけになる(日時などが落ちる)。中身の確かめは受け取ったまるごとに対して行う
        $incoming = ProgressMerge::validate($request->input('progress'), $max);

        // 2台から同時に送られても、読む→合わせる→書くが入れ替わって古い値で上書きされないよう、プレイヤーの行をロックする
        DB::transaction(function () use ($profile, $incoming, $max, $data) {
            UserProfile::query()->whereKey($profile->id)->lockForUpdate()->first();
            // 合わせたあとにも件数を確かめる(サーバーの分と受け取った分で、上限を超えないように)
            $merged = ProgressMerge::validate(ProgressMerge::merge(ProgressStore::load($profile), $incoming), $max);

            ProgressStore::save($profile, $merged);
            ProgressStore::addPlayDays($profile, $data['playDays'] ?? []);
        });

        return response()->json(ProgressStore::payload($profile));
    }
}
