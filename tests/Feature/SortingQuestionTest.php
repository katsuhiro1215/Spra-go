<?php

use App\Models\Category;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| 仕分け(カゴ分け)問題のテスト
|--------------------------------------------------------------------------
|
| マッチングの発展形で、1つのカゴに複数アイテムが入りうる出題形式。
| question_choicesは使わず、questions.meta(items/baskets)だけで完結する。
| 正解の対応(correct_basket_id)はitemsの中に持たせるが、ステージ取得API
| ではプレイヤーに漏らさないよう取り除いて返す。
|
*/

it('仕分け問題で全アイテムを正しいカゴに入れると正解になりXP/コインが増える', function () {
    $profile = createActiveProfile();
    $question = createSortingQuestion(
        baskets: ['asia' => 'アジア', 'europe' => 'ヨーロッパ'],
        itemToBasket: ['jp' => 'asia', 'fr' => 'europe', 'kr' => 'asia'],
    );

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'assignments' => [
            ['item_id' => 'jp', 'basket_id' => 'asia'],
            ['item_id' => 'fr', 'basket_id' => 'europe'],
            ['item_id' => 'kr', 'basket_id' => 'asia'],
        ],
    ]);

    $response->assertOk()->assertJson(['correct' => true]);
    expect($profile->fresh()->xp)->toBe(10);
    expect($profile->fresh()->coins)->toBe(5);
});

it('仕分け問題で1つでもカゴを間違うと不正解になる', function () {
    $profile = createActiveProfile();
    $question = createSortingQuestion(
        baskets: ['asia' => 'アジア', 'europe' => 'ヨーロッパ'],
        itemToBasket: ['jp' => 'asia', 'fr' => 'europe'],
    );

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'assignments' => [
            ['item_id' => 'jp', 'basket_id' => 'europe'],
            ['item_id' => 'fr', 'basket_id' => 'europe'],
        ],
    ]);

    $response->assertOk()->assertJson(['correct' => false]);
    expect($profile->fresh()->xp)->toBe(0);
});

it('仕分け問題で一部のアイテムが未回答だと422になる', function () {
    createActiveProfile();
    $question = createSortingQuestion(
        baskets: ['asia' => 'アジア', 'europe' => 'ヨーロッパ'],
        itemToBasket: ['jp' => 'asia', 'fr' => 'europe'],
    );

    $this->postJson("/api/questions/{$question->id}/answer", [
        'assignments' => [
            ['item_id' => 'jp', 'basket_id' => 'asia'],
        ],
    ])->assertStatus(422);
});

it('仕分け問題で存在しないbasket_idを送ると422になる', function () {
    createActiveProfile();
    $question = createSortingQuestion(
        baskets: ['asia' => 'アジア', 'europe' => 'ヨーロッパ'],
        itemToBasket: ['jp' => 'asia'],
    );

    $this->postJson("/api/questions/{$question->id}/answer", [
        'assignments' => [
            ['item_id' => 'jp', 'basket_id' => 'africa'],
        ],
    ])->assertStatus(422);
});

it('ステージ取得時に仕分け問題のitems/basketsが含まれ、正解の手がかり(correct_basket_id)は隠される', function () {
    createActiveProfile();
    $question = createSortingQuestion(
        baskets: ['asia' => 'アジア', 'europe' => 'ヨーロッパ'],
        itemToBasket: ['jp' => 'asia', 'fr' => 'europe'],
    );
    $category = Category::create(['name' => '仕分けカテゴリー']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'difficulty' => '初級',
        'stage_number' => 1,
        'question_count' => 1,
    ]);
    $stage->questions()->attach([$question->id => ['order' => 1]]);

    $response = $this->getJson("/api/stages/{$stage->id}");

    $response->assertOk();
    $responseQuestion = collect($response->json('questions'))->first();
    expect($responseQuestion['type'])->toBe('sorting');
    expect($responseQuestion['meta']['baskets'])->toHaveCount(2);
    expect($responseQuestion['meta']['items'])->toHaveCount(2);
    foreach ($responseQuestion['meta']['items'] as $item) {
        expect($item)->not->toHaveKey('correct_basket_id');
    }
});
