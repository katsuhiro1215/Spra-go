<?php

use App\Models\DeerPlay;
use App\Models\DeerStageRecord;
use App\Models\User;
use App\Support\Deer\DeerStats;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

// Spraと鹿。の連携(docs/design/2026-11-21-deer-account-request.md)

const DEER_ANON = '6f1c2d3e-4b5a-4c6d-8e7f-90a1b2c3d4e5';
const DEER_ANON2 = '0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d';

beforeEach(function () {
    config(['deer.login_enabled' => true]);
});

function deerLogin(string $email, bool $deer = true)
{
    app('auth')->forgetGuards();

    return test()->withHeaders(['X-Spra-App' => $deer ? 'deer' : 'tane'])->postJson('/api/auth/token', ['email' => $email, 'password' => 'password', 'device_name' => 'iPad']);
}

/** 始めて、少し時間をすすめて、終える */
function deerPlay(?string $token, array $start, array $finish, int $wait = 30): TestResponse
{
    $id = ($token ? taneAs($token) : test())->postJson('/api/deer/plays', $start)->assertCreated()->json('id');
    Carbon::setTestNow(now()->addSeconds($wait));

    return ($token ? taneAs($token) : test())->postJson("/api/deer/plays/{$id}/finish", $finish);
}

test('ログイン: X-Spra-App: deer でトークンが出る。止まっているときは 403。Tane の設定とは別', function () {
    $user = User::factory()->create();

    $res = deerLogin($user->email)->assertCreated()->assertJsonPath('user.id', $user->id);
    expect($user->tokens()->latest('id')->first()->name)->toBe('deer:iPad');

    config(['deer.login_enabled' => false, 'tane.login_enabled' => true]);
    deerLogin($user->email)->assertForbidden();
    // Tane は、これまでどおり tane の設定で決まる
    deerLogin($user->email, false)->assertCreated();
    expect($user->tokens()->latest('id')->first()->name)->toBe('tane:iPad');
    expect($res->json('token'))->toBeString();
});

test('ログインなし: 各ワールドの2面目まで遊べて、3面目からは 403(login_required)', function () {
    $this->postJson('/api/deer/plays', ['level' => '1-1', 'anon_id' => DEER_ANON])->assertCreated();
    $this->postJson('/api/deer/plays', ['level' => '8-2', 'anon_id' => DEER_ANON])->assertCreated();
    $this->postJson('/api/deer/plays', ['level' => '1-3', 'anon_id' => DEER_ANON])->assertForbidden()->assertJsonPath('code', 'login_required');
    $this->postJson('/api/deer/plays', ['level' => '1-1'])->assertUnprocessable();
    $this->postJson('/api/deer/plays', ['level' => '9-1', 'anon_id' => DEER_ANON])->assertUnprocessable();
});

test('ログインなし: 終わりは同じ端末の番号だけ送れる。2回は送れない', function () {
    $id = $this->postJson('/api/deer/plays', ['level' => '1-1', 'anon_id' => DEER_ANON])->json('id');

    $this->postJson("/api/deer/plays/{$id}/finish", ['result' => 'clear', 'anon_id' => DEER_ANON2])->assertForbidden();
    $this->postJson("/api/deer/plays/{$id}/finish", ['result' => 'clear', 'anon_id' => DEER_ANON])->assertOk()->assertJsonPath('record', null);
    $this->postJson("/api/deer/plays/{$id}/finish", ['result' => 'clear', 'anon_id' => DEER_ANON])->assertStatus(409);
});

test('ログイン: クリアすると記録(遊んだ数・クリア数・★・いちばん速いタイム)が残る。速すぎるタイムは記録しない', function () {
    [, $profile, $token] = taneUser();

    deerPlay($token, ['level' => '3-5', 'profile_id' => $profile->id], ['result' => 'clear', 'time_ms' => 25000, 'stars' => 2])
        ->assertOk()->assertJsonPath('verified', true)->assertJsonPath('record.best_ms', 25000);
    // サーバーで 10 秒しかたっていないのに 60 秒のタイム → 記録しない(クリアは数える)
    deerPlay($token, ['level' => '3-5', 'profile_id' => $profile->id], ['result' => 'clear', 'time_ms' => 60000, 'stars' => 3], 10)
        ->assertOk()->assertJsonPath('verified', false)->assertJsonPath('record.best_ms', 25000)->assertJsonPath('record.stars', 3);
    deerPlay($token, ['level' => '3-5', 'profile_id' => $profile->id], ['result' => 'fail'])->assertOk()->assertJsonPath('record', null);

    $r = DeerStageRecord::where('user_profile_id', $profile->id)->where('level_id', '3-5')->first();
    expect([$r->plays, $r->clears, $r->stars, $r->best_ms])->toBe([3, 2, 3, 25000]);

    taneAs($token)->getJson("/api/deer/profiles/{$profile->id}/records")->assertOk()
        ->assertJsonPath('records.3-5', ['plays' => 3, 'clears' => 2, 'stars' => 3, 'best_ms' => 25000]);
});

test('ログイン: ほかの家族のプレイヤーでは遊べない・記録も見られない。トークンなしは 401', function () {
    [, , $token] = taneUser();
    [, $other] = taneUser('ほかの子');

    taneAs($token)->postJson('/api/deer/plays', ['level' => '1-5', 'profile_id' => $other->id])->assertForbidden();
    taneAs($token)->getJson("/api/deer/profiles/{$other->id}/records")->assertForbidden();
    app('auth')->forgetGuards();
    $this->withoutToken()->postJson('/api/deer/plays', ['level' => '1-5', 'profile_id' => $other->id])->assertUnauthorized();
});

