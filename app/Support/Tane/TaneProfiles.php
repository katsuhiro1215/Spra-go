<?php

namespace App\Support\Tane;

use App\Models\UserProfile;
use Illuminate\Http\Request;

class TaneProfiles
{
    /**
     * プロフィールが、ログインした人の家族のものかを確かめる(違えば 403)。
     * セッションの active_profile_id は使わない(Tane は Bearer トークンだけで呼ぶ)
     */
    public static function authorize(Request $request, UserProfile $profile): void
    {
        $schemaId = $request->user()->schema?->id;

        abort_if($schemaId === null || $profile->user_schema_id !== $schemaId, 403, 'このプレイヤーの記録は見られません');
    }
}
