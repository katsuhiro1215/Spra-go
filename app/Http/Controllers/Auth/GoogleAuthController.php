<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AppSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Contracts\Factory as Socialite;
use Throwable;

/**
 * Googleでのログイン・登録(docs/design/2026-10-12-google-auth-design.md)。
 * APIとNext.jsが別のホスト名なので、ブラウザごとAPIへ移して、結果を FRONTEND_URL の画面へ短い言葉(クエリ google=)で返す。
 */
class GoogleAuthController extends Controller
{
    public static function enabled(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    /** Googleの同意画面へ移す。招待コード(あれば)は、戻ってきたときのためにセッションに入れる */
    public function redirect(Request $request, Socialite $socialite): RedirectResponse
    {
        if (! self::enabled()) {
            return $this->toFrontend('/login?google=off');
        }

        $request->session()->put('google_invite_code', trim((string) $request->query('code', '')));
        // 利用規約・プライバシーポリシーに同意したか(登録画面のチェック。はじめての人だけ見る)
        $request->session()->put('google_terms', $request->query('terms') === '1');

        return $socialite->driver('google')->redirect();
    }

    public function callback(Request $request, Socialite $socialite): RedirectResponse
    {
        if (! self::enabled()) {
            return $this->toFrontend('/login?google=off');
        }

        $inviteCode = (string) $request->session()->pull('google_invite_code', '');
        $termsAccepted = (bool) $request->session()->pull('google_terms', false);

        // Googleの画面で「キャンセル」されたとき、または state が合わないとき
        if ($request->has('error')) {
            return $this->toFrontend('/login?google=denied');
        }
        try {
            $google = $socialite->driver('google')->user();
        } catch (Throwable) {
            return $this->toFrontend('/login?google=denied');
        }

        $email = strtolower(trim((string) $google->getEmail()));
        $verified = filter_var(data_get($google->user, 'email_verified', false), FILTER_VALIDATE_BOOLEAN);
        if ($email === '' || ! $verified) {
            return $this->toFrontend('/login?google=unverified');
        }

        // すでにこのGoogleでつないだ人
        if ($user = User::where('google_id', $google->getId())->first()) {
            return $this->login($request, $user);
        }

        // 同じメールのアカウントがある。メール確認済みのときだけ、Googleをつなぐ(確認していない人は、なりすましを防ぐためつながない)
        if ($user = User::where('email', $email)->first()) {
            if ($user->email_verified_at === null) {
                return $this->toFrontend('/login?google=link_unverified');
            }
            $user->forceFill(['google_id' => $google->getId()])->save();

            return $this->login($request, $user);
        }

        // 初めての人。招待制の登録のルール(RegisteredUserController と同じ)に従う
        if (! AppSettings::registrationOpen()) {
            return $this->toFrontend('/register?google=closed');
        }
        if (AppSettings::inviteCode() !== '' && ! AppSettings::inviteCodeMatches($inviteCode)) {
            return $this->toFrontend('/register?google=need_code');
        }

        if (! $termsAccepted) {
            return $this->toFrontend('/register?google=need_terms');
        }

        $user = new User(['name' => trim((string) $google->getName()) ?: strstr($email, '@', true), 'email' => $email]);
        $user->forceFill(['google_id' => $google->getId(), 'email_verified_at' => now(), 'terms_accepted_at' => now(), 'terms_version' => config('legal.version')])->save();
        $user->schema()->create();

        return $this->login($request, $user);
    }

    private function login(Request $request, User $user): RedirectResponse
    {
        Auth::login($user);
        $request->session()->regenerate();

        return $this->toFrontend('/profiles');
    }

    private function toFrontend(string $path): RedirectResponse
    {
        return redirect()->away(rtrim((string) config('app.frontend_url'), '/').$path);
    }
}