test('利用規約の同意が古いと、記録を預からない(403 terms_outdated)', function () {
    [$user, $profile, $token] = taneUser();
    $user->forceFill(['terms_version' => 'old'])->save();

    taneAs($token)->postJson('/api/deer/plays', ['level' => '1-5', 'profile_id' => $profile->id])->assertForbidden()->assertJsonPath('code', 'terms_outdated');
    taneAs($token)->getJson("/api/deer/profiles/{$profile->id}/records")->assertForbidden()->assertJsonPath('code', 'terms_outdated');
});

test('ランキング: 家族は名前、みんなは公開した家族だけをニックネームで。速い順・自分の順位', function () {
    [$user, $me, $token] = taneUser('たろう');
    $sister = $user->schema->profiles()->create(['name' => 'はなこ']);
    [$u2, $p2] = taneUser('よそのこ');
    [$u3, $p3] = taneUser('ひみつのこ');
    $u2->schema->update(['deer_ranking_public' => true]);
    $user->schema->update(['deer_ranking_public' => true]);
    foreach ([[$me, 30000], [$sister, 20000], [$p2, 10000], [$p3, 5000]] as [$p, $ms]) {
        DeerStageRecord::create(['user_profile_id' => $p->id, 'level_id' => '2-4', 'clears' => 1, 'best_ms' => $ms, 'best_at' => now()]);
    }

    $family = taneAs($token)->getJson("/api/deer/ranking/2-4?scope=family&profile_id={$me->id}")->assertOk();
    expect(array_column($family->json('rows'), 'name'))->toBe(['はなこ', 'たろう']);
    expect($family->json('rows.1.is_me'))->toBeTrue();

    $all = taneAs($token)->getJson("/api/deer/ranking/2-4?scope=all&profile_id={$me->id}")->assertOk();
    // ひみつのこ(公開していない家族)は出ない。名前は出さない
    expect($all->json('total'))->toBe(3);
    expect(array_column($all->json('rows'), 'best_ms'))->toBe([10000, 20000, 30000]);
    expect(array_column($all->json('rows'), 'name'))->not->toContain('よそのこ')->not->toContain('はなこ');

    taneAs($token)->getJson("/api/deer/ranking/2-4?scope=all&profile_id={$p2->id}")->assertForbidden();
    taneAs($token)->getJson("/api/deer/ranking/9-9?scope=all&profile_id={$me->id}")->assertNotFound();
});

test('ランキングの公開: オンにするときは保護者のパスワード。オフはそのまま', function () {
    [$user, $profile, $token] = taneUser();

    taneAs($token)->getJson("/api/deer/ranking/settings?profile_id={$profile->id}")->assertOk()->assertJsonPath('public', false);
    taneAs($token)->putJson('/api/deer/ranking/settings', ['profile_id' => $profile->id, 'public' => true])->assertUnprocessable();
    taneAs($token)->putJson('/api/deer/ranking/settings', ['profile_id' => $profile->id, 'public' => true, 'password' => 'wrong'])->assertUnprocessable();
    taneAs($token)->putJson('/api/deer/ranking/settings', ['profile_id' => $profile->id, 'public' => true, 'password' => 'password'])->assertOk()->assertJsonPath('public', true);
    taneAs($token)->putJson('/api/deer/ranking/settings', ['profile_id' => $profile->id, 'public' => false])->assertOk()->assertJsonPath('public', false);
    // Spra Go のランキングの公開とは別
    expect($user->schema->fresh()->ranking_public)->toBeFalse();
});

test('遊ばれた数: 面ごとの回数・人数・クリア数・クリアした人数(だれでも見られる)', function () {
    [, $profile, $token] = taneUser();
    deerPlay(null, ['level' => '1-1', 'anon_id' => DEER_ANON], ['result' => 'clear', 'anon_id' => DEER_ANON]);
    deerPlay(null, ['level' => '1-1', 'anon_id' => DEER_ANON], ['result' => 'fail', 'anon_id' => DEER_ANON]);
    deerPlay(null, ['level' => '1-1', 'anon_id' => DEER_ANON2], ['result' => 'fail', 'anon_id' => DEER_ANON2]);
    deerPlay($token, ['level' => '1-1', 'profile_id' => $profile->id], ['result' => 'clear', 'time_ms' => 20000]);
    deerPlay($token, ['level' => '8-7', 'profile_id' => $profile->id], ['result' => 'quit']);

    app('auth')->forgetGuards();
    $res = $this->getJson('/api/deer/stats')->assertOk();
    $levels = collect($res->json('levels'))->keyBy('level');
    expect($levels['1-1'])->toBe(['level' => '1-1', 'plays' => 4, 'players' => 3, 'clears' => 2, 'clear_players' => 2]);
    expect($levels['8-7'])->toBe(['level' => '8-7', 'plays' => 1, 'players' => 1, 'clears' => 0, 'clear_players' => 0]);
    expect($levels['8-8']['plays'])->toBe(0);
    expect($res->json('players'))->toBe(3)->and($res->json('plays'))->toBe(5)->and(count($res->json('levels')))->toBe(80);
    expect(DeerStats::compute()['plays'])->toBe(DeerPlay::count());
});
