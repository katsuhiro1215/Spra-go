<?php

use App\Models\Category;
use App\Models\Stage;
use App\Models\UserProfile;
use App\Support\TimeLimit;

// docs/design/2026-10-15-stage-rules-design.md（クリア基準の見せ方・HP・制限時間）

it('時間切れは、選んだ答えがなくても不正解として記録し、正しい答えを返す。HPは−1', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    $hp = $profile->fresh()->hp;

    $this->postJson("/api/questions/{$question->id}/answer", ['timed_out' => true])
        ->assertOk()
        ->assertJsonPath('correct', false)
        ->assertJsonPath('correct_choice_id', $correct->id)
        ->assertJsonPath('profile.hp', $hp - 1);

    expect($profile->fresh()->xp)->toBe(0)->and($profile->fresh()->coins)->toBe(0);
});

it('時間切れで、覚え具合には間違いとして残る', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['timed_out' => true])->assertOk();

    $memory = App\Models\ProfileQuestionMemory::where('user_profile_id', $profile->id)->where('question_id', $question->id)->first();
    expect($memory)->not->toBeNull();
});

it('マッチングの時間切れは、全部不正解で、それぞれの正しい答えを返す', function () {
    createActiveProfile();
    [$question, $choices] = createMatchingQuestionWithPairs(['jp' => '日本', 'fr' => 'フランス']);

    $response = $this->postJson("/api/questions/{$question->id}/answer", ['timed_out' => true])->assertOk();

    expect($response->json('correct'))->toBeFalse();
    $results = collect($response->json('results'))->keyBy('item_id');
    expect($results)->toHaveCount(2)
        ->and($results['jp']['correct'])->toBeFalse()->and($results['jp']['correct_choice_id'])->toBe($choices['jp']->id)
        ->and($results['fr']['correct_choice_id'])->toBe($choices['fr']->id);
});

it('並べ替え・仕分けの時間切れは、不正解になる', function () {
    createActiveProfile();
    [$ordering] = createOrderingQuestionWithChoices(['1', '2', '3']);
    $sorting = createSortingQuestion(['a' => 'A', 'b' => 'B'], ['x' => 'a', 'y' => 'b']);

    $this->postJson("/api/questions/{$ordering->id}/answer", ['timed_out' => true])->assertOk()->assertJsonPath('correct', false);
    $this->postJson("/api/questions/{$sorting->id}/answer", ['timed_out' => true])->assertOk()->assertJsonPath('correct', false);
});

it('HPが0のとき、ステージの途中の答え(continuing)は受け付け、HPは0のまま。1問目はいままでどおり止める', function () {
    $profile = createActiveProfile();
    UserProfile::where('id', $profile->id)->update(['hp' => 0, 'hp_updated_at' => now()]);
    [$question, $correct, $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])->assertStatus(409);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id, 'continuing' => true])
        ->assertOk()
        ->assertJsonPath('correct', false)
        ->assertJsonPath('profile.hp', 0);
    expect($profile->fresh()->hp)->toBe(0);

    // 正解のごほうびは、HP0でも付く
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'continuing' => true])
        ->assertOk()->assertJsonPath('correct', true);
    expect($profile->fresh()->xp)->toBeGreaterThan(0);
});

it('制限時間は、級の秒数に、問題の形の倍率をかける', function () {
    [$four] = createQuestionWithChoices();
    [$ordering] = createOrderingQuestionWithChoices(['1', '2']);
    [$matching] = createMatchingQuestionWithPairs(['jp' => '日本', 'fr' => 'フランス']);
    $sorting = createSortingQuestion(['a' => 'A', 'b' => 'B'], ['x' => 'a']);

    expect(TimeLimit::seconds('初級', $four))->toBe(40)
        ->and(TimeLimit::seconds('中級', $four))->toBe(30)
        ->and(TimeLimit::seconds('上級', $four))->toBe(30)
        ->and(TimeLimit::seconds('最高難易度', $four))->toBe(30)
        ->and(TimeLimit::seconds('初級', $ordering))->toBe(120)
        ->and(TimeLimit::seconds('中級', $matching))->toBe(90)
        ->and(TimeLimit::seconds('初級', $sorting))->toBe(120);

    $four->setAttribute('variant', ['kind' => 'spelling']);
    expect(TimeLimit::seconds('初級', $four))->toBe(80);
});

it('ステージの問題のデータに、問題ごとの制限時間と、クリアに要る数・出す数が付く', function () {
    createActiveProfile();
    [$question] = createQuestionWithChoices();
    $category = Category::create(['name' => '時間カテゴリー']);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '中級', 'stage_number' => 1, 'question_count' => 1]);
    $stage->questions()->attach([$question->id => ['order' => 1]]);

    $this->getJson("/api/stages/{$stage->id}")->assertOk()
        ->assertJsonPath('questions.0.time_limit', 30)
        ->assertJsonPath('play_count', 1)
        ->assertJsonPath('required', 1);
});

it('ボスのクリアに要る数は80%（10問なら8問）、通常は60%（6問）', function () {
    createActiveProfile();
    $category = Category::create(['name' => '数カテゴリー']);
    foreach ([[false, 6], [true, 8]] as $i => [$boss, $required]) {
        $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => $i + 1, 'question_count' => 10, 'is_boss' => $boss]);
        for ($n = 1; $n <= 10; $n++) {
            [$q] = createQuestionWithChoices();
            $stage->questions()->attach([$q->id => ['order' => $n]]);
        }
        $this->getJson("/api/stages/{$stage->id}")->assertOk()->assertJsonPath('required', $required)->assertJsonPath('play_count', 10);
    }
});
