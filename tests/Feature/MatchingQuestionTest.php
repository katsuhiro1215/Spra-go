<?php

use App\Models\Category;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| マッチング問題(タップ式)のテスト
|--------------------------------------------------------------------------
|
| 国旗×国名などをN対Nでペアにする新しい出題形式(SPEC 4-4c相当)。
| 通常の4択(choice_id 1件)とは異なり、answers配列で全ペアを一度に送信する。
| 1つでも間違っていれば不正解として扱う(既存のHP/コンボ加算はそのまま流用)。
|
*/

it('マッチング問題で全ペア正解すると正解になりXP/コインが増える', function () {
    $profile = createActiveProfile();
    [$question, $choices] = createMatchingQuestionWithPairs([
        'jp' => '日本',
        'fr' => 'フランス',
        'us' => 'アメリカ',
    ]);

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'answers' => [
            ['item_id' => 'jp', 'choice_id' => $choices['jp']->id],
            ['item_id' => 'fr', 'choice_id' => $choices['fr']->id],
            ['item_id' => 'us', 'choice_id' => $choices['us']->id],
        ],
    ]);

    $response->assertOk()->assertJson(['correct' => true]);
    expect($profile->fresh()->xp)->toBe(10);
    expect($profile->fresh()->coins)->toBe(5);
});

it('マッチング問題で1ペアでも間違うと不正解になる', function () {
    $profile = createActiveProfile();
    [$question, $choices] = createMatchingQuestionWithPairs([
        'jp' => '日本',
        'fr' => 'フランス',
        'us' => 'アメリカ',
    ]);

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'answers' => [
            ['item_id' => 'jp', 'choice_id' => $choices['fr']->id],
            ['item_id' => 'fr', 'choice_id' => $choices['jp']->id],
            ['item_id' => 'us', 'choice_id' => $choices['us']->id],
        ],
    ]);

    $response->assertOk()->assertJson(['correct' => false]);
    expect($profile->fresh()->xp)->toBe(0);
});

it('マッチング問題の回答には正誤の内訳(results)が含まれる', function () {
    createActiveProfile();
    [$question, $choices] = createMatchingQuestionWithPairs([
        'jp' => '日本',
        'fr' => 'フランス',
    ]);

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'answers' => [
            ['item_id' => 'jp', 'choice_id' => $choices['fr']->id],
            ['item_id' => 'fr', 'choice_id' => $choices['fr']->id],
        ],
    ]);

    $response->assertOk();
    $results = collect($response->json('results'))->keyBy('item_id');
    expect($results['jp']['correct'])->toBeFalse();
    expect($results['jp']['correct_choice_id'])->toBe($choices['jp']->id);
    expect($results['fr']['correct'])->toBeTrue();
});

it('マッチング問題で一部のアイテムが未回答だと422になる', function () {
    createActiveProfile();
    [$question, $choices] = createMatchingQuestionWithPairs([
        'jp' => '日本',
        'fr' => 'フランス',
    ]);

    $this->postJson("/api/questions/{$question->id}/answer", [
        'answers' => [
            ['item_id' => 'jp', 'choice_id' => $choices['jp']->id],
        ],
    ])->assertStatus(422);
});

it('マッチング問題に対して従来のchoice_idだけを送ると422になる', function () {
    createActiveProfile();
    [$question, $choices] = createMatchingQuestionWithPairs(['jp' => '日本']);

    $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => $choices['jp']->id,
    ])->assertStatus(422);
});

it('ステージ取得時にマッチング問題のitemsが含まれ、正解の手がかり(is_correct/meta)は隠される', function () {
    createActiveProfile();
    [$question] = createMatchingQuestionWithPairs(['jp' => '日本', 'fr' => 'フランス']);
    $category = Category::create(['name' => 'マッチングカテゴリー']);
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
    expect($responseQuestion['type'])->toBe('matching');
    expect($responseQuestion['meta']['items'])->toHaveCount(2);
    expect(collect($responseQuestion['choices'])->pluck('label')->sort()->values()->all())
        ->toBe(['フランス', '日本']);
    foreach ($responseQuestion['choices'] as $choice) {
        expect($choice)->not->toHaveKey('is_correct');
        expect($choice)->not->toHaveKey('meta');
    }
});
