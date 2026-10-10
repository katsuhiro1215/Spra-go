<?php

namespace App\Http\Middleware;

use App\Support\GameRollout;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** 出す日の前・季節の外のミニゲームは404にする(docs/design/2026-10-09-minigame-rollout-design.md 3-3)。使い方: EnsureGameAvailable::class.':space_trip' */
class EnsureGameAvailable
{
    public function handle(Request $request, Closure $next, string $game): Response
    {
        GameRollout::assertAvailable($game);

        return $next($request);
    }
}
