<?php

use App\Models\Country;
use App\Models\Word;

/*
|--------------------------------------------------------------------------
| ふりがな辞書の材料の書き出し(docs/design/2026-10-09-furigana-morph-design.md 3-1)
|--------------------------------------------------------------------------
*/

function corpusLines(): array
{
    $path = storage_path('framework/testing/furigana-corpus.txt');
    @mkdir(dirname($path), 0777, true);
    test()->artisan('furigana:corpus', ['path' => $path])->assertSuccessful();
    $lines = array_values(array_filter(explode("\n", file_get_contents($path))));
    @unlink($path);

    return $lines;
}

it('問題・選択肢・解説・単語帳・国の、漢字を含む文字を、重複なしで書き出す。漢字のない行は出ない', function () {
    [$question, $correct] = createQuestionWithChoices();
    $question->update(['prompt' => '友達と別れます。', 'explanation' => ['summary' => '「別れる」は、さようならをすること。', 'tip' => 'abc']]);
    $correct->update(['label' => '別れる']);
    createQuestionWithChoices()[0]->update(['prompt' => '友達と別れます。']); // 同じ文
    Word::create([
        'language' => 'en', 'word' => 'part', 'key' => 'part', 'level' => 1, 'pos' => 'verb', 'importance' => 1,
        'meanings' => [['pos' => '動詞', 'ja' => ['別れる', '分ける']]],
        'usage' => '人と別れる場面', 'examples' => [['text' => 'We part here.', 'translation' => 'ここで別れよう。']],
    ]);
    Country::create(['code' => 'jp', 'three_code' => 'JPN', 'name' => '日本', 'name_en' => 'Japan', 'country_code' => 81, 'intro_message' => '桜の国へようこそ']);

    $lines = corpusLines();

    expect($lines)->toContain('友達と別れます。', '「別れる」は、さようならをすること。', '別れる', '分ける', '人と別れる場面', 'ここで別れよう。', '日本', '桜の国へようこそ')
        ->and(array_count_values($lines)['友達と別れます。'])->toBe(1)
        ->and($lines)->not->toContain('abc', 'We part here.');
});

it('改行は空白に直して、1文を1行にする', function () {
    [$question] = createQuestionWithChoices();
    $question->update(['prompt' => "一行目の問題\n二行目の問題"]);

    expect(corpusLines())->toContain('一行目の問題 二行目の問題');
});
