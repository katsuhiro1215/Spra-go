<?php

use App\Models\Word;

/** 単語の内容の原稿(word-details)の取り込み(docs/design/2026-10-07-word-book-design.md 4-3・7章) */
const DETAILS_HEADER = '英単語,発音記号,品詞別の意味,使われる場面,例文1,例文1の訳,例文2,例文2の訳,似た語,重要度';

/** 取り込み用のフォルダに、内容の原稿(word-details/a.csv)を足す */
function addDetails(string $dir, array $rows): string
{
    @mkdir("{$dir}/word-details", 0777, true);
    file_put_contents("{$dir}/word-details/a.csv", "\xEF\xBB\xBF".implode("\n", [DETAILS_HEADER, ...$rows])."\n");

    return $dir;
}

it('内容の原稿が、語に入る(発音記号・品詞別の意味・使われる場面・例文・似た語・重要度)', function () {
    $dir = addDetails(englishFixture(), [
        'cat,[kæt],"名詞:猫,ねこ／動詞:むちでうつ",ペットとして飼うとき。,I have a cat.,わたしはねこを飼っています。,The cat is cute.,そのねこはかわいい。,kitten:子猫|pet:ペット,2',
    ]);

    $result = importEnglish($dir);

    $cat = Word::where('key', 'cat')->firstOrFail();
    expect($cat->ipa)->toBe('kæt')
        ->and($cat->meanings)->toEqual([['pos' => '名', 'ja' => ['猫', 'ねこ']], ['pos' => '動', 'ja' => ['むちでうつ']]])
        ->and($cat->usage)->toBe('ペットとして飼うとき。')
        ->and($cat->examples)->toEqual([['text' => 'I have a cat.', 'translation' => 'わたしはねこを飼っています。'], ['text' => 'The cat is cute.', 'translation' => 'そのねこはかわいい。']])
        ->and($cat->synonyms)->toEqual([['term' => 'kitten', 'note' => '子猫'], ['term' => 'pet', 'note' => 'ペット']])
        ->and($cat->importance)->toBe(2)
        ->and($result['details'])->toBe(['applied' => 1, 'problems' => []]);
});

it('原稿がなくても取り込める。取り込み済みの内容は、原稿なしの再実行で消えない', function () {
    $dir = addDetails(englishFixture(), ['cat,kæt,名詞:猫,,I have a cat.,わたしはねこを飼っています。,,,,']);
    expect(importEnglish($dir)['details']['applied'])->toBe(1);

    $withoutDetails = $dir.'-copy';
    mkdir("{$withoutDetails}/words", 0777, true);
    mkdir("{$withoutDetails}/sentences", 0777, true);
    copy("{$dir}/words/a.csv", "{$withoutDetails}/words/a.csv");
    copy("{$dir}/sentences/a.csv", "{$withoutDetails}/sentences/a.csv");
    expect(importEnglish($withoutDetails)['details'])->toBe(['applied' => 0, 'problems' => []])->and(Word::where('key', 'cat')->value('ipa'))->toBe('kæt');
});

it('空の列は、すでにある内容を消さない。再実行しても同じ', function () {
    $dir = addDetails(englishFixture(), ['cat,kæt,名詞:猫,ペットのとき。,I have a cat.,わたしはねこを飼っています。,,,kitten:子猫,3']);
    importEnglish($dir);
    addDetails($dir, ['cat,,,,,,,,,']);
    importEnglish($dir);
    $once = Word::where('key', 'cat')->first()->only(['ipa', 'usage', 'examples', 'synonyms', 'importance', 'meanings']);

    importEnglish($dir);

    expect(Word::where('key', 'cat')->first()->only(['ipa', 'usage', 'examples', 'synonyms', 'importance', 'meanings']))->toEqual($once)
        ->and($once['ipa'])->toBe('kæt')->and($once['usage'])->toBe('ペットのとき。')->and($once['importance'])->toBe(3);
});

it('形式の誤りは、取り込みを止めずに、ファイル名と行番号つきで報告する(誤りのない列は入る)。原稿にない語は飛ばす', function () {
    $dir = addDetails(englishFixture(), [
        'cat,kæt,猫だけ(品詞なし),ペットのとき。,,,,,kitten,5',
        'zzz,zz,名詞:ふしぎ,,,,,,,2',
        'dog,dɔɡ,名詞:犬,,,,,,,2',
    ]);

    $result = importEnglish($dir);

    expect($result['details']['applied'])->toBe(2)
        ->and($result['details']['problems'])->toHaveCount(4)
        ->and($result['details']['problems'][0])->toContain('a.csv')->toContain('行2')->toContain('品詞別の意味')
        ->and(implode("\n", $result['details']['problems']))->toContain('似た語')->toContain('重要度')->toContain('zzz');

    $cat = Word::where('key', 'cat')->firstOrFail();
    expect($cat->ipa)->toBe('kæt')->and($cat->usage)->toBe('ペットのとき。')
        ->and($cat->meanings)->toEqual([['pos' => '名', 'ja' => ['猫']]])
        ->and($cat->importance)->toBe(3)
        ->and(Word::where('key', 'dog')->first()->meanings)->toEqual([['pos' => '名', 'ja' => ['犬']]]);
});

it('例文は最大3つ、似た語は最大5つ', function () {
    $dir = englishFixture();
    $header = DETAILS_HEADER.',例文3,例文3の訳,例文4,例文4の訳';
    @mkdir("{$dir}/word-details", 0777, true);
    file_put_contents("{$dir}/word-details/a.csv", implode("\n", [
        $header,
        'cat,,,,e1,t1,e2,t2,a:1|b:2|c:3|d:4|e:5|f:6,,e3,t3,e4,t4',
    ])."\n");

    importEnglish($dir);

    $cat = Word::where('key', 'cat')->first();
    expect($cat->examples)->toHaveCount(3)->and($cat->synonyms)->toHaveCount(5);
});
