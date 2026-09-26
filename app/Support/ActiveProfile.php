<?php

namespace App\Support;

use App\Models\UserProfile;
use Illuminate\Http\Request;

/**
 * セッションで選択中のプロフィールを取り出す。既存ルートに散らばっている同じ処理を
 * 新規・変更するルートではここに寄せる(家族アカウント内のプロフィールかも確認する)。
 */
class ActiveProfile
{
    public static function find(Request $request): ?UserProfile
    {
        $profileId = $request->session()->get('active_profile_id');
        $profile = $profileId ? UserProfile::find($profileId) : null;

        if (! $profile || $profile->user_schema_id !== $request->user()?->schema?->id) {
            return null;
        }

        return $profile;
    }

    public static function require(Request $request): UserProfile
    {
        $profile = self::find($request);
        abort_unless($profile, 422, 'プロフィールが選択されていません。');

        return $profile;
    }
}
