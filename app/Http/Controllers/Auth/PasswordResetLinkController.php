<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class PasswordResetLinkController extends Controller
{
    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        // 登録のないアドレス・短い間の頼み直しでも、送れたときと同じ返事にする(登録されているアドレスかを知られないため。
        // docs/design/2026-09-29-email-verify-reset-design.md 4-4)。送るかどうかは Laravel の仕組みに任せる
        Password::sendResetLink($request->only('email'));

        return response()->json(['status' => '入力したメールアドレスが登録されていれば、パスワードを決め直すためのメールを送りました。']);
    }
}
