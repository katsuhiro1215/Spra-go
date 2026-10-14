<?php

namespace App\Support;

use App\Models\UserApp;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * どのアプリを使っているかの記録と集計(docs/design/2026-10-14-multi-app-accounts-design.md 5・7章)。
 * 使う側は、アプリの名前(config/apps.php のキー)だけを知っていればよい。
 */
class AppUsage
{
    /** 一覧にあるアプリの名前か */
    public static function known(?string $app): bool
    {
        return is_string($app) && array_key_exists($app, config('apps.apps'));
    }

    /** 使ったことを残す。1日1回だけ書く(同じ日の2回目からは、キャッシュで止める) */
    public static function touch(int $userId, string $app): void
    {
        $day = now(Analytics::TIMEZONE)->toDateString();
        if (! Cache::add("user-app:{$userId}:{$app}:{$day}", 1, now()->addHours(30))) {
            return;
        }

        $now = now();
        $row = UserApp::firstOrCreate(
            ['user_id' => $userId, 'app' => $app],
            ['first_used_at' => $now, 'last_used_at' => $now],
        );
        if (! $row->wasRecentlyCreated) {
            $row->forceFill(['last_used_at' => $now])->save();
        }
    }

    /** ユーザーIDごとの、使っているアプリ [user_id => [{app, first_used_at, last_used_at}]] */
    public function byUser(): array
    {
        return UserApp::query()->orderBy('first_used_at')->get()
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->map(fn (UserApp $r) => [
                'app' => $r->app,
                'first_used_at' => $r->first_used_at->toIso8601String(),
                'last_used_at' => $r->last_used_at->toIso8601String(),
            ])->values()->all())
            ->all();
    }

    /** アプリごとの人数と、2つ以上のアプリを使っている人数 */
    public function summary(): array
    {
        $counts = DB::table('user_apps')->groupBy('app')->selectRaw('app, count(*) as total')->pluck('total', 'app');
        $multiple = DB::table('user_apps')->groupBy('user_id')->havingRaw('count(*) >= 2')->selectRaw('user_id')->get()->count();

        return [
            'counts' => collect(array_keys(config('apps.apps')))->mapWithKeys(fn ($app) => [$app => (int) ($counts[$app] ?? 0)])->all(),
            'multiple' => $multiple,
        ];
    }
}
