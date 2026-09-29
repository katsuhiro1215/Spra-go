<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class VerifyEmailController extends Controller
{
    /**
     * 確認のリンク(docs/design/2026-09-29-email-verify-reset-design.md 4-2)。ログインしていなくても、期限付きの署名と
     * メールアドレスの hash で確かめ、結果を画面の /verify-email?status=verified|expired|invalid に渡す。
     * 署名の期限切れで 403 の画面を出さないよう、署名はここで確かめる
     */
    public function __invoke(Request $request, string $id, string $hash): RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            return $this->result('expired');
        }

        $user = User::find($id);
        if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return $this->result('invalid');
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return $this->result('verified');
    }

    private function result(string $status): RedirectResponse
    {
        return redirect()->away(config('app.frontend_url').'/verify-email?status='.$status);
    }
}
