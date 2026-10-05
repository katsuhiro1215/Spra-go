<?php

use App\Models\Category;
use App\Models\Stage;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| ミニクイズの一覧(docs/design/2026-10-04-mini-app-tidy-design.md 3章)
|--------------------------------------------------------------------------
*/

/** ステージを $stages 個持つカテゴリーを作る。$options['questions'] が偽なら、ステージに問題を入れない */
function miniQuizCategory(string $name, int $stages, array $options = []): Category
{
    $category = Category::create([
        'name' => $name,
        'parent_id' => $options['parent'] ?? null,
        'order' => $options['order'] ?? 0,
    ]);

    for ($number = 1; $number <= $stages; $number++) {
        $stage = Stage::create([
            'category_id' => $category->id,
            'country_id' => $options['country'] ?? null,
            'difficulty' => '初級',
            'stage_number' => $number,
        ]);

        if ($options['questions'] ?? true) {
            [$question] = createQuestionWithChoices();
            $stage->questions()->attach($question->id, ['order' => 1]);
        }
    }

    return $category;
}

it('問題のあるステージが3つ以上ある大もとのカテゴリーだけを、ステージの数つきで返す', function () {
    createActiveProfile();
    $enough = miniQuizCategory('英語を学ぶ', 3);
    miniQuizCategory('国旗', 2);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([
        ['id' => $enough->id, 'name' => '英語を学ぶ', 'stage_count' => 3],
    ]);
});

it('子のカテゴリーは出さない(大もとのカテゴリーのステージだけを数える)', function () {
    createActiveProfile();
    $parent = Category::create(['name' => '世界遺産']);
    miniQuizCategory('日本', 5, ['parent' => $parent->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);
});

it('問題のないステージは数えない', function () {
    createActiveProfile();
    miniQuizCategory('からっぽ', 5, ['questions' => false]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);
});

it('鍵の国のステージは数えない。着いたら数える', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    miniQuizCategory('アメリカのクイズ', 3, ['country' => $us->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);

    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'アメリカのクイズ');
});

it('カテゴリーの順番(order)で返す', function () {
    createActiveProfile();
    miniQuizCategory('あと', 3, ['order' => 2]);
    miniQuizCategory('さき', 3, ['order' => 1]);

    expect(collect($this->getJson('/api/mini-quizzes')->assertOk()->json())->pluck('name')->all())->toBe(['さき', 'あと']);
});

it('ステージの数のしきい値は、設定で変えられる', function () {
    createActiveProfile();
    miniQuizCategory('ひとつだけ', 1);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);

    config(['quiz.mini_quiz.min_stages' => 1]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertJsonCount(1);
});

it('プロフィールを選んでいないログイン済みのユーザーにも、一覧を返す', function () {
    miniQuizCategory('英語を学ぶ', 3);
    $this->actingAs(User::factory()->create())->withHeader('Referer', 'http://localhost');

    $this->getJson('/api/mini-quizzes')->assertOk()->assertJsonCount(1);
});

it('ログインしていないと401', function () {
    $this->getJson('/api/mini-quizzes')->assertStatus(401);
});

it('コース親(is_course_group)は、子のステージの合計で数える。stage_countも合計', function () {
    createActiveProfile();
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);
    miniQuizCategory('アジア', 2, ['parent' => $group->id]);
    miniQuizCategory('ヨーロッパ', 2, ['parent' => $group->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([
        ['id' => $group->id, 'name' => '国旗クイズ', 'stage_count' => 4],
    ]);
});

it('合計が足りないコース親・目印のない親は、出さない(今の「国旗」のように子にステージがあっても出ない)', function () {
    createActiveProfile();
    $few = Category::create(['name' => 'すこし', 'is_course_group' => true]);
    miniQuizCategory('ひとつ', 2, ['parent' => $few->id]);
    $plain = Category::create(['name' => '国旗']);
    miniQuizCategory('日本', 5, ['parent' => $plain->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);
});

it('コース親の子のうち、鍵の国のステージは数えない', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $group = Category::create(['name' => 'まとめ', 'is_course_group' => true]);
    miniQuizCategory('ふつう', 2, ['parent' => $group->id]);
    miniQuizCategory('アメリカの', 2, ['parent' => $group->id, 'country' => $us->id]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertExactJson([]);

    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    $this->getJson('/api/mini-quizzes')->assertOk()->assertJsonPath('0.stage_count', 4);
});
