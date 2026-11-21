<?php

namespace App\Support\Deer;

use App\Models\DeerStageRecord;
use App\Models\UserProfile;
use App\Models\UserSchema;
use App\Support\Ranking;

/**
 * Spraと鹿。の面ごとのランキング。いちばん速いクリアのタイム(短い順。同じなら先に出した人)。
 * family = 家族の中(名前を出す)、all = みんな(保護者が公開にした家族だけ。名前は出さず、Spra Go と同じ「色+どうぶつ」のニックネーム)
 */
class DeerRanking
{
    public const TOP = 10;

    /** @return array{rows: list<array>, me: array{rank: int, best_ms: int}|null, total: int} */
    public static function board(UserProfile $viewer, string $level, string $scope): array
    {
        $query = DeerStageRecord::query()->where('level_id', $level)->whereNotNull('best_ms');
        $profiles = UserProfile::query()->when(
            $scope === 'family',
            fn ($q) => $q->where('user_schema_id', $viewer->user_schema_id),
            fn ($q) => $q->whereIn('user_schema_id', UserSchema::query()->where('deer_ranking_public', true)->select('id')),
        )->select('id');
        $rows = $query->whereIn('user_profile_id', $profiles)->orderBy('best_ms')->orderBy('best_at')->orderBy('id')->get(['user_profile_id', 'best_ms']);

        // 同じタイムは同じ順位。次の順位は詰めない
        $ranked = [];
        foreach ($rows as $i => $row) {
            $rank = $i > 0 && $ranked[$i - 1]['best_ms'] === $row->best_ms ? $ranked[$i - 1]['rank'] : $i + 1;
            $ranked[] = ['id' => $row->user_profile_id, 'best_ms' => $row->best_ms, 'rank' => $rank];
        }

        $top = array_slice($ranked, 0, self::TOP);
        $people = UserProfile::query()->whereIn('id', array_column($top, 'id'))->get()->keyBy('id');
        $out = array_map(fn (array $row) => [
            'rank' => $row['rank'],
            'name' => $scope === 'family' ? $people[$row['id']]->name : Ranking::nickname($people[$row['id']]),
            'avatar' => $people[$row['id']]->avatar,
            'best_ms' => $row['best_ms'],
            'is_me' => $row['id'] === $viewer->id,
        ], $top);

        $me = collect($ranked)->firstWhere('id', $viewer->id);
        $inTop = collect($top)->contains(fn (array $row) => $row['id'] === $viewer->id);

        return [
            'rows' => $out,
            'me' => $me !== null && ! $inTop ? ['rank' => $me['rank'], 'best_ms' => $me['best_ms']] : null,
            'total' => count($ranked),
        ];
    }
}
