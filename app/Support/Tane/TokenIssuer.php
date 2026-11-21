<?php

namespace App\Support\Tane;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * トークンのログインを使うアプリ(Tane・Spraと鹿。)に渡すトークン。
 * どのアプリからかは X-Spra-App で見分ける(deer = Spraと鹿。、それ以外・無し = Tane。Tane のこれまでの動きは変えない)
 */
class TokenIssuer
{
    public static function app(Request $request): string
    {
        return $request->header('X-Spra-App') === 'deer' ? 'deer' : 'tane';
    }

    /** アプリに渡すトークンと、ユーザーの要点(アプリはこの形だけを知っている) */
    public static function issue(User $user, string $deviceName, string $app = 'tane'): array
    {
        $token = $user->createToken($app.':'.$deviceName, ['*'], now()->addDays(config("{$app}.token_days")));

        return [
            'token' => $token->plainTextToken,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => $user->hasVerifiedEmail(),
                'terms_outdated' => $user->termsOutdated(),
            ],
        ];
    }

    /** 連携が止まっているとき(既定)は、トークンの発行・アプリからの登録を断る */
    public static function ensureEnabled(string $app = 'tane'): void
    {
        abort_unless(config("{$app}.login_enabled"), 403, $app === 'deer' ? 'Spraと鹿。との連携は、まだ使えません' : 'Tane との連携は、まだ使えません');
    }
}
