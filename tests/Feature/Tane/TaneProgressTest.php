<?php

use App\Models\TanePlayDay;
use App\Models\TaneProfileState;
use App\Models\TaneStageRecord;
use App\Models\User;
use Illuminate\Support\Carbon;

// Tane の記録の入口(GET/PUT /api/tane/profiles/{profile}/progress)

function taneProgress(array $over = []): array
{
    return array_merge([
        'stars' => ['add-1' => 3],
        'best' => ['add-1' => 2400],
        'challengeBest' => ['add' => 3200],
        'endless' => ['shisoku-1' => ['correct' => 12, 'combo' => 7]],
        'garden' => ['add-1'],
        'gardenChangedAt' => '2026-10-21T10:00:00+09:00',
        'lastModeId' => 'add',
        'lastModeAt' => '2026-10-21T10:00:00+09:00',
    ], $over);
}

test('空のプレイヤーの GET は、空の形を返す({} と [] が正しい)', function () {
    [, $profile, $token] = taneUser();

    $res = taneAs($token)->getJson("/api/tane/profiles/{$profile->id}/progress")->assertOk();

    expect($res->getContent())->toBe('{"progress":{"stars":{},"best":{},"challengeBest":{},"endless":{},"garden":[],"gardenChangedAt":null,"lastModeId":null,"lastModeAt":null},"playDays":[]}');
});

test('PUT のあと GET で、同じ記録が読める', function () {
    [, $profile, $token] = taneUser();

    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(), 'playDays' => []])
        ->assertOk()->assertJsonPath('progress.stars.add-1', 3);

    $got = taneAs($token)->getJson("/api/tane/profiles/{$profile->id}/progress")->assertOk()->json('progress');
    expect($got['stars'])->toBe(['add-1' => 3])
        ->and($got['best'])->toBe(['add-1' => 2400])
        ->and($got['challengeBest'])->toBe(['add' => 3200])
        // MySQL の JSON は中のキーの並びを変える(中身が同じならよい)
        ->and($got['endless'])->toEqual(['shisoku-1' => ['correct' => 12, 'combo' => 7]])
        ->and($got['garden'])->toBe(['add-1'])
        ->and($got['lastModeId'])->toBe('add')
        ->and(Carbon::parse($got['gardenChangedAt'])->equalTo(Carbon::parse('2026-10-21T10:00:00+09:00')))->toBeTrue();
});

test('古い記録を送っても、★・最高点は下がらない', function () {
    [, $profile, $token] = taneUser();
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(['stars' => ['add-1' => 5], 'best' => ['add-1' => 9000]])])->assertOk();

    $res = taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(['stars' => ['add-1' => 1], 'best' => ['add-1' => 10]])])->assertOk();

    expect($res->json('progress.stars'))->toBe(['add-1' => 5])->and($res->json('progress.best'))->toBe(['add-1' => 9000]);
    expect(TaneStageRecord::where('user_profile_id', $profile->id)->value('stars'))->toBe(5);
});

test('古いにわを送っても、新しいにわは残る', function () {
    [, $profile, $token] = taneUser();
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(['garden' => ['sub-2'], 'gardenChangedAt' => '2026-10-21T12:00:00+09:00'])])->assertOk();

    $res = taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(['garden' => ['add-1'], 'gardenChangedAt' => '2026-10-21T09:00:00+09:00'])])->assertOk();

    expect($res->json('progress.garden'))->toBe(['sub-2']);
});

test('同じものを2回 PUT しても同じ結果で、行が増えない', function () {
    [, $profile, $token] = taneUser();
    $body = ['progress' => taneProgress(), 'playDays' => []];

    $first = taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", $body)->assertOk()->json();
    $second = taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", $body)->assertOk()->json();

    expect($second)->toBe($first);
    expect(TaneStageRecord::count())->toBe(1)->and(TaneProfileState::count())->toBe(1);
});

test('ほかの家族のプレイヤーは、GET も PUT も403', function () {
    [, , $token] = taneUser();
    [, $other] = taneUser('ほかの子');

    taneAs($token)->getJson("/api/tane/profiles/{$other->id}/progress")->assertForbidden();
    taneAs($token)->putJson("/api/tane/profiles/{$other->id}/progress", ['progress' => taneProgress()])->assertForbidden();
    expect(TaneStageRecord::count())->toBe(0);
});

