<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 利用規約・プライバシーポリシーの、いまの版に同意していない人を止める(403、code: terms_outdated)。
 * Tane の記録を預かる入口に付ける。同意する前に、記録をサーバーに預けさせないため。
 * Spra Go の既存の入口には付けない(画面の同意の画面で止める)
 */
class EnsureTermsCurrent
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->termsOutdated()) {
            return response()->json(['message' => '新しい利用規約への同意が必要です', 'code' => 'terms_outdated'], 403);
        }

        return $next($request);
    }
}
