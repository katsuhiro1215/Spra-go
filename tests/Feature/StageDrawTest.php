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

use App\Models\ProfileQuestionMemory;
use App\Support\StageDraw;

function poolIds(Stage $stage): array
{
    return $stage->questions()->orderBy('stage_questions.order')->pluck('questions.id')->all();
}

it('ボスは、先頭5問を毎回出す。出す数は10で、重ならない', function () {
    $profile = createActiveProfile();
    $stage = createPoolStage(30);
    $anchor = array_slice(poolIds($stage), 0, 5);

    foreach (range(1, 5) as $_) {
        $ids = StageDraw::pick($profile, $stage);
        expect($ids)->toHaveCount(10)
            ->and(array_unique($ids))->toHaveCount(10)
            ->and(array_diff($anchor, $ids))->toBe([]);
    }
});

it('まちがえた問題(先頭5問以外)は、最大3問まで先に混ぜる', function () {
    $profile = createActiveProfile();
    $stage = createPoolStage(30);
    $wrong = array_slice(poolIds($stage), 10, 5);
    foreach ($wrong as $i => $id) {
        ProfileQuestionMemory::create(['user_profile_id' => $profile->id, 'question_id' => $id, 'level' => 0, 'last_answered_on' => now()->toDateString(), 'wrong_on' => now()->subDays($i)->toDateString()]);
    }

    $ids = StageDraw::pick($profile, $stage);

    // いちばん新しくまちがえた3問が入る
    expect(array_diff(array_slice($wrong, 0, 3), $ids))->toBe([])
        ->and(count(array_intersect($wrong, $ids)))->toBeGreaterThanOrEqual(3);
});

it('ボスでないときは、前回の問題から5問が残る', function () {
    $profile = createActiveProfile();
    $stage = createPoolStage(30, 10, true, false);

    $first = StageDraw::pick($profile, $stage);
    $second = StageDraw::pick($profile, $stage);

    expect(count(array_intersect($first, $second)))->toBeGreaterThanOrEqual(5);
});

it('プールが出す数以下なら、全問を出す', function () {
    $profile = createActiveProfile();
    $stage = createPoolStage(4);

    expect(StageDraw::pick($profile, $stage))->toHaveCount(4);
});

it('別のプロフィールの前回の出題は使わない', function () {
    $profile = createActiveProfile();
    $stage = createPoolStage(30, 10, true, false);
    $other = createFamilyMember($profile);
    $theirs = StageDraw::pick($other, $stage);

    $mine = StageDraw::pick($profile, $stage);

    // 前回なしなので、残す5問の決まりは働かない(新しく10問)。人の出題が、自分の前回にならないことだけを見る
    expect($mine)->toHaveCount(10)
        ->and(\App\Models\ProfileStageDraw::where('user_profile_id', $profile->id)->count())->toBe(1)
        ->and(collect(\App\Models\ProfileStageDraw::where('user_profile_id', $other->id)->first()->question_ids)->sort()->values()->all())->toBe(collect($theirs)->sort()->values()->all());
});

it('同じ問題文が、続けて並ばない', function () {
    $profile = createActiveProfile();
    $stage = createPoolStage(0);
    $quiz = Quiz::first();
    foreach (range(1, 30) as $i) {
        $q = Question::create(['quiz_id' => $quiz->id, 'prompt' => $i <= 5 ? 'おなじ問題文' : "ちがう問題{$i}"]);
        $stage->questions()->attach($q->id, ['order' => $i]);
    }
    $stage->update(['is_boss' => false]);

    $ordered = collect(StageDraw::pick($profile, $stage))->map(fn ($id) => Question::find($id)->prompt)->all();

    foreach (range(1, 9) as $i) {
        expect($ordered[$i] === 'おなじ問題文' && $ordered[$i - 1] === 'おなじ問題文')->toBeFalse();
    }
});
