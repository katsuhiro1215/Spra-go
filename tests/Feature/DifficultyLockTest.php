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

use App\Models\Question;
use App\Models\Quiz;

/** 通常ステージを作る(問題 $questions 問つき)。近道の「合計正答率」の分母になる */
function shortcutStage(Category $category, string $difficulty, int $number, bool $boss = false, int $questions = 10): Stage
{
    $quiz = Quiz::firstOrCreate(['title' => "近道{$category->id}{$difficulty}"], ['difficulty' => $difficulty]);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => $difficulty, 'stage_number' => $number, 'question_count' => $questions, 'is_boss' => $boss, 'title_reward' => $boss ? '近道はかせ' : null]);
    for ($i = 1; $i <= $questions; $i++) {
        $q = Question::create(['quiz_id' => $quiz->id, 'prompt' => "近道{$stage->id}-{$i}"]);
        $stage->questions()->attach($q->id, ['order' => $i]);
    }

    return $stage;
}

function playedScore($profile, Stage $stage, int $score, bool $cleared = false): void
{
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stage->id, 'best_score' => $score, 'attempts' => 1, 'cleared_at' => $cleared ? now() : null]);
}

function mediumLocked($test, Category $category): bool
{
    return difficultyGroup($test->getJson("/api/categories/{$category->id}/stages")->assertOk()->json(), '中級')['locked'];
}

it('近道: 前の級のボスが未クリアでも、3ステージ以上で合計正答率が50%を超えれば、次の級が開く', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => '近道の国']);
    $s1 = shortcutStage($category, '初級', 1);
    $s2 = shortcutStage($category, '初級', 2);
    $s3 = shortcutStage($category, '初級', 3);
    shortcutStage($category, '初級', 4, true);
    shortcutStage($category, '中級', 1);
    playedScore($profile, $s1, 6);
    playedScore($profile, $s2, 5);
    expect(mediumLocked($this, $category))->toBeTrue(); // 2ステージだけでは開かない

    playedScore($profile, $s3, 5); // 16/30 = 53%
    expect(mediumLocked($this, $category))->toBeFalse();
});

it('近道: 合計正答率がちょうど50%なら開かない', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => '近道の国2']);
    foreach ([1, 2, 3] as $n) {
        playedScore($profile, shortcutStage($category, '初級', $n), 5); // 15/30 = 50%
    }
    shortcutStage($category, '初級', 4, true);
    shortcutStage($category, '中級', 1);

    expect(mediumLocked($this, $category))->toBeTrue();
});

it('近道: ボスをクリア済みなら、正答率が低くても開く(今まで通り)', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => '近道の国3']);
    shortcutStage($category, '初級', 1);
    $boss = shortcutStage($category, '初級', 2, true);
    shortcutStage($category, '中級', 1);
    playedScore($profile, $boss, 8, true);

    expect(mediumLocked($this, $category))->toBeFalse();
});
