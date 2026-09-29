<?php

namespace App\Support;

use App\Models\UserProfile;

/**
 * なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 4-5・5-5)。仲間5人(設定の順)→レアスプル10色(一覧の順)。
 * 仲間は生まれるまで名前も状態も出さない(畑で育っていても waiting・「？？？」)
 */
class Roster
{
    /** @return array{town_limit: int, town_count: int, members: list<array<string, mixed>>} */
    public static function of(UserProfile $profile): array
    {
        $born = $profile->companions()->get()->keyBy('companion_key');
        $seeds = $profile->specialSeeds()->get()->keyBy('rare_key');
        $growing = Garden::activeSeed($profile)?->result_key;
        $progress = collect(RareSeeds::progress($profile))->keyBy('key');
        $partnerKey = $profile->partner_companion_key;

        $members = collect(config('companions.list'))->map(function (array $def, string $key) use ($born, $seeds, $growing, $progress, $partnerKey) {
            $rare = (bool) ($def['rare'] ?? false);
            $companion = $born->get($key);
            $status = match (true) {
                $companion !== null => 'born',
                ! $rare => 'waiting',
                $growing === $key => 'growing',
                $seeds->has($key) && $seeds[$key]->planted_at === null => 'in_bag',
                default => 'waiting',
            };

            return [
                'key' => $key,
                'name' => $companion !== null ? Bond::displayName($companion) : ($rare ? $def['name'] : '？？？'),
                'rare' => $rare,
                'status' => $status,
                'in_town' => $companion !== null && $companion->in_town,
                'is_partner' => $companion !== null && $key === $partnerKey,
                'hearts' => $companion !== null ? Bond::hearts($companion->bond) : 0,
                'condition' => $rare && $companion === null ? RareSeeds::condition($key, $progress[$key]['current']) : null,
            ];
        })->values()->all();

        return [
            'town_limit' => config('companions.town_limit'),
            'town_count' => $born->where('in_town', true)->count(),
            'members' => $members,
        ];
    }
}
