<?php

namespace App\Http\Middleware;

use App\Support\AppUsage;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// ログイン済みのリクエストに X-Spra-App が付いていたら、そのアプリを使ったことを残す
// (docs/design/2026-10-14-multi-app-accounts-design.md 5章)。ヘッダーがないとき・一覧にないときは何もしない
class RecordAppUsage
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $app = $request->header('X-Spra-App');
        $user = $request->user();
        if ($user && AppUsage::known($app) && $response->getStatusCode() < 400) {
            AppUsage::touch($user->id, $app);
        }

        return $response;
    }
}
