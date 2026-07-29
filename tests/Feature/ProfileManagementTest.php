<?php

use App\Models\User;
use App\Models\UserProfile;

/*
|--------------------------------------------------------------------------
| プロフィールの編集・削除のテスト
|--------------------------------------------------------------------------
|
| 家族利用を前提とするため、作り間違えたプロフィールを直せる/消せることは
| 最低限のCRUD(docs/AppRoadmap.md参照)。他人のプロフィールを操作できない
| ことも合わせて確認する。
|
*/

it('プロフィール名を変更できる', function () {
    $profile = createActiveProfile();

    $response = $this->patchJson("/api/profiles/{$profile->id}", [
        'name' => 'お母さん',
    ]);

    $response->assertOk();
    expect($profile->fresh()->name)->toBe('お母さん');
});

it('プロフィールを削除できる', function () {
    $profile = createActiveProfile();

    $this->deleteJson("/api/profiles/{$profile->id}")->assertNoContent();

    expect(UserProfile::find($profile->id))->toBeNull();
});

it('選択中のプロフィールを削除するとアクティブプロフィールが解除される', function () {
    $profile = createActiveProfile();

    $this->deleteJson("/api/profiles/{$profile->id}")->assertNoContent();

    $response = $this->getJson('/api/profiles/active');
    // Laravelのresponse()->json()系テストヘルパーは、デコード結果がnullだと
    // 「デコード失敗」とみなして例外を投げる既知の挙動があるため、
    // ここでは生のレスポンス内容を直接検証する(->json()は使わない)。
    $response->assertOk()->assertContent('null');
});

it('他人のプロフィールは変更できない', function () {
    createActiveProfile();

    $otherUser = User::factory()->create();
    $otherSchema = $otherUser->schema()->create(['name' => '別の家族']);
    $otherProfile = $otherSchema->profiles()->create(['name' => '他人のプロフィール']);

    $this->patchJson("/api/profiles/{$otherProfile->id}", ['name' => '乗っ取り'])
        ->assertStatus(403);

    expect($otherProfile->fresh()->name)->toBe('他人のプロフィール');
});

it('他人のプロフィールは削除できない', function () {
    createActiveProfile();

    $otherUser = User::factory()->create();
    $otherSchema = $otherUser->schema()->create(['name' => '別の家族']);
    $otherProfile = $otherSchema->profiles()->create(['name' => '他人のプロフィール']);

    $this->deleteJson("/api/profiles/{$otherProfile->id}")->assertStatus(403);

    expect(UserProfile::find($otherProfile->id))->not->toBeNull();
});
