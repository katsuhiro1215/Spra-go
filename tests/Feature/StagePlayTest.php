<?php

use App\Models\Category;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| ステージの出題(stages.play)
|--------------------------------------------------------------------------
|
| 正解の手がかりを隠す処理を app/Support/PlayableQuestion.php に切り出す前後で、
| 4択の出し方が変わらないことを確かめる(docs/design/2026-09-27-spru-wave-c-design.md 4-3)。
|
*/

it('ステージの4択は、正解1つと不正解3つを、正解の印を隠して出す', function () {
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    foreach (['ア', 'イ', 'ウ', 'エ'] as $i => $label) {
        $question->choices()->create(['label' => $label, 'is_correct' => false, 'order' => $i + 3]);
    }
    $category = Category::create(['name' => '4択カテゴリー']);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1, 'question_count' => 1]);
    $stage->questions()->attach([$question->id => ['order' => 1]]);

    $choices = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions.0.choices'));

    expect($choices)->toHaveCount(4)
        ->and($choices->pluck('id'))->toContain($correct->id);
    $choices->each(fn (array $choice) => expect($choice)->not->toHaveKey('is_correct'));
});
