<?php

namespace App\Support;

use App\Models\ProfileGreeting;
use App\Models\UserProfile;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;

/**
 * 家族の町とあいさつ(docs/design/2026-09-27-spru-wave-d-design.md 3-4)。
 * 見られるのは同じ家族アカウント(同じ user_schema_id)のほかのプロフィールだけ。
 */
class Family
{
    /** @return Collection<int, UserProfile> 同じ家族の自分以外(作った順) */
    public static function others(UserProfile $profile): Collection
    {
        return UserProfile::query()
            ->where('user_schema_id', $profile->user_schema_id)
            ->whereKeyNot($profile->id)
            ->orderBy('id')
            ->get();
    }

    /** 同じ家族のほかのプロフィールか確かめる。ほかの家族は404、自分は422 */
    public static function member(UserProfile $profile, UserProfile $other): UserProfile
    {
        abort_unless($other->user_schema_id === $profile->user_schema_id, 404);
        abort_if($other->id === $profile->id, 422, '自分の町だよ');

        return $other;
    }

    public static function greetedToday(UserProfile $from, UserProfile $to): bool
    {
        return $from->sentGreetings()->where('to_profile_id', $to->id)->where('greeted_on', Garden::today())->exists();
    }

    /** @return list<array{id: int, name: string, level: int, greeted_today: bool}> */
    public static function list(UserProfile $profile): array
    {
        $greeted = $profile->sentGreetings()
            ->where('greeted_on', Garden::today())
            ->pluck('to_profile_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return self::others($profile)->map(fn (UserProfile $other) => [
            'id' => $other->id,
            'name' => $other->name,
            'level' => $other->level,
            'greeted_today' => in_array($other->id, $greeted, true),
        ])->all();
    }

    /** その人の町を「見るだけ」の形で返す。ポイント・HP・バッグ・おつかいなどは出さない */
    public static function town(UserProfile $viewer, UserProfile $other): array
    {
        $garden = Garden::state($other);

        return [
            'profile' => ['id' => $other->id, 'name' => $other->name, 'level' => $other->level],
            'land' => WorldLand::toArray($other->level),
            'items' => $other->worldItems()->with('shopItem')->whereNotNull('x')->whereNotNull('y')->orderBy('id')->get()
                ->map->toWorldArray()->values()->all(),
            'spru' => ['growth' => Garden::growth($other)],
            'garden' => ['x' => $garden['x'], 'y' => $garden['y'], 'state' => $garden['state'], 'look' => $garden['look']],
            'companions' => Garden::companions($other),
            'greeted_today' => self::greetedToday($viewer, $other),
        ];
    }

    public static function greet(UserProfile $from, UserProfile $to, string $stamp): void
    {
        abort_unless(array_key_exists($stamp, config('world.greeting_stamps')), 422, 'そのことばは送れないよ');
        abort_if(self::greetedToday($from, $to), 422, '今日はもうあいさつしたよ');

        try {
            $from->sentGreetings()->create(['to_profile_id' => $to->id, 'stamp' => $stamp, 'greeted_on' => Garden::today()]);
        } catch (UniqueConstraintViolationException) {
            // 同時に2回送られたとき
            abort(422, '今日はもうあいさつしたよ');
        }
    }

    /** @return list<array{id: int, from: array{id: int, name: string}, stamp: string, text: string, greeted_on: string}> まだ見ていない自分宛て(新しい順) */
    public static function unseenGreetings(UserProfile $profile): array
    {
        return $profile->receivedGreetings()
            ->with('sender')
            ->whereNull('seen_at')
            ->orderByDesc('id')
            ->limit(config('world.greetings_shown'))
            ->get()
            ->map(fn (ProfileGreeting $greeting) => [
                'id' => $greeting->id,
                'from' => ['id' => $greeting->sender->id, 'name' => $greeting->sender->name],
                'stamp' => $greeting->stamp,
                'text' => config("world.greeting_stamps.{$greeting->stamp}", ''),
                'greeted_on' => $greeting->greeted_on->toDateString(),
            ])
            ->all();
    }

    /** @param  list<int>  $ids  画面に出したあいさつ。自分宛てのものだけに印を付ける */
    public static function markSeen(UserProfile $profile, array $ids): void
    {
        $profile->receivedGreetings()->whereIn('id', $ids)->whereNull('seen_at')->update(['seen_at' => now()]);
    }
}
