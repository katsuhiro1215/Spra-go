<?php

use App\Models\Owner;
use App\Models\User;
use App\Models\UserApp;

// docs/design/2026-10-14-multi-app-accounts-design.md 4・5・7章

function appRequest(User $user, ?string $app = 'go')
{
    $headers = $app === null ? [] : ['X-Spra-App' => $app];

    return test()->actingAs($user)->withHeaders($headers)->getJson('/api/user');
}

test('アプリのヘッダーを付けたログイン済みのリクエストで、使い始めた日と最後に使った日が残る', function () {
    $user = User::factory()->create();

    appRequest($user, 'tane')->assertOk();

    $row = UserApp::where('user_id', $user->id)->sole();
    expect($row->app)->toBe('tane');
    expect($row->first_used_at->equalTo($row->last_used_at))->toBeTrue();
});

test('同じ日の2回目は更新せず、日が変わったら最後に使った日だけ更新する', function () {
    $user = User::factory()->create();
    $this->travelTo(now()->setTime(10, 0));

    appRequest($user)->assertOk();
    $first = UserApp::where('user_id', $user->id)->sole();

    $this->travel(2)->hours();
    appRequest($user)->assertOk();
    expect(UserApp::where('user_id', $user->id)->sole()->last_used_at->equalTo($first->last_used_at))->toBeTrue();

    $this->travel(1)->days();
    appRequest($user)->assertOk();
    $after = UserApp::where('user_id', $user->id)->sole();
    expect($after->first_used_at->equalTo($first->first_used_at))->toBeTrue();
    expect($after->last_used_at->greaterThan($first->last_used_at))->toBeTrue();
    expect(UserApp::where('user_id', $user->id)->count())->toBe(1);
});

test('一覧にないアプリ・ヘッダーなし・ログインなしでは記録しない', function () {
    $this->withHeaders(['X-Spra-App' => 'go'])->getJson('/api/user')->assertUnauthorized();

    $user = User::factory()->create();
    appRequest($user, 'unknown')->assertOk();
    appRequest($user, null)->assertOk();

    expect(UserApp::count())->toBe(0);
});

test('同じ人が複数のアプリを使うと、アプリごとに1行になる', function () {
    $user = User::factory()->create();

    appRequest($user, 'go');
    appRequest($user, 'tane');

    expect(UserApp::where('user_id', $user->id)->pluck('app')->sort()->values()->all())->toBe(['go', 'tane']);
});

test('Ownerのユーザー一覧に、使っているアプリが付く', function () {
    $both = User::factory()->create();
    $goOnly = User::factory()->create();
    $none = User::factory()->create();
    UserApp::create(['user_id' => $both->id, 'app' => 'go', 'first_used_at' => now(), 'last_used_at' => now()]);
    UserApp::create(['user_id' => $both->id, 'app' => 'tane', 'first_used_at' => now(), 'last_used_at' => now()]);
    UserApp::create(['user_id' => $goOnly->id, 'app' => 'go', 'first_used_at' => now(), 'last_used_at' => now()]);

    $rows = $this->actingAs(Owner::factory()->create(), 'owner')->getJson('/api/owner/users')->assertOk()->json();
    $byId = collect($rows)->keyBy('id');

    expect(collect($byId[$both->id]['apps'])->pluck('app')->sort()->values()->all())->toBe(['go', 'tane']);
    expect(collect($byId[$goOnly->id]['apps'])->pluck('app')->all())->toBe(['go']);
    expect($byId[$none->id]['apps'])->toBe([]);
    expect($byId[$both->id]['apps'][0])->toHaveKeys(['app', 'first_used_at', 'last_used_at']);
});

test('Ownerのダッシュボードに、アプリ別の人数と複数のアプリを使っている人数が出る', function () {
    $both = User::factory()->create();
    $goOnly = User::factory()->create();
    foreach ([[$both, 'go'], [$both, 'tane'], [$goOnly, 'go']] as [$u, $app]) {
        UserApp::create(['user_id' => $u->id, 'app' => $app, 'first_used_at' => now(), 'last_used_at' => now()]);
    }

    $apps = $this->actingAs(Owner::factory()->create(), 'owner')->getJson('/api/owner/dashboard/summary')->assertOk()->json('apps');

    expect($apps['counts'])->toBe(['go' => 2, 'tane' => 1, 'world' => 0]);
    expect($apps['multiple'])->toBe(1);
});

test('Ownerでないと、ユーザーのアプリ情報は見られない', function () {
    $this->getJson('/api/owner/users')->assertUnauthorized();
    $this->actingAs(User::factory()->create())->getJson('/api/owner/users')->assertStatus(401);
});

test('ユーザーを消すと、アプリの行も消える', function () {
    $user = User::factory()->create();
    appRequest($user);

    $user->delete();

    expect(UserApp::count())->toBe(0);
});

test('CSVの書き出しに、使っているアプリが「|」区切りで入る', function () {
    $user = User::factory()->create();
    foreach (['go', 'tane'] as $app) {
        UserApp::create(['user_id' => $user->id, 'app' => $app, 'first_used_at' => now(), 'last_used_at' => now()]);
    }

    $csv = $this->actingAs(Owner::factory()->create(), 'owner')->get('/api/owner/analytics/export/users')->assertOk()->getContent();

    expect($csv)->toContain('使っているアプリ')->and($csv)->toContain('go|tane');
});
