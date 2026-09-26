<?php

use App\Models\Question;
use App\Models\Quiz;
use App\Models\ShopItem;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * auth:sanctumはトークン未使用時、statefulなフロントエンドからのセッション認証(webガード)に
 * フォールバックする(config/sanctum.php)。$request->session() を使う各エンドポイントのテストで
 * 共通して使うため、個別のテストファイルではなくここに置く。
 */
function createActiveProfile(): UserProfile
{
    $user = User::factory()->create();
    $schema = $user->schema()->create(['name' => 'テスト家族']);
    $profile = $schema->profiles()->create(['name' => 'テストプレイヤー']);

    test()->actingAs($user)
        ->withHeader('Referer', 'http://localhost')
        ->withSession(['active_profile_id' => $profile->id]);

    return $profile;
}

/** @return array{0: Question, 1: \App\Models\QuestionChoice, 2: \App\Models\QuestionChoice} */
function createQuestionWithChoices(): array
{
    $quiz = Quiz::create(['title' => 'テストクイズ', 'difficulty' => '初級']);
    $question = Question::create(['quiz_id' => $quiz->id, 'prompt' => 'テスト問題']);
    $correct = $question->choices()->create(['label' => '正解', 'is_correct' => true, 'order' => 1]);
    $wrong = $question->choices()->create(['label' => '不正解', 'is_correct' => false, 'order' => 2]);

    return [$question, $correct, $wrong];
}

/**
 * 並べ替え問題を作る。$labelsInCorrectOrder は正解順に並んだラベルの配列。
 * question_choices.order を「正解の順序」として使う(表示側でシャッフルする)。
 *
 * @param  list<string>  $labelsInCorrectOrder
 * @return array{0: Question, 1: list<\App\Models\QuestionChoice>}
 */
function createOrderingQuestionWithChoices(array $labelsInCorrectOrder): array
{
    $quiz = Quiz::create(['title' => 'テスト並べ替えクイズ', 'difficulty' => '初級']);
    $question = Question::create([
        'quiz_id' => $quiz->id,
        'type' => 'ordering',
        'prompt' => '小さい順に並べよう',
    ]);

    $choices = collect($labelsInCorrectOrder)->map(
        fn (string $label, int $index) => $question->choices()->create([
            'label' => $label,
            'is_correct' => true,
            'order' => $index + 1,
        ]),
    )->all();

    return [$question, $choices];
}

/**
 * 仕分け(カゴ分け)問題を作る。$baskets は ['カゴid' => 'カゴ名']、
 * $itemToBasket は ['アイテムid' => '正解のカゴid'] の連想配列。
 * マッチングと異なり1つのカゴに複数アイテムが入りうるため、正解の対応は
 * question_choicesではなくquestions.meta(サーバー内部でのみ保持)に持たせる。
 *
 * @param  array<string, string>  $baskets
 * @param  array<string, string>  $itemToBasket
 * @return Question
 */
function createSortingQuestion(array $baskets, array $itemToBasket): Question
{
    $quiz = Quiz::create(['title' => 'テスト仕分けクイズ', 'difficulty' => '初級']);

    return Question::create([
        'quiz_id' => $quiz->id,
        'type' => 'sorting',
        'prompt' => 'アジアかヨーロッパかで仕分けよう',
        'meta' => [
            'items' => collect($itemToBasket)->map(fn (string $basketId, string $itemId) => [
                'id' => $itemId,
                'image' => "/flag/{$itemId}.svg",
                'correct_basket_id' => $basketId,
            ])->values()->all(),
            'baskets' => collect($baskets)->map(fn (string $label, string $basketId) => [
                'id' => $basketId,
                'label' => $label,
            ])->values()->all(),
        ],
    ]);
}

/**
 * マッチング(1対1)問題を作る。$pairs は ['アイテムid' => 'ラベル名'] の連想配列。
 *
 * @param  array<string, string>  $pairs
 * @return array{0: Question, 1: array<string, \App\Models\QuestionChoice>}
 */
function createMatchingQuestionWithPairs(array $pairs): array
{
    $quiz = Quiz::create(['title' => 'テストマッチングクイズ', 'difficulty' => '初級']);
    $question = Question::create([
        'quiz_id' => $quiz->id,
        'type' => 'matching',
        'prompt' => '国旗と国名を合わせよう',
        'meta' => [
            'items' => collect($pairs)->keys()->map(fn ($itemId) => [
                'id' => $itemId,
                'image' => "/flag/{$itemId}.svg",
            ])->all(),
        ],
    ]);

    $choicesByItemId = [];
    $order = 1;

    foreach ($pairs as $itemId => $label) {
        $choicesByItemId[$itemId] = $question->choices()->create([
            'label' => $label,
            'is_correct' => true,
            'order' => $order++,
            'meta' => ['item_id' => $itemId],
        ]);
    }

    return [$question, $choicesByItemId];
}

/** 町に置くアイテム(学習ポイント払い)を作る。町関連のテストで共通に使う */
function createDecoration(array $overrides = []): ShopItem
{
    return ShopItem::create(array_merge([
        'name' => 'ベンチ',
        'price' => 30,
        'type' => 'decoration',
        'currency' => 'point',
        'min_level' => 1,
        'meta' => ['asset_key' => 'bench'],
    ], $overrides));
}
