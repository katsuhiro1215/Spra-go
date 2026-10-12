<?php

use App\Models\ProfileWorldItem;
use App\Models\User;
use App\Models\UserProfile;
use App\Support\WorldPlacement;
use Database\Seeders\WorldItemSeeder;

/*
|--------------------------------------------------------------------------
| 町のデモ(Lv30・いろんなアイテムを置いた状態)。開発用で、足りない物を見つけるために使う
|--------------------------------------------------------------------------
*/

it('town:demo は、Lv30のデモ用プロフィールを作り、アイテムを全部置く(置けない物が1つもない)', function () {
    $this->seed(WorldItemSeeder::class);

    $this->artisan('town:demo')->assertSuccessful();

    $profile = UserProfile::where('name', 'まちデモ')->firstOrFail();
    expect($profile->level)->toBe(30);
    expect(ProfileWorldItem::where('user_profile_id', $profile->id)->count())->toBeGreaterThan(60);
    expect(ProfileWorldItem::where('user_profile_id', $profile->id)->whereNull('x')->count())->toBe(0);
});

it('town:demo は、何度流しても増えず、置いた物は重ならない', function () {
    $this->seed(WorldItemSeeder::class);

    $this->artisan('town:demo')->assertSuccessful();
    $this->artisan('town:demo')->assertSuccessful();

    expect(User::where('email', 'demo-lv30@example.test')->count())->toBe(1);
    $profile = UserProfile::where('name', 'まちデモ')->firstOrFail();
    $seen = [];
    foreach ($profile->worldItems()->with('shopItem')->get() as $item) {
        foreach (WorldPlacement::tiles($item->x, $item->y, $item->shopItem->footprint()) as [$x, $y]) {
            expect($seen)->not->toHaveKey("{$x},{$y}");
            $seen["{$x},{$y}"] = true;
        }
    }
});

it('town:demo は、本番では動かない', function () {
    app()->detectEnvironment(fn () => 'production');

    $this->artisan('town:demo')->assertFailed();
});