test('同じ家族の別のプレイヤーは、読める・書ける', function () {
    [, $profile, $token] = taneUser();
    $sibling = createFamilyMember($profile, 'いもうと');

    taneAs($token)->putJson("/api/tane/profiles/{$sibling->id}/progress", ['progress' => taneProgress()])->assertOk();
    taneAs($token)->getJson("/api/tane/profiles/{$sibling->id}/progress")->assertOk()->assertJsonPath('progress.stars.add-1', 3);
});

test('トークンが無いと401', function () {
    [, $profile] = taneUser();

    $this->app['auth']->forgetGuards();
    $this->getJson("/api/tane/profiles/{$profile->id}/progress")->assertUnauthorized();
    $this->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress()])->assertUnauthorized();
});

test('TANE_LOGIN_ENABLED が off でも、発行ずみのトークンの記録の入口は動く', function () {
    config(['tane.login_enabled' => false]);
    [, $profile, $token] = taneUser();

    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress()])->assertOk();
    taneAs($token)->getJson("/api/tane/profiles/{$profile->id}/progress")->assertOk();
});

test('遊んだ日は、未来と古い日付を捨て、重ねて送っても1日1行', function () {
    [, $profile, $token] = taneUser();
    $this->travelTo(Carbon::parse('2026-10-21 12:00:00', 'Asia/Tokyo'));
    $days = ['2026-10-21', '2026-10-20', '2026-10-22', '2026-10-07', '2026-10-06', 'きのう', '2026-13-40'];

    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(), 'playDays' => $days])->assertOk();
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(), 'playDays' => ['2026-10-21']])->assertOk();

    // 14日前(10-07)まで残り、未来(10-22)・15日前(10-06)・形の違うものは残らない
    expect(TanePlayDay::where('user_profile_id', $profile->id)->orderBy('played_on')->pluck('played_on')->map->toDateString()->all())
        ->toBe(['2026-10-07', '2026-10-20', '2026-10-21']);
});

test('GET の playDays は、直近8日だけを新しい順に返す', function () {
    [, $profile, $token] = taneUser();
    $this->travelTo(Carbon::parse('2026-10-21 12:00:00', 'Asia/Tokyo'));
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", [
        'progress' => taneProgress(),
        'playDays' => ['2026-10-21', '2026-10-14', '2026-10-13', '2026-10-10'],
    ])->assertOk();

    // 今日から8日 = 10-14〜10-21
    $got = taneAs($token)->getJson("/api/tane/profiles/{$profile->id}/progress")->assertOk()->json('playDays');
    expect($got)->toBe(['2026-10-21', '2026-10-14']);
});

test('ステージの記録は200件まで', function () {
    [, $profile, $token] = taneUser();
    $stars = [];
    foreach (range(1, 201) as $n) {
        $stars['add-'.$n] = 1;
    }
    // ID の形は ^[a-z]+-[0-9]{1,3}$。201番(add-201)も形は正しいので、件数で切られる
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(['stars' => $stars, 'best' => []])])->assertOk();

    expect(TaneStageRecord::where('user_profile_id', $profile->id)->count())->toBe(200);
});

test('progress が配列でないと422', function () {
    [, $profile, $token] = taneUser();

    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => 'x'])->assertUnprocessable();
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", [])->assertUnprocessable();
});

test('アカウントを消すと、Tane の記録も一緒に消える', function () {
    [$user, $profile, $token] = taneUser();
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(), 'playDays' => [now('Asia/Tokyo')->toDateString()]])->assertOk();
    expect(TaneStageRecord::count())->toBe(1)->and(TaneProfileState::count())->toBe(1)->and(TanePlayDay::count())->toBe(1);

    $user->schema->delete();

    expect(TaneStageRecord::count())->toBe(0)->and(TaneProfileState::count())->toBe(0)->and(TanePlayDay::count())->toBe(0);
    expect(User::count())->toBe(1);
});

test('入口の守り: 配列が大きすぎると422(ステージの記録1000件超・遊んだ日60件超)', function () {
    [, $profile, $token] = taneUser();
    $stars = [];
    foreach (range(1, 1001) as $n) {
        $stars['add-'.$n] = 1;
    }

    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(['stars' => $stars])])->assertUnprocessable()->assertJsonValidationErrors('progress.stars');
    taneAs($token)->putJson("/api/tane/profiles/{$profile->id}/progress", ['progress' => taneProgress(), 'playDays' => array_fill(0, 61, '2026-10-21')])->assertUnprocessable()->assertJsonValidationErrors('playDays');
});
