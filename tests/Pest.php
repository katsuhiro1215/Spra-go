<?php

use App\Models\Question;
use App\Models\Quiz;
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
