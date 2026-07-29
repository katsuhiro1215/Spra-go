<?php

use App\Models\Category;
use App\Models\ShopItem;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| 経済ロジック(HP/XP/Coin)のテスト
|--------------------------------------------------------------------------
|
| クイズ回答・ステージクリア・ショップ購入はプレイヤーの通貨に直結するため、
| MVPで最優先にテストする領域(docs/MVPRequirements.md参照)。
| createActiveProfile()/createQuestionWithChoices()はtests/Pest.phpで定義
| (単体ファイル実行時でも他のテストファイルから使えるようにするため)。
|
*/

it('正解するとXPとコインが増え、HPが1減る', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $correct->id,
    ]);

    $response->assertOk()->assertJson(['correct' => true]);

    $profile->refresh();
    expect($profile->xp)->toBe(10);
    expect($profile->coins)->toBe(5);
    expect($profile->hp)->toBe(19);
});

it('連続正解でコンボが増える', function () {
    $profile = createActiveProfile();

    foreach (range(1, 3) as $i) {
        [$question, $correct] = createQuestionWithChoices();
        $response = $this->postJson("/api/questions/{$question->id}/answer", [
            'choice_id' => $correct->id,
        ]);
        expect($response->json('profile.combo'))->toBe($i);
    }

    expect($profile->fresh()->best_combo)->toBe(3);
});

it('不正解するとコンボが0にリセットされる(ベストは維持)', function () {
    $profile = createActiveProfile();

    [$q1, $c1] = createQuestionWithChoices();
    $this->postJson("/api/questions/{$q1->id}/answer", ['choice_id' => $c1->id]);

    [$q2, , $wrong2] = createQuestionWithChoices();
    $response = $this->postJson("/api/questions/{$q2->id}/answer", [
        'choice_id' => $wrong2->id,
    ]);

    expect($response->json('profile.combo'))->toBe(0);
    expect($profile->fresh()->best_combo)->toBe(1);
});

it('5連続正解でボーナスコインが付与される', function () {
    $profile = createActiveProfile();
    $lastResponse = null;

    foreach (range(1, 5) as $i) {
        [$question, $correct] = createQuestionWithChoices();
        $lastResponse = $this->postJson("/api/questions/{$question->id}/answer", [
            'choice_id' => $correct->id,
        ]);
    }

    expect($lastResponse->json('profile.combo'))->toBe(5);
    expect($lastResponse->json('profile.combo_milestone_bonus_coin'))->toBe(20);
    // 5問 × 5コイン + 5コンボボーナス20コイン
    expect($profile->fresh()->coins)->toBe(5 * 5 + 20);
});

it('不正解だとHPが2減り、XPとコインは増えない', function () {
    $profile = createActiveProfile();
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $wrong->id,
    ])->assertOk()->assertJson(['correct' => false]);

    $profile->refresh();
    expect($profile->hp)->toBe(18);
    expect($profile->xp)->toBe(0);
    expect($profile->coins)->toBe(0);
});

it('HPは0未満にならない', function () {
    $profile = createActiveProfile();
    $profile->update(['hp' => 1]);
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $wrong->id,
    ])->assertOk();

    expect($profile->fresh()->hp)->toBe(0);
});

it('XPが閾値を超えるとレベルアップしてHPが全回復する', function () {
    $profile = createActiveProfile();
    $profile->update(['xp' => 95, 'hp' => 5, 'max_hp' => 20]);
    [$question, $correct] = createQuestionWithChoices();

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $correct->id,
    ]);

    $profile->refresh();
    expect($profile->xp)->toBe(105);
    expect($profile->level)->toBe(2);
    expect($profile->hp)->toBe(20);
    expect($response->json('profile.leveled_up'))->toBeTrue();
});

it('ステージクリアでコインが増え、進捗が記録される', function () {
    $profile = createActiveProfile();
    $category = Category::create(['name' => 'テストカテゴリー']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 1,
        'question_count' => 1,
    ]);

    $response = $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 1]);

    $response->assertOk();
    $profile->refresh();
    expect($profile->coins)->toBe(100);
    $this->assertDatabaseHas('profile_stage_progress', [
        'user_profile_id' => $profile->id,
        'stage_id' => $stage->id,
        'attempts' => 1,
    ]);
});

