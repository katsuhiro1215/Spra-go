<?php

namespace App\Http\Controllers\Tane;

use App\Http\Controllers\Controller;
use App\Models\UserProfile;
use App\Support\ParentPassword;
use App\Support\Tane\ProgressStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;

class ParentController extends Controller
{
    /** パスワードを入れ直して保護者と確かめ、このトークン(この端末)だけ、しばらく「確認ずみ」にする */
    public function confirm(Request $request): Response
    {
        ParentPassword::confirm($request);

        Cache::put(self::cacheKey(self::tokenId($request)), true, now()->addMinutes(config('tane.parent_confirm_minutes')));

        return response()->noContent();
    }

    /** 確認ずみのときだけ、家族の全員の Tane の記録を返す */
    public function records(Request $request): JsonResponse
    {
        abort_unless(Cache::get(self::cacheKey(self::tokenId($request))), 403, '保護者のかたの確認が必要です');

        $profiles = $request->user()->schema?->profiles()->orderBy('id')->get() ?? collect();

        return response()->json([
            'profiles' => $profiles->map(fn (UserProfile $profile) => ['id' => $profile->id, 'name' => $profile->name, 'avatar' => $profile->avatar] + ProgressStore::payload($profile))->values(),
        ]);
    }

    /** ログアウトのとき、確認ずみの印も消す */
    public static function forget(PersonalAccessToken $token): void
    {
        Cache::forget(self::cacheKey($token->getKey()));
    }

    /** 確認ずみの印は、端末(トークン)ごと。クッキーのログインでは使えない */
    private static function tokenId(Request $request): int
    {
        $token = $request->user()->currentAccessToken();
        abort_unless($token instanceof PersonalAccessToken, 403, 'Tane のトークンでのみ使えます');

        return $token->getKey();
    }

    private static function cacheKey(int $tokenId): string
    {
        return "tane-parent:{$tokenId}";
    }
}
