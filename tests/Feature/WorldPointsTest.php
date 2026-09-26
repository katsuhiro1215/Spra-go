<?php

use App\Models\Category;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| 学習ポイント(町のアイテムを買う通貨)の獲得テスト
|--------------------------------------------------------------------------
|
| 学習ポイントは正解・ステージクリア・初回プレゼントでしか増えない
| (課金コインとは別の通貨。docs/design/2026-09-26-world-town-design.md)。
|
*/

it('正解すると学習ポイントが10増え、台帳に記録される', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $correct->id,
    ]);

    $response->assertOk()->assertJsonPath('profile.points', 10);
    expect($profile->fresh()->points)->toBe(10);
    $this->assertDatabaseHas('profile_currency_ledger', [
        'user_profile_id' => $profile->id,
        'type' => 'point',
        'delta' => 10,
        'reason' => 'answer_correct',
    ]);
});

it('不正解では学習ポイントは増えない', function () {
    $profile = createActiveProfile();
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $wrong->id,
    ])->assertOk()->assertJsonPath('profile.points', 0);

    expect($profile->fresh()->points)->toBe(0);
});

it('ステージクリアで学習ポイントが50増える', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => 'ポイントテスト']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 1,
        'question_count' => 1,
    ]);

    $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 1])
        ->assertOk()
        ->assertJsonPath('profile.points', 50);

    expect($profile->fresh()->points)->toBe(50);
    $this->assertDatabaseHas('profile_currency_ledger', [
        'user_profile_id' => $profile->id,
        'type' => 'point',
        'delta' => 50,
        'reason' => 'stage_clear',
    ]);
});

it('学習ポイントは0未満にならない', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 5]);

    $profile->applyEconomy(['point' => -30], 'shop_purchase');

    expect($profile->fresh()->points)->toBe(0);
});

it('アクティブなプロフィール情報に学習ポイントが含まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['points' => 30]);

    $this->getJson('/api/profiles/active')
        ->assertOk()
        ->assertJsonPath('points', 30);
});