it('ボスステージを満点クリアすると称号が付与される', function () {
    createActiveProfile();
    $category = Category::create(['name' => 'ボスカテゴリー']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '上級',
        'stage_number' => 1,
        'question_count' => 2,
        'is_boss' => true,
        'title_reward' => 'テスト博士',
    ]);
    [$q1] = createQuestionWithChoices();
    [$q2] = createQuestionWithChoices();
    $stage->questions()->attach([$q1->id => ['order' => 1], $q2->id => ['order' => 2]]);

    $response = $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 2]);

    $response->assertOk();
    expect($response->json('title_granted'))->toBeTrue();
    $this->assertDatabaseHas('profile_titles', [
        'title' => 'テスト博士',
    ]);
});

it('ボスステージでも満点でなければ称号は付与されない', function () {
    createActiveProfile();
    $category = Category::create(['name' => 'ボスカテゴリー2']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '上級',
        'stage_number' => 2,
        'question_count' => 2,
        'is_boss' => true,
        'title_reward' => 'テスト博士2',
    ]);
    [$q1] = createQuestionWithChoices();
    [$q2] = createQuestionWithChoices();
    $stage->questions()->attach([$q1->id => ['order' => 1], $q2->id => ['order' => 2]]);

    $response = $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 1]);

    $response->assertOk();
    expect($response->json('title_granted'))->toBeFalse();
    $this->assertDatabaseMissing('profile_titles', ['title' => 'テスト博士2']);
});

it('コインが足りないとショップ購入は失敗する', function () {
    createActiveProfile();
    $item = ShopItem::create(['name' => '回復薬', 'price' => 50, 'type' => 'potion', 'meta' => ['heal' => 10]]);

    $this->postJson("/api/shop/{$item->id}/purchase")->assertStatus(422);
});

it('ショップでアイテムを購入するとコインが減りHPが回復し、所持アイテムが記録される', function () {
    $profile = createActiveProfile();
    $profile->update(['coins' => 100, 'hp' => 5, 'max_hp' => 20]);
    $item = ShopItem::create(['name' => '回復薬', 'price' => 50, 'type' => 'potion', 'meta' => ['heal' => 10]]);

    $response = $this->postJson("/api/shop/{$item->id}/purchase");

    $response->assertOk();
    $profile->refresh();
    expect($profile->coins)->toBe(50);
    expect($profile->hp)->toBe(15);
    $this->assertDatabaseHas('user_profile_items', [
        'user_profile_id' => $profile->id,
        'shop_item_id' => $item->id,
    ]);
});

it('ショップ一覧には効果が実装済みのタイプ(potion/title)しか出てこない', function () {
    createActiveProfile();
    ShopItem::create(['name' => '回復薬', 'price' => 50, 'type' => 'potion']);
    ShopItem::create(['name' => '航空券', 'price' => 100, 'type' => 'plane']);
    ShopItem::create(['name' => '特別な称号', 'price' => 200, 'type' => 'title']);

    $response = $this->getJson('/api/shop');

    $response->assertOk();
    expect(collect($response->json())->pluck('type')->unique()->values()->all())
        ->toBe(['potion', 'title']);
});

it('未実装タイプ(plane等)の商品は購入APIを直接叩いても422になる', function () {
    $profile = createActiveProfile();
    $profile->update(['coins' => 1000]);
    $item = ShopItem::create(['name' => '航空券', 'price' => 100, 'type' => 'plane']);

    $this->postJson("/api/shop/{$item->id}/purchase")->assertStatus(422);
    expect($profile->fresh()->coins)->toBe(1000);
});

it('称号タイプの商品を購入すると称号が付与される', function () {
    $profile = createActiveProfile();
    $profile->update(['coins' => 300]);
    $item = ShopItem::create(['name' => '特別な称号', 'price' => 200, 'type' => 'title']);

    $response = $this->postJson("/api/shop/{$item->id}/purchase");

    $response->assertOk();
    expect($profile->fresh()->coins)->toBe(100);
    $this->assertDatabaseHas('profile_titles', [
        'user_profile_id' => $profile->id,
        'title' => '特別な称号',
    ]);
});
