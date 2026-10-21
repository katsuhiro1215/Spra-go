<?php

namespace App\Support\Tane;

use App\Models\User;

class TokenIssuer
{
    /** Tane に渡すトークンと、ユーザーの要点(Tane はこの形だけを知っている) */
    public static function issue(User $user, string $deviceName): array
    {
        $token = $user->createToken('tane:'.$deviceName, ['*'], now()->addDays(config('tane.token_days')));

        return [
            'token' => $token->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => $user->hasVerifiedEmail(),
            ],
        ];
    }

    /** 連携が止まっているとき(既定)は、トークンの発行・Tane からの登録を断る */
    public static function ensureEnabled(): void
    {
        abort_unless(config('tane.login_enabled'), 403, 'Tane との連携は、まだ使えません');
    }
}
