<?php

use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureTermsCurrent;
use App\Http\Middleware\RecordAppUsage;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
        ]);

        // どのアプリを使っているかを残す(X-Spra-App ヘッダー。docs/design/2026-10-14-multi-app-accounts-design.md)
        $middleware->api(append: [
            RecordAppUsage::class,
        ]);

        // 本番は Caddy(リバースプロキシ)の裏で動く。PHP-FPM は外に公開しないので、すべてのプロキシを信用してよい。
        // これがないと、https のアクセスでも http のリンク(メールの確認リンクなど)が作られる
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'terms.current' => EnsureTermsCurrent::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // 画面(apiFetch は Accept: application/json を付ける)からのログイン・パスワード再設定などの Web の道も、
        // 入力のまちがいをリダイレクトでなく 422 の JSON で返す(docs/design/2026-09-29-email-verify-reset-design.md 3章)
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
