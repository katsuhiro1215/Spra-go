<?php

namespace App\Http\Controllers\Deer;

use App\Http\Controllers\Controller;
use App\Models\DeerPlay;
use App\Models\DeerStageRecord;
use App\Models\User;
use App\Models\UserProfile;
use App\Support\Deer\DeerLevels;
use App\Support\Deer\DeerProfiles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Spraと鹿。の、遊んだ1回(始め・終わり)。
 * ログインした人は profile_id で、ログインしていない人は anon_id(端末ごとの番号)で送る。
 * ログインしていない人が遊べるのは、各ワールドの free_levels 番目まで
 */
class PlayController extends Controller
{
    /** 日の境目(Spra Go・Tane と同じ) */
    private const TIMEZONE = 'Asia/Tokyo';

    /** タイムの最小(これより速いクリアは、ランキングに載せない) */
    private const MIN_MS = 1000;

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'level' => ['required', 'string', 'regex:'.DeerLevels::PATTERN],
            'profile_id' => ['nullable', 'integer'],
            'anon_id' => ['nullable', 'uuid'],
        ]);

        $profile = null;
        if (isset($data['profile_id'])) {
            $profile = $this->profileFor($request->user('sanctum'), (int) $data['profile_id']);
        } else {
            abort_unless(isset($data['anon_id']), 422, 'anon_id が必要です');
            if (! DeerLevels::isFree($data['level'])) {
                return response()->json(['message' => 'ログインすると遊べます', 'code' => 'login_required'], 403);
            }
        }

        $play = DB::transaction(function () use ($data, $profile) {
            $play = DeerPlay::create([
                'user_profile_id' => $profile?->id,
                'anon_id' => $profile ? null : $data['anon_id'],
                'player_key' => $profile ? "p:{$profile->id}" : "a:{$data['anon_id']}",
                'level_id' => $data['level'],
                'started_at' => now(),
                'played_on' => Carbon::now(self::TIMEZONE)->toDateString(),
            ]);
            if ($profile) {
                $record = DeerStageRecord::query()->firstOrCreate(['user_profile_id' => $profile->id, 'level_id' => $data['level']]);
                $record->increment('plays');
            }

            return $play;
        });

        return response()->json(['id' => $play->id], 201);
    }

    public function finish(Request $request, DeerPlay $play): JsonResponse
    {
        $data = $request->validate([
            'result' => ['required', 'in:clear,fail,quit'],
            'time_ms' => ['nullable', 'integer', 'min:0', 'max:3600000'],
            'stars' => ['nullable', 'integer', 'min:0', 'max:3'],
            'anon_id' => ['nullable', 'uuid'],
        ]);

        // 始めた人と同じ人か(ログインした人は家族、ログインしていない人は同じ端末の番号)
        if ($play->user_profile_id !== null) {
            $this->profileFor($request->user('sanctum'), $play->user_profile_id);
        } else {
            abort_unless(($data['anon_id'] ?? null) === $play->anon_id, 403, 'この回の記録は送れません');
        }
        abort_if($play->finished_at !== null, 409, 'この回は、もう終わっています');

        $clear = $data['result'] === 'clear';
        $time = $data['time_ms'] ?? null;
        // タイムは、サーバーが測った「始めてから終わるまで」より長くないか(通信の誤差 10%+2秒を許す。Spra Go のパズルと同じ)
        $span = max(0, $play->started_at->diffInMilliseconds(now(), false));
        $verified = $clear && $time !== null && $time >= self::MIN_MS && $time <= $span * 1.1 + 2000;

        $record = DB::transaction(function () use ($play, $data, $clear, $time, $verified) {
            $play->update([
                'result' => $data['result'],
                'time_ms' => $time,
                'stars' => $data['stars'] ?? null,
                'time_verified' => $verified,
                'finished_at' => now(),
            ]);
            if ($play->user_profile_id === null || ! $clear) {
                return null;
            }
            $record = DeerStageRecord::query()->where('user_profile_id', $play->user_profile_id)->where('level_id', $play->level_id)->lockForUpdate()->first()
                ?? DeerStageRecord::create(['user_profile_id' => $play->user_profile_id, 'level_id' => $play->level_id]);
            $record->clears++;
            $record->stars = max($record->stars, $data['stars'] ?? 0);
            if ($verified && ($record->best_ms === null || $time < $record->best_ms)) {
                $record->best_ms = $time;
                $record->best_at = now();
            }
            $record->save();

            return $record;
        });

        return response()->json(['verified' => $verified, 'record' => $record?->payload()]);
    }

    /** ログインした人の家族のプレイヤーか(違えば 401/403)。利用規約の同意が古ければ 403(code: terms_outdated) */
    private function profileFor(?User $user, int $profileId): UserProfile
    {
        abort_if($user === null, 401, 'ログインが きれました');
        abort_if($user->termsOutdated(), response()->json(['message' => '新しい利用規約への同意が必要です', 'code' => 'terms_outdated'], 403));
        $profile = UserProfile::query()->find($profileId);
        abort_if($profile === null, 403, 'このプレイヤーの記録は見られません');
        DeerProfiles::authorize($user, $profile);

        return $profile;
    }
}
