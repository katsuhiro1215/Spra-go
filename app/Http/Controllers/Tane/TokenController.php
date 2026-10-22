<?php

namespace App\Http\Controllers\Tane;

use App\Actions\RegisterUser;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Tane\TokenIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class TokenController extends Controller
{
    /** Spra Go のクッキーのログイン(LoginRequest)と同じ、まちがい5回までの制限 */
    private const MAX_ATTEMPTS = 5;

    public function store(Request $request): JsonResponse
    {
        TokenIssuer::ensureEnabled();

        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string', 'max:100'],
        ]);

        $key = Str::transliterate(Str::lower($data['email']).'|'.$request->ip());
        abort_if(RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS), 429, 'しばらくしてから、もう一度ためしてください。');

        $user = User::query()->where('email', $data['email'])->first();

        // パスワードが無い人(Google だけで登録)は、パスワードで入れない。メールの有無は、ここまで漏らさない
        if ($user !== null && $user->password === null) {
            RateLimiter::hit($key);

            throw ValidationException::withMessages(['message' => 'Spra Go の せっていで パスワードを きめてね']);
        }

        if ($user === null || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($key);

            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        RateLimiter::clear($key);

        return response()->json(TokenIssuer::issue($user, $data['device_name']), 201);
    }

    /** Tane からの登録。Spra Go と同じ招待制・同意・家族アカウントの決まりで作り、トークンを返す */
    public function register(Request $request, RegisterUser $register): JsonResponse
    {
        TokenIssuer::ensureEnabled();
        // 登録したあとにトークンの名前でつまずかないよう、先に確かめる
        $request->validate(['device_name' => ['required', 'string', 'max:100']]);

        $user = $register->handle($request);

        return response()->json(TokenIssuer::issue($user, $request->string('device_name')->toString()), 201);
    }

    /** 今のトークンだけを失効させる(ほかの端末のトークンは残る) */
    public function destroy(Request $request): Response
    {
        $token = $request->user()->currentAccessToken();
        // クッキーのログイン(TransientToken)で呼ばれたときは、消すトークンが無い
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->noContent();
    }
}
