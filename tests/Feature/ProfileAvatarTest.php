<?php

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| プレイヤーのアバター(docs/design/2026-09-28-top-profiles-design.md 5章)
|--------------------------------------------------------------------------
*/

it('追加のとき、選んだアバターで作られる', function () {
    createActiveProfile();

    $response = $this->postJson('/api/profiles', ['name' => 'ゆうと', 'avatar' => 'avatar-4']);

    $response->assertCreated()->assertJsonPath('avatar', 'avatar-4');
});

it('追加のときアバターを送らなければ、家族でまだ使われていないものの1つ目になる', function () {
    $profile = createActiveProfile(); // avatar-1
    createFamilyMember($profile); // avatar-2

    $response = $this->postJson('/api/profiles', ['name' => 'さくら']);

    $response->assertCreated()->assertJsonPath('avatar', 'avatar-3');
});

it('6つ全部使われていたら、avatar-1 になる', function () {
    $profile = createActiveProfile();
    foreach (range(2, 6) as $n) {
        createFamilyMember($profile, "家族{$n}");
    }

    $response = $this->postJson('/api/profiles', ['name' => '7人目']);

    $response->assertCreated()->assertJsonPath('avatar', 'avatar-1');
});

it('追加のとき、6種以外のアバターは受け付けない', function () {
    createActiveProfile();

    $this->postJson('/api/profiles', ['name' => 'ゆうと', 'avatar' => 'avatar-7'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');
});

it('名前と一緒にアバターを変えられる', function () {
    $profile = createActiveProfile();

    $this->patchJson("/api/profiles/{$profile->id}", ['name' => 'お父さん', 'avatar' => 'avatar-6'])
        ->assertOk()
        ->assertJsonPath('avatar', 'avatar-6');

    expect($profile->fresh()->avatar)->toBe('avatar-6');
});

it('変更のとき、6種以外のアバターは受け付けない', function () {
    $profile = createActiveProfile();

    $this->patchJson("/api/profiles/{$profile->id}", ['name' => 'お父さん', 'avatar' => 'dragon'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');

    expect($profile->fresh()->avatar)->toBe('avatar-1');
});

it('ほかの家族のプレイヤーのアバターは変えられない', function () {
    createActiveProfile();
    $other = User::factory()->create()->schema()->create(['name' => 'よその家族'])->profiles()->create(['name' => 'よその子']);

    $this->patchJson("/api/profiles/{$other->id}", ['name' => 'よその子', 'avatar' => 'avatar-5'])
        ->assertStatus(403);

    expect($other->fresh()->avatar)->toBe('avatar-1');
});

it('プレイヤーの一覧にアバターが入っている', function () {
    createActiveProfile();

    $this->getJson('/api/profiles')->assertOk()->assertJsonPath('0.avatar', 'avatar-1');
});

it('今いるプレイヤーに、家族ごとに作った順でアバターを割り当てる(7人目からは1つ目に戻る)', function () {
    $a = User::factory()->create()->schema()->create(['name' => 'A家']);
    $b = User::factory()->create()->schema()->create(['name' => 'B家']);
    $a1 = $a->profiles()->create(['name' => 'a1']);
    $b1 = $b->profiles()->create(['name' => 'b1']);
    $rest = collect(range(2, 7))->map(fn ($n) => $a->profiles()->create(['name' => "a{$n}"]));
    DB::table('user_profiles')->update(['avatar' => null]); // 列を足した直後(まだ空)の状態にする

    UserProfile::assignAvatarsByCreationOrder();

    expect($a1->fresh()->avatar)->toBe('avatar-1')
        ->and($b1->fresh()->avatar)->toBe('avatar-1')
        ->and($rest->map(fn ($p) => $p->fresh()->avatar)->all())
        ->toBe(['avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6', 'avatar-1']);
});

it('割り当てのとき、すでにアバターがあるプレイヤーは変えない', function () {
    $family = User::factory()->create()->schema()->create(['name' => 'C家']);
    $first = $family->profiles()->create(['name' => 'c1']);
    $second = $family->profiles()->create(['name' => 'c2']);
    DB::table('user_profiles')->where('id', $first->id)->update(['avatar' => null]);
    DB::table('user_profiles')->where('id', $second->id)->update(['avatar' => 'avatar-5']);

    UserProfile::assignAvatarsByCreationOrder();

    expect($first->fresh()->avatar)->toBe('avatar-1')
        ->and($second->fresh()->avatar)->toBe('avatar-5');
});
