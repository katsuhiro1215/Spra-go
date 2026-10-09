<?php

use App\Support\Space\SpaceCatalog;

/*
|--------------------------------------------------------------------------
| 宇宙の問題の読み込みと検証(docs/design/2026-10-09-space-quiz-design.md 5章)
|--------------------------------------------------------------------------
*/

const SPACE_Q_HEADER = '難しさ,テーマ,番号,形,問題文,正解,まちがい1,まちがい2,まちがい3,解説(要約),根拠番号';
const SPACE_P_HEADER = 'キー,名前,種類,描く内容,見分けのポイント,まちがえやすい描き方,根拠番号';

/** @param  list<string>  $questions  @param  list<string>  $pictures */
function spaceDir(array $questions, array $pictures = []): string
{
    $dir = sys_get_temp_dir().'/space-'.bin2hex(random_bytes(4));
    mkdir($dir);
    file_put_contents("{$dir}/questions.csv", "\xEF\xBB\xBF".implode("\n", [SPACE_Q_HEADER, ...$questions])."\n");
    $pictures = $pictures ?: ['sun,太陽,太陽,絵,明るい,なし,1', 'moon,満月,月の形,絵,丸い,なし,1', 'earth,地球,惑星,絵,青い,なし,1', 'mars,火星,惑星,絵,赤い,なし,1'];
    file_put_contents("{$dir}/pictures.csv", "\xEF\xBB\xBF".implode("\n", [SPACE_P_HEADER, ...$pictures])."\n");

    return $dir;
}

it('正しいCSVを読み、問題の形に直す', function () {
    $dir = spaceDir([
        '初級,太陽,1,4択,昼に光るのは？,太陽,月,星,雲,太陽は星だよ。,1',
        '初級,惑星,2,絵4択,『火星』はどれ？,火星,地球,太陽,満月,赤い惑星だよ。,1',
    ]);

    $catalog = SpaceCatalog::load($dir);

    expect($catalog['errors'])->toBe([])
        ->and($catalog['questions'])->toHaveCount(2)
        ->and($catalog['questions'][0])->toBe([
            'level' => '初級', 'number' => 1, 'theme' => '太陽', 'kind' => 'text', 'prompt' => '昼に光るのは？',
            'correct' => '太陽', 'wrong' => ['月', '星', '雲'], 'explanation' => '太陽は星だよ。',
        ])
        ->and($catalog['questions'][1]['kind'])->toBe('picture')
        ->and($catalog['pictures']['火星'])->toBe(['key' => 'mars', 'name' => '火星']);
});

it('不正な行は、行番号つきのエラーにする', function (string $row, string $expected) {
    $catalog = SpaceCatalog::load(spaceDir([$row]));

    expect($catalog['errors'])->toHaveCount(1)
        ->and($catalog['errors'][0])->toContain('questions.csv 2行目')
        ->and($catalog['errors'][0])->toContain($expected);
})->with([
    '難しさが違う' => ['超級,太陽,1,4択,問題？,太陽,月,星,雲,解説,1', '難しさ'],
    '形が違う' => ['初級,太陽,1,3択,問題？,太陽,月,星,雲,解説,1', '形'],
    '選択肢が重複' => ['初級,太陽,1,4択,問題？,太陽,月,月,雲,解説,1', '重複'],
    '選択肢が空' => ['初級,太陽,1,4択,問題？,太陽,月,,雲,解説,1', '空'],
    '全角6文字を超える' => ['初級,太陽,1,4択,問題？,太陽,月,星,とても長い選択肢です,解説,1', '6文字'],
    '問題文が空' => ['初級,太陽,1,4択,,太陽,月,星,雲,解説,1', '問題文'],
    '絵の名前が一覧にない' => ['初級,惑星,1,絵4択,『火星』はどれ？,火星,地球,太陽,金星,解説,1', '金星'],
]);

it('絵のキーは英小文字・数字・_だけで、重複しない', function () {
    $dir = spaceDir(
        ['初級,太陽,1,4択,問題？,太陽,月,星,雲,解説,1'],
        ['Sun,太陽,太陽,絵,明るい,なし,1', 'sun,月,月の形,絵,丸い,なし,1', 'sun,星,星,絵,点,なし,1'],
    );

    $errors = SpaceCatalog::load($dir)['errors'];

    expect($errors)->toHaveCount(2)
        ->and(implode(' ', $errors))->toContain('pictures.csv 2行目')->toContain('4行目');
});

it('実際の原稿(60問・35種)が、エラーなしで読める', function () {
    $dir = __DIR__.'/../../database/data/space';
    if (! is_file("{$dir}/questions.csv")) {
        $this->markTestSkipped('tools/space/sync.sh を先に流してください');
    }

    $catalog = SpaceCatalog::load($dir);

    expect($catalog['errors'])->toBe([])
        ->and($catalog['questions'])->toHaveCount(60)
        ->and($catalog['pictures'])->toHaveCount(35)
        ->and(collect($catalog['questions'])->where('kind', 'picture'))->toHaveCount(30);
});
