<?php

namespace App\Support\Deer;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\Request;

/** Spraと鹿。のプレイヤー(プロフィール)が、ログインした人の家族のものかを確かめる(Tane と同じ。セッションは使わない) */
class DeerProfiles
{
    public static function authorize(?User $user, UserProfile $profile): void
    {
        $schemaId = $user?->schema?->id;

        abort_if($schemaId === null || $profile->user_schema_id !== $schemaId, 403, 'このプレイヤーの記録は見られません');
    }

    /** リクエストの profile_id から、家族のプレイヤーを取り出す(無ければ 422、家族でなければ 403) */
    public static function fromRequest(Request $request): UserProfile
    {
        $id = $request->validate(['profile_id' => ['required', 'integer']])['profile_id'];
        $profile = UserProfile::query()->find($id);
        abort_if($profile === null, 403, 'このプレイヤーの記録は見られません');
        self::authorize($request->user(), $profile);

        return $profile;
    }
}
