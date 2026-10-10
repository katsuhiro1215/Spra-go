<?php

use App\Models\Admin;
use App\Models\Owner;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ProductionSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| 本番に出す前の穴ふさぎ(docs/design/2026-10-10-production-env-design.md 3章)
|--------------------------------------------------------------------------
*/

it('OwnerとAdminは、HTTPで自分から登録できない(登録の道がない)', function (string $path) {
    $this->postJson($path, [
        'name' => 'のっとり', 'email' => 'x@example.com', 'password' => 'Password123!', 'password_confirmation' => 'Password123!',
    ])->assertNotFound();

    expect(Owner::count() + Admin::count())->toBe(0);
})->with(['owner' => ['/owner/register'], 'admin' => ['/admin/register']]);

it('owner:create は、メール確認済みのOwnerを作り、パスワードは暗号化して保存する', function () {
    $this->artisan('owner:create', ['email' => 'boss@example.com', '--name' => 'ボス', '--password' => 'Sup3r-secret-pass'])
        ->assertSuccessful();

    $owner = Owner::where('email', 'boss@example.com')->firstOrFail();
    expect($owner->name)->toBe('ボス')
        ->and($owner->email_verified_at)->not->toBeNull()
        ->and(Hash::check('Sup3r-secret-pass', $owner->password))->toBeTrue();
});

it('owner:create は、同じメールのOwnerがいたら作らない', function () {
    Owner::factory()->create(['email' => 'boss@example.com']);

    $this->artisan('owner:create', ['email' => 'boss@example.com', '--name' => 'ボス', '--password' => 'Sup3r-secret-pass'])
        ->assertFailed();

    expect(Owner::count())->toBe(1);
});

it('owner:create は、短いパスワードを受け付けない', function () {
    $this->artisan('owner:create', ['email' => 'boss@example.com', '--name' => 'ボス', '--password' => 'short'])
        ->assertFailed();

    expect(Owner::count())->toBe(0);
});

it('本番では、試験用アカウントを作る DatabaseSeeder を流せない', function () {
    app()->detectEnvironment(fn () => 'production');

    expect(fn () => (new DatabaseSeeder)->run())->toThrow(RuntimeException::class);
    expect(Owner::count())->toBe(0);
});

it('本番用のシーダーは、試験用のOwner・Admin・利用者を作らない', function () {
    $classes = ProductionSeeder::classes();

    foreach (['UserSeeder', 'AdminSeeder', 'OwnerSeeder', 'UserSchemaSeeder', 'UserProfileSeeder'] as $test) {
        expect($classes)->not->toContain("Database\\Seeders\\{$test}");
    }
    expect($classes)->toContain(\Database\Seeders\FlagQuizSeeder::class);
});

it('プロキシの裏(X-Forwarded-Proto: https)では、https として扱う', function () {
    Route::get('/_probe-secure', fn () => response()->json(['secure' => request()->secure(), 'url' => url('/x')]));

    $this->getJson('/_probe-secure', ['X-Forwarded-Proto' => 'https', 'X-Forwarded-Host' => 'api.go.spra.jp'])
        ->assertOk()
        ->assertJsonPath('secure', true);
});

it('本番用のシーダーは、まっさらなDB(厳格なMySQL)で最後まで流れ、国・カテゴリー・問題が入る', function () {
    $this->seed(ProductionSeeder::class);

    expect(\App\Models\Country::count())->toBeGreaterThan(40)
        ->and(\App\Models\Country::whereNull('three_code')->count())->toBe(0)
        ->and(\App\Models\Category::count())->toBeGreaterThan(0)
        ->and(\App\Models\Question::count())->toBeGreaterThan(0)
        ->and(Owner::count() + Admin::count())->toBe(0);
});
