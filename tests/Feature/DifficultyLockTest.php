<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| 難易度ロック(初級→中級→上級の解放条件)のテスト
|--------------------------------------------------------------------------
|
| 前の難易度のボスステージクリアが次の難易度の解放条件。
| createActiveProfile()はtests/Feature/EconomyTest.phpで定義済みのヘルパーを再利用する。
|
*/

function difficultyGroup(array $groups, string $difficulty): ?array
{
    foreach ($groups as $group) {
        if ($group['difficulty'] === $difficulty) {
            return $group;
        }
    }

    return null;
}

it('初級は常にロックされていない', function () {
    createActiveProfile();
    $category = Category::create(['name' => 'ロックテスト国']);
    Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1]);

    $response = $this->getJson("/api/categories/{$category->id}/stages");

    $response->assertOk();
    expect(difficultyGroup($response->json(), '初級')['locked'])->toBeFalse();
});

it('初級のボスをクリアするまで中級はロックされる', function () {
    createActiveProfile();
    $category = Category::create(['name' => 'ロックテスト国2']);
    Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1]);
    Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 2,
        'is_boss' => true,
        'title_reward' => 'テスト博士',
    ]);
    Stage::create(['category_id' => $category->id, 'difficulty' => '中級', 'stage_number' => 1]);

    $response = $this->getJson("/api/categories/{$category->id}/stages");

    expect(difficultyGroup($response->json(), '中級')['locked'])->toBeTrue();
});

it('初級のボスをクリアすると中級のロックが解除される', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => 'ロックテスト国3']);
    Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1]);
    $boss = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 2,
        'is_boss' => true,
        'title_reward' => 'テスト博士',
    ]);
    Stage::create(['category_id' => $category->id, 'difficulty' => '中級', 'stage_number' => 1]);

    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $boss->id,
        'cleared_at' => now(),
    ]);

    $response = $this->getJson("/api/categories/{$category->id}/stages");

    expect(difficultyGroup($response->json(), '中級')['locked'])->toBeFalse();
});

it('中級にボスステージが無い間は上級が常にロックされる', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => 'ロックテスト国4']);
    $beginnerBoss = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 1,
        'is_boss' => true,
        'title_reward' => 'テスト博士',
    ]);
    Stage::create(['category_id' => $category->id, 'difficulty' => '中級', 'stage_number' => 1]);
    // 中級にはボスステージがまだ無い(コンテンツ未整備)

    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $beginnerBoss->id,
        'cleared_at' => now(),
    ]);

    $response = $this->getJson("/api/categories/{$category->id}/stages");

    expect(difficultyGroup($response->json(), '上級')['locked'])->toBeTrue();
});
