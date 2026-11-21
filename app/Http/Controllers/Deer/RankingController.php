<?php

namespace App\Http\Controllers\Deer;

use App\Http\Controllers\Controller;
use App\Models\UserSchema;
use App\Support\Deer\DeerLevels;
use App\Support\Deer\DeerProfiles;
use App\Support\Deer\DeerRanking;
use App\Support\ParentPassword;
use App\Support\Ranking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Spraと鹿。の面ごとのランキングと、その設定。
 * みんなのランキングに出すかは家族ごとに保護者が決める(オンにするときはパスワードの入れ直し。Spra Go のランキングと同じ確かめ方)
 */
class RankingController extends Controller
{
    public function show(Request $request, string $level): JsonResponse
    {
        abort_unless(DeerLevels::valid($level), 404);
        $scope = $request->validate(['scope' => ['required', 'in:family,all']])['scope'];
        $profile = DeerProfiles::fromRequest($request);

        return response()->json(DeerRanking::board($profile, $level, $scope));
    }

    public function settings(Request $request): JsonResponse
    {
        $profile = DeerProfiles::fromRequest($request);

        return response()->json(['public' => (bool) UserSchema::query()->whereKey($profile->user_schema_id)->value('deer_ranking_public'), 'nickname' => Ranking::nickname($profile)]);
    }

    public function update(Request $request): JsonResponse
    {
        $profile = DeerProfiles::fromRequest($request);
        $data = $request->validate(['public' => ['required', 'boolean']]);
        $schema = UserSchema::query()->findOrFail($profile->user_schema_id);
        if ($data['public'] && ! $schema->deer_ranking_public) {
            ParentPassword::confirm($request);
        }
        $schema->update(['deer_ranking_public' => $data['public']]);

        return response()->json(['public' => $schema->deer_ranking_public, 'nickname' => Ranking::nickname($profile)]);
    }

    /** ニックネームを付け直す(Spra Go と同じニックネーム。保護者の確認つき) */
    public function nickname(Request $request): JsonResponse
    {
        $profile = DeerProfiles::fromRequest($request);
        ParentPassword::confirm($request);

        return response()->json(['nickname' => Ranking::reroll($profile)]);
    }
}
