<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

/**
 * 「保護者かどうか」を、パスワードの入れ直しで確かめる(みんなのランキングの設定と、Tane の保護者の画面で共通)。
 * パスワードのないアカウント(Googleだけで登録)は確かめられない(422)。まちがいは1分に6回まで
 * (子どもが総当たりで保護者のパスワードを探せないように)。合わなければ 422、回数を超えたら 429 で止まる
 */
class ParentPassword
{
    private const MAX_MISTAKES = 6;

    public static function confirm(Request $request): void
    {
        $hash = $request->user()->password;
        abort_if($hash === null, 422, 'パスワードを設定すると使えます。ログイン画面の「パスワードをわすれた」から設定してください。');
        $key = 'ranking-confirm:'.$request->user()->id;
        abort_if(RateLimiter::tooManyAttempts($key, self::MAX_MISTAKES), 429, 'しばらくしてから、もう一度ためしてください。');
        $request->validate(['password' => ['required', 'string']]);
        if (! Hash::check($request->input('password'), $hash)) {
            RateLimiter::hit($key, 60);
            abort(422, 'パスワードが違います。');
        }
    }
}
