<?php

use App\Models\Category;
use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use App\Models\Word;
use App\Support\QuizVariants;

/*
|--------------------------------------------------------------------------
| スペルを並べる形(docs/design/2026-10-09-review-variety-design.md 2・3章)
|--------------------------------------------------------------------------
*/

/**
 * 英語の単語の問題を並べたステージを作る。$words は 単語 => 日本語(省略なら level 20)。単語帳の行も作る
 *
 * @param  array<string, string>  $words
 * @return array{0: Stage, 1: array<string, Question>}
 */
function spellingStage(array $words, int $level = 20): array
{
    $category = Category::query()->firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1]);
    $quiz = Quiz::create(['title' => 'スペルのテスト', 'difficulty' => '初級']);
    $questions = [];

    foreach ($words as $english => $japanese) {
        $word = Word::create([
            'language' => 'en', 'word' => $english, 'key' => strtolower($english), 'level' => $level,
            'meanings' => [['pos' => '名', 'ja' => [$japanese]]],
        ]);
        $question = Question::create([
            'quiz_id' => $quiz->id, 'type' => 'multiple_choice', 'prompt' => "「{$english}」の意味は？",
            'meta' => ['kind' => 'word', 'word' => strtolower($english), 'level' => $level, 'word_id' => $word->id, 'direction' => 'en_ja'],
        ]);
        foreach ([$japanese, 'あ', 'い', 'う'] as $index => $label) {
            $question->choices()->create(['label' => $label, 'is_correct' => $index === 0, 'order' => $index + 1]);
        }
        $stage->questions()->attach($question->id, ['order' => count($questions) + 1]);
        $questions[$english] = $question;
    }

    return [$stage, $questions];
}

/** その子が前に答えたことにする */
function answeredBefore($profile, Question ...$questions): void
{
    foreach ($questions as $question) {
        ProfileQuestionMemory::create([
            'user_profile_id' => $profile->id, 'question_id' => $question->id, 'level' => 2, 'due_on' => now()->addDays(3)->toDateString(),
            'last_answered_on' => \App\Support\Garden::today(),
        ]);
    }
}

