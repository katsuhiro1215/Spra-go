<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| space:import(docs/design/2026-10-09-space-quiz-design.md 5章)
|--------------------------------------------------------------------------
*/

const SPACE_IMPORT_Q_HEADER = '難しさ,テーマ,番号,形,問題文,正解,まちがい1,まちがい2,まちがい3,解説(要約),根拠番号';
const SPACE_IMPORT_P_HEADER = 'キー,名前,種類,描く内容,見分けのポイント,まちがえやすい描き方,根拠番号';

/** 初級の文字の問題を $text 問、絵の問題を $picture 問。絵のファイルは $images の分だけ作る */
function spaceImportFixture(int $text, int $picture, array $images = []): array
{
    $base = sys_get_temp_dir().'/space-import-'.bin2hex(random_bytes(4));
    mkdir("{$base}/data", 0777, true);
    mkdir("{$base}/images", 0777, true);

    $rows = [];
    foreach (range(1, $text) as $n) {
        $rows[] = "初級,太陽,{$n},4択,問題{$n}？,太陽,月,星,雲,解説{$n},1";
    }
    foreach (range(1, $picture) as $i) {
        $rows[] = '初級,惑星,'.($text + $i).",絵4択,『火星』はどれ？{$i},火星,地球,金星,木星,解説,1";
    }
    file_put_contents("{$base}/data/questions.csv", implode("\n", [SPACE_IMPORT_Q_HEADER, ...$rows])."\n");
    file_put_contents("{$base}/data/pictures.csv", implode("\n", [
        SPACE_IMPORT_P_HEADER, 'mars,火星,惑星,絵,赤,なし,1', 'earth,地球,惑星,絵,青,なし,1', 'venus,金星,惑星,絵,白,なし,1', 'jupiter,木星,惑星,絵,縞,なし,1',
    ])."\n");
    foreach ($images as $key) {
        file_put_contents("{$base}/images/{$key}.webp", 'x');
    }

    return [$base.'/data', $base.'/images'];
}

function runSpaceImport(string $data, string $images, array $extra = []): int
{
    return test()->artisan('space:import', ['--path' => $data, '--images' => $images, ...$extra])->run();
}

it('文字の問題を取り込み、「宇宙」の大もと・コース・ステージ・問題・選択肢を作る', function () {
    [$data, $images] = spaceImportFixture(16, 0);

    expect(runSpaceImport($data, $images))->toBe(0);

    $root = Category::where('name', '宇宙')->whereNull('parent_id')->firstOrFail();
    expect($root->is_course_group)->toBeTrue()
        ->and($root->children()->pluck('name')->all())->toBe(['宇宙たんけん'])
        ->and(Stage::where('category_id', $root->children()->first()->id)->count())->toBe(2)
        ->and(Stage::where('category_id', $root->children()->first()->id)->where('is_boss', true)->value('title_reward'))->toBe('うちゅうたんけんたい')
        ->and(Question::whereNotNull('meta->flag_key')->where('meta->flag_key', 'like', 'space:%')->count())->toBe(16);

    $question = Question::where('meta->flag_key', 'space:初級:1')->firstOrFail();
    expect($question->prompt)->toBe('問題1？')
        ->and($question->explanation['summary'] ?? null)->toBe('解説1')
        ->and($question->choices()->count())->toBe(4)
        ->and($question->choices()->where('is_correct', true)->value('label'))->toBe('太陽');
});

it('何度流しても、問題・ステージ・選択肢は増えない', function () {
    [$data, $images] = spaceImportFixture(16, 0);
    runSpaceImport($data, $images);
    $counts = [Question::count(), Stage::count(), QuestionChoice::count(), Category::count()];

    runSpaceImport($data, $images);

    expect([Question::count(), Stage::count(), QuestionChoice::count(), Category::count()])->toBe($counts);
});

it('CSVを直して流すと、問題が直る', function () {
    [$data, $images] = spaceImportFixture(8, 0);
    runSpaceImport($data, $images);
    file_put_contents("{$data}/questions.csv", str_replace('問題1？', '直した問題？', file_get_contents("{$data}/questions.csv")));

    runSpaceImport($data, $images);

    expect(Question::where('meta->flag_key', 'space:初級:1')->value('prompt'))->toBe('直した問題？')
        ->and(Question::where('meta->flag_key', 'like', 'space:%')->count())->toBe(8);
});

it('絵が届いていない絵の問題は外し、絵が届いて流し直すと増える', function () {
    [$data, $images] = spaceImportFixture(8, 2, ['mars', 'earth', 'venus']); // 木星の絵がない

    runSpaceImport($data, $images);
    expect(Question::where('meta->flag_key', 'like', 'space:%')->count())->toBe(8);

    file_put_contents("{$images}/jupiter.webp", 'x');
    runSpaceImport($data, $images);

    expect(Question::where('meta->flag_key', 'like', 'space:%')->count())->toBe(10);
    $picture = Question::where('meta->flag_key', 'space:初級:9')->firstOrFail();
    expect($picture->choices()->orderBy('order')->get()->map(fn ($c) => $c->meta['image'] ?? null)->all())
        ->toBe(['/space/mars.webp', '/space/earth.webp', '/space/venus.webp', '/space/jupiter.webp']);
});

it('不正なCSVのときは、何も書かずに止まる', function () {
    [$data, $images] = spaceImportFixture(8, 0);
    file_put_contents("{$data}/questions.csv", str_replace('太陽,月,星,雲', '太陽,月,月,雲', file_get_contents("{$data}/questions.csv")));

    expect(runSpaceImport($data, $images))->toBe(1)
        ->and(Question::count())->toBe(0)
        ->and(Category::where('name', '宇宙')->whereNotNull('is_course_group')->where('is_course_group', true)->exists())->toBeFalse();
});

it('--dry-run では、何も書かない', function () {
    [$data, $images] = spaceImportFixture(8, 0);

    expect(runSpaceImport($data, $images, ['--dry-run' => true]))->toBe(0)
        ->and(Question::count())->toBe(0)
        ->and(Stage::count())->toBe(0);
});
