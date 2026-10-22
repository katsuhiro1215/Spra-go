<?php

use App\Models\TaneStageRecord;
use Illuminate\Support\Facades\RateLimiter;

// 保護者の確認(パスワードの入れ直し)と、家族の Tane の記録

function taneConfirm(string $token, string $password = 'password')
{
    return taneAs($token)->postJson('/api/auth/confirm-password', ['password' => $password]);
}

function taneParentRecords(string $token)
{
    return taneAs($token)->getJson('/api/tane/parent/records');
}

test('確認の前は403', function () {
    [, , $token] = taneUser();

    taneParentRecords($token)->assertForbidden();
});

test('パスワードが合えば、家族の全員の記録が返る(ほかの家族は含まない)', function () {
    [, $profile, $token] = taneUser('たろう');
    $sibling = createFamilyMember($profile, 'はなこ');
    [, $stranger] = taneUser('よそのこ');
    TaneStageRecord::create(['user_profile_id' => $profile->id, 'stage_id' => 'add-1', 'stars' => 3, 'best_score' => 2400]);
    TaneStageRecord::create(['user_profile_id' => $stranger->id, 'stage_id' => 'add-1', 'stars' => 5]);

    taneConfirm($token)->assertNoContent();
    $res = taneParentRecords($token)->assertOk();

    expect(collect($res->json('profiles'))->pluck('name')->sort()->values()->all())->toBe(['たろう', 'はなこ']);
    $taro = collect($res->json('profiles'))->firstWhere('id', $profile->id);
    expect($taro['progress']['stars'])->toBe(['add-1' => 3])
        ->and($taro['avatar'])->toBe($profile->fresh()->avatar)
        ->and($taro['playDays'])->toBe([]);
    $hanako = collect($res->json('profiles'))->firstWhere('id', $sibling->id);
    expect($hanako['progress']['stars'])->toBeEmpty();
});

test('まちがったパスワードでは確認済みにならない', function () {
    [, , $token] = taneUser();

    taneConfirm($token, 'wrong-password')->assertUnprocessable();
    taneParentRecords($token)->assertForbidden();
});

test('確認は15分で切れる', function () {
    [, , $token] = taneUser();
    taneConfirm($token)->assertNoContent();

    $this->travel(14)->minutes();
    taneParentRecords($token)->assertOk();

    $this->travel(2)->minutes();
    taneParentRecords($token)->assertForbidden();
});

test('同じ人の別の端末(別のトークン)では、確認済みにならない', function () {
    [$user, , $token] = taneUser();
    $other = $user->createToken('tane:もうひとつの端末')->plainTextToken;
    taneConfirm($token)->assertNoContent();

    taneParentRecords($token)->assertOk();
    taneParentRecords($other)->assertForbidden();
});

test('ログアウトすると、確認済みの状態も無くなる', function () {
    [$user, , $token] = taneUser();
    taneConfirm($token)->assertNoContent();
    taneAs($token)->deleteJson('/api/auth/token')->assertNoContent();

    // 同じ人が入り直しても、確認はやり直し
    $again = $user->createToken('tane:test')->plainTextToken;
    taneParentRecords($again)->assertForbidden();
});

test('パスワードが無い(Googleだけ)人は422', function () {
    [$user, , $token] = taneUser();
    $user->forceFill(['password' => null])->save();

    taneConfirm($token)->assertUnprocessable();
});

test('まちがいを6回すると、7回目は429(正しいパスワードでも通らない)', function () {
    [$user, , $token] = taneUser();
    RateLimiter::clear('ranking-confirm:'.$user->id);

    foreach (range(1, 6) as $i) {
        taneConfirm($token, 'wrong-password')->assertUnprocessable();
    }
    taneConfirm($token, 'wrong-password')->assertStatus(429);
    taneConfirm($token)->assertStatus(429);
});

test('トークンが無いと401', function () {
    $this->app['auth']->forgetGuards();
    $this->postJson('/api/auth/confirm-password', ['password' => 'password'])->assertUnauthorized();
    $this->app['auth']->forgetGuards();
    $this->getJson('/api/tane/parent/records')->assertUnauthorized();
});