function playStage($test, Stage $stage): array
{
    return collect($test->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'))->keyBy(fn ($q) => $q['id'])->all();
}

it('初めて会う単語は、スペルの形にならず、今までの4択', function () {
    createActiveProfile();
    [$stage] = spellingStage(['apple' => 'りんご', 'banana' => 'バナナ']);

    foreach (playStage($this, $stage) as $question) {
        expect($question)->not->toHaveKey('variant')
            ->and($question['choices'])->toHaveCount(4);
    }
});

it('前に答えた単語は、スペルの形になる。選択肢は空で、正解の綴りは返さない', function () {
    $profile = createActiveProfile();
    [$stage, $questions] = spellingStage(['apple' => 'りんご']);
    answeredBefore($profile, $questions['apple']);

    $question = playStage($this, $stage)[$questions['apple']->id];

    expect($question['variant']['kind'])->toBe('spelling')
        ->and($question['variant']['prompt'])->toBe('「りんご」を 英語で かこう')
        ->and($question['variant']['length'])->toBe(5)
        ->and($question['choices'])->toBe([])
        ->and(json_encode($question))->not->toContain('apple');
    // 文字は、単語の文字を全部含む(p は2つ)
    $letters = $question['variant']['letters'];
    expect(array_count_values($letters)['p'])->toBeGreaterThanOrEqual(2)
        ->and(array_diff(['a', 'p', 'l', 'e'], $letters))->toBe([]);
});

it('まちがいの文字は、レベル20なら2個・レベル10以下なら1個で、単語にない文字', function (int $level, int $extra) {
    $profile = createActiveProfile();
    [$stage, $questions] = spellingStage(['cat' => 'ねこ'], $level);
    answeredBefore($profile, $questions['cat']);

    $letters = playStage($this, $stage)[$questions['cat']->id]['variant']['letters'];

    expect($letters)->toHaveCount(3 + $extra);
    $others = array_diff($letters, ['c', 'a', 't']);
    expect($others)->toHaveCount($extra);
})->with(['レベル20' => [20, 2], 'レベル10' => [10, 1]]);

it('1ステージに最大2問で、隣り合わない', function () {
    $profile = createActiveProfile();
    [$stage, $questions] = spellingStage(['apple' => 'りんご', 'banana' => 'バナナ', 'cherry' => 'さくらんぼ', 'lemon' => 'レモン', 'grape' => 'ぶどう', 'melon' => 'メロン']);
    answeredBefore($profile, ...array_values($questions));

    foreach (range(1, 8) as $trial) {
        $list = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'))->values();
        $flags = $list->map(fn ($q) => isset($q['variant']))->all();
        expect(array_sum($flags))->toBeLessThanOrEqual(2);
        foreach ($flags as $i => $flag) {
            expect($flag && ($flags[$i + 1] ?? false))->toBeFalse();
        }
    }
});

it('英字3〜8文字だけが対象。熟語・短い・長い語・英語以外は4択のまま', function () {
    $profile = createActiveProfile();
    [$stage, $questions] = spellingStage(['ice cream' => 'アイス', 'a' => 'ひとつの', 'extraordinary' => '並外れた', "don't" => 'しない']);
    $other = Question::create(['quiz_id' => $questions['a']->quiz_id, 'type' => 'multiple_choice', 'prompt' => '日本の首都は？']);
    foreach (['東京', '大阪', '京都', '奈良'] as $index => $label) {
        $other->choices()->create(['label' => $label, 'is_correct' => $index === 0, 'order' => $index + 1]);
    }
    $stage->questions()->attach($other->id, ['order' => 9]);
    answeredBefore($profile, ...array_values($questions), ...[$other]);

    foreach (playStage($this, $stage) as $question) {
        expect($question)->not->toHaveKey('variant');
    }
});

it('スペルで答える: 正解(大文字小文字は区別しない)で、元の問題の覚え具合に残り、正しい綴りを返す', function () {
    $profile = createActiveProfile();
    [, $questions] = spellingStage(['apple' => 'りんご']);
    answeredBefore($profile, $questions['apple']);

    $this->postJson("/api/questions/{$questions['apple']->id}/answer", ['spelling' => 'APPle'])
        ->assertOk()
        ->assertJsonPath('correct', true)
        ->assertJsonPath('correct_spelling', 'apple')
        ->assertJsonPath('word_id', $questions['apple']->meta['word_id']);

    expect(ProfileQuestionMemory::where('question_id', $questions['apple']->id)->value('last_answered_on')->toDateString())->toBe(\App\Support\Garden::today()); // 日本の日付(サーバーの時刻はUTC)
});

it('スペルのまちがいは、まちがいとして記録され、正しい綴りも返す', function () {
    $profile = createActiveProfile();
    [, $questions] = spellingStage(['apple' => 'りんご']);
    answeredBefore($profile, $questions['apple']);

    $this->postJson("/api/questions/{$questions['apple']->id}/answer", ['spelling' => 'aple'])
        ->assertOk()
        ->assertJsonPath('correct', false)
        ->assertJsonPath('correct_spelling', 'apple');

    expect(ProfileQuestionMemory::where('question_id', $questions['apple']->id)->value('wrong_on'))->not->toBeNull();
});

it('対象外の問題・文字でない答えへの spelling は、422', function (string $word, mixed $spelling) {
    createActiveProfile();
    [, $questions] = spellingStage([$word => 'テスト']);

    $this->postJson("/api/questions/{$questions[$word]->id}/answer", ['spelling' => $spelling])->assertStatus(422);
})->with([
    '熟語' => ['ice cream', 'icecream'],
    '長い語' => ['extraordinary', 'extraordinary'],
    '記号' => ['apple', 'ap-le'],
    '数字' => ['apple', '12345'],
    '空' => ['apple', ''],
]);

it('練習では、正解かどうかだけを返し、記録しない', function () {
    $profile = createActiveProfile();
    [, $questions] = spellingStage(['apple' => 'りんご']);
    answeredBefore($profile, $questions['apple']);

    $this->postJson("/api/questions/{$questions['apple']->id}/answer", ['spelling' => 'apple', 'practice' => true])
        ->assertOk()
        ->assertJsonPath('correct', true)
        ->assertJsonPath('correct_spelling', 'apple');

    expect(ProfileQuestionMemory::where('question_id', $questions['apple']->id)->value('last_answered_on')->toDateString())->toBe(\App\Support\Garden::today()); // 日本の日付(サーバーの時刻はUTC)
});

it('対象の条件(eligible)は、英字3〜8文字の単語の問題だけ', function () {
    [, $questions] = spellingStage(['apple' => 'りんご', 'a' => 'ひとつ', 'ice cream' => 'アイス']);

    expect(QuizVariants::eligible($questions['apple']))->toBeTrue()
        ->and(QuizVariants::eligible($questions['a']))->toBeFalse()
        ->and(QuizVariants::eligible($questions['ice cream']))->toBeFalse();
});
