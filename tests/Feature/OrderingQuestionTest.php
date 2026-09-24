<?php

use App\Models\Category;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| 並べ替え問題(タップ式)のテスト
|--------------------------------------------------------------------------
|
| 選択肢を正しい順序でタップして並べる出題形式。question_choices.orderを
| 「正解の順序」として使い、回答はanswer_order(選んだ順のchoice_id配列)を
| まるごと送信する。1つでもズレていれば不正解として扱う。
|
*/

it('並べ替え問題で正しい順序を送ると正解になりXP/コインが増える', function () {
    $profile = createActiveProfile();
    [$question, $choices] = createOrderingQuestionWithChoices(['小', '中', '大']);

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'answer_order' => collect($choices)->pluck('id')->all(),
    ]);

    $response->assertOk()->assertJson(['correct' => true]);
    expect($profile->fresh()->xp)->toBe(10);
    expect($profile->fresh()->coins)->toBe(5);
});

it('並べ替え問題で順序が1箇所でも違うと不正解になる', function () {
    $profile = createActiveProfile();
    [$question, $choices] = createOrderingQuestionWithChoices(['小', '中', '大']);

    $response = $this->postJson("/api/questions/{$question->id}/answer", [
        'answer_order' => [$choices[0]->id, $choices[2]->id, $choices[1]->id],
    ]);

    $response->assertOk()->assertJson(['correct' => false]);
    expect($profile->fresh()->xp)->toBe(0);
});

it('並べ替え問題の件数が選択肢数と一致しないと422になる', function () {
    createActiveProfile();
    [$question, $choices] = createOrderingQuestionWithChoices(['小', '中', '大']);

    $this->postJson("/api/questions/{$question->id}/answer", [
        'answer_order' => [$choices[0]->id, $choices[1]->id],
    ])->assertStatus(422);
});

it('並べ替え問題に対して従来のchoice_idだけを送ると422になる', function () {
    createActiveProfile();
    [$question] = createOrderingQuestionWithChoices(['小', '中', '大']);

    $this->postJson("/api/questions/{$question->id}/answer", [
        'choice_id' => 1,
    ])->assertStatus(422);
});

it('ステージ取得時に並べ替え問題の選択肢はシャッフルされ、正解の手がかり(order/is_correct)は隠される', function () {
    createActiveProfile();
    [$question] = createOrderingQuestionWithChoices(['小', '中', '大']);
    $category = Category::create(['name' => '並べ替えカテゴリー']);
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
    expect($responseQuestion['type'])->toBe('ordering');
    expect(collect($responseQuestion['choices'])->pluck('label')->sort()->values()->all())
        ->toBe(['中', '大', '小']);
    foreach ($responseQuestion['choices'] as $choice) {
        expect($choice)->not->toHaveKey('is_correct');
        expect($choice)->not->toHaveKey('order');
    }
});
