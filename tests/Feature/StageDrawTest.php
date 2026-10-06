<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;

/** プールのステージ(docs/design/2026-10-06-prefecture-master-design.md 3章) */

/** 問題を $poolSize 問つなげたステージを作る。問題文は「問題{番号}」 */
function createPoolStage(int $poolSize, int $count = 10, bool $isPool = true, bool $boss = true, string $name = 'プール'): Stage
{
    $category = Category::firstOrCreate(['name' => $name]);
    $quiz = Quiz::create(['title' => "{$name}クイズ", 'difficulty' => '初級']);
    $stage = Stage::create([
        'category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1,
        'question_count' => $count, 'is_boss' => $boss, 'is_pool' => $isPool,
    ]);
    for ($i = 1; $i <= $poolSize; $i++) {
        $question = Question::create(['quiz_id' => $quiz->id, 'prompt' => "問題{$i}"]);
        $question->choices()->create(['label' => '正解', 'is_correct' => true, 'order' => 1]);
        $question->choices()->create(['label' => 'ちがう', 'is_correct' => false, 'order' => 2]);
        $stage->questions()->attach($question->id, ['order' => $i]);
    }

    return $stage;
}

it('プールのステージは、出す数までが満点になる', function () {
    expect(createPoolStage(20)->playCount())->toBe(10);
});

it('プールでないステージは、割り当てた問題すべてが満点になる(今まで通り)', function () {
    expect(createPoolStage(12, 10, false)->playCount())->toBe(12);
});

it('プールが出す数より少ないときは、全問が満点になる', function () {
    expect(createPoolStage(4)->playCount())->toBe(4);
});
