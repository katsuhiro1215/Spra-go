<?php

use App\Models\Category;
use App\Models\ProfileWord;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use App\Models\Word;
use App\Support\Language\EnglishCourseImporter;
use App\Support\Words;

/** 英語コースの取り込み(docs/design/2026-10-07-english-levels-design.md 4-1・4-2) */
const WORD_HEADER = '英語レベル,対象,ジャンル,番号,品詞,出題方向,形,英単語,日本語,問題文,正解,まちがい1,まちがい2,まちがい3,解説(要約)';
const SENTENCE_HEADER = '英語レベル,対象,テーマ,番号,問題種類,形,問題文,正解,まちがい1,まちがい2,まちがい3,解説(要約)';

/** 取り込み用のCSVを、一時のフォルダに作る。レベル1(幼児・日→英が1つ)、レベル11(名詞8語・英→日と日→英が半分ずつ)、文章2問 */
function englishFixture(): string
{
    $dir = storage_path('framework/testing/english-'.uniqid());
    mkdir("{$dir}/words", 0777, true);
    mkdir("{$dir}/sentences", 0777, true);

    $rows = [WORD_HEADER];
    $nine = [['cat', '猫', 'dog', 'bird', 'fish'], ['dog', '犬', 'cat', 'bird', 'fish'], ['bird', '鳥', 'cat', 'dog', 'fish'], ['fish', '魚', 'cat', 'dog', 'bird']];
    foreach ($nine as $i => [$en, $ja, $a, $b, $c]) {
        $rows[] = '1,幼児,動物,'.($i + 1).",名詞,英日,4択,{$en},{$ja},「{$en}」の意味は？,{$ja},{$a}のこと,{$b}のこと,{$c}のこと,{$en} は「{$ja}」だよ。";
    }
    $rows[] = '1,幼児,動物,5,名詞,日英,4択,rabbit,うさぎ,「うさぎ」を表す英単語は？,rabbit,cat,dog,bird,「うさぎ」は英語で rabbit だよ。';
    $rows[] = '1,幼児,動物,6,名詞,日英,4択,horse,馬,「馬」を表す英単語は？,horse,cat,dog,bird,「馬」は英語で horse だよ。';

    $town = [['school', '学校'], ['park', '公園'], ['station', '駅'], ['library', '図書館'], ['hospital', '病院'], ['shop', '店'], ['bank', '銀行'], ['museum', '博物館']];
    foreach ($town as $i => [$en, $ja]) {
        if ($i < 4) {
            $rows[] = '11,小学生低学年,町,'.($i + 1).",名詞,英日,4択,{$en},{$ja},「{$en}」の意味は？,{$ja},ア,イ,ウ,{$en} は「{$ja}」だよ。";
        } else {
            $rows[] = '11,小学生低学年,町,'.($i + 1).",名詞,日英,4択,{$en},{$ja},「{$ja}」を表す英単語は？,{$en},x1,x2,x3,「{$ja}」は英語で {$en} だよ。";
        }
    }
    file_put_contents("{$dir}/words/a.csv", "\xEF\xBB\xBF".implode("\n", $rows)."\n");

    file_put_contents("{$dir}/sentences/a.csv", implode("\n", [
        SENTENCE_HEADER,
        '11,小学1・2年生,あいさつ,1,場面,4択,朝、友達に会いました。どの表現を使う？,Good morning.,Good night.,Goodbye.,Thank you.,Good morning. は「おはよう。」だよ。',
        '11,小学1・2年生,あいさつ,2,穴埋め,4択,「Thank ___.」に入る語は？,you,me,it,them,Thank you. は「ありがとう。」だよ。',
    ])."\n");

    return $dir;
}

function importEnglish(?string $dir = null): array
{
    return EnglishCourseImporter::import($dir ?? englishFixture());
}

it('単語と文章を取り込む。幼児は英語→日本語だけ、小学生は両方の向き(CSVの向きはそのまま、反対向きを作る)', function () {
    $result = importEnglish();

    // レベル1: 6語×英→日のみ=6、レベル11: 8語×2向き=16、文章2
    expect($result['questions'])->toBe(24)->and(Question::count())->toBe(24);

    $level1 = Question::whereJsonContains('meta->level', 1)->get();
    expect($level1)->toHaveCount(6)->and($level1->pluck('meta.direction')->unique()->all())->toBe(['en_ja']);

    $level11 = Question::whereJsonContains('meta->level', 11)->where('meta->kind', 'word')->get();
    expect($level11->where('meta.direction', 'en_ja'))->toHaveCount(8)->and($level11->where('meta.direction', 'ja_en'))->toHaveCount(8);
});

it('問題の中身: meta(kind・level・direction・word)、解説、CSVの選択肢、4択で正解は1つ', function () {
    importEnglish();

    $cat = Question::where('prompt', '「cat」の意味は？')->firstOrFail();
    expect($cat->meta)->toMatchArray(['kind' => 'word', 'level' => 1, 'direction' => 'en_ja', 'word' => 'cat'])
        ->and($cat->explanation)->toBe(['summary' => 'cat は「猫」だよ。'])
        ->and($cat->choices->pluck('label')->sort()->values()->all())->toBe(collect(['猫', 'dogのこと', 'birdのこと', 'fishのこと'])->sort()->values()->all())
        ->and($cat->choices->where('is_correct', true)->pluck('label')->all())->toBe(['猫']);

    $sentence = Question::where('prompt', '「Thank ___.」に入る語は？')->firstOrFail();
    expect($sentence->meta)->toEqual(['kind' => 'sentence', 'level' => 11])->and($sentence->choices)->toHaveCount(4);
});

it('幼児の日本語→英語は、英語→日本語に作り直す(正解は日本語、まちがいは同じレベルの別の語の日本語)', function () {
    importEnglish();

    $rabbit = Question::where('prompt', '「rabbit」の意味は？')->firstOrFail();
    $labels = $rabbit->choices->pluck('label')->all();

    expect($rabbit->meta)->toMatchArray(['kind' => 'word', 'level' => 1, 'direction' => 'en_ja', 'word' => 'rabbit'])
        ->and($rabbit->choices->where('is_correct', true)->pluck('label')->all())->toBe(['うさぎ'])
        ->and($labels)->toHaveCount(4)->and(array_unique($labels))->toHaveCount(4)
        ->and(array_diff($labels, ['うさぎ', '猫', '犬', '鳥', '魚', '馬']))->toBe([])
        ->and(Question::where('prompt', '「うさぎ」を表す英単語は？')->exists())->toBeFalse();
});

it('反対向きは、同じレベル・同じ品詞の別の語から作る。正解の英語・同じ訳の語は入らず、4択で重複なし', function () {
    importEnglish();

    $ja = Question::where('prompt', '「学校」を表す英単語は？')->firstOrFail();
    $labels = $ja->choices->pluck('label')->all();

    expect($ja->meta)->toMatchArray(['kind' => 'word', 'level' => 11, 'direction' => 'ja_en', 'word' => 'school'])
        ->and($ja->choices->where('is_correct', true)->pluck('label')->all())->toBe(['school'])
        ->and($labels)->toHaveCount(4)->and(array_unique($labels))->toHaveCount(4)
        ->and(array_diff($labels, ['school', 'park', 'station', 'library', 'hospital', 'shop', 'bank', 'museum']))->toBe([]);
});

it('何度実行しても同じ結果(問題は増えず、選択肢も変わらない)', function () {
    $dir = englishFixture();
    importEnglish($dir);
    $before = Question::with('choices')->orderBy('id')->get()->map(fn ($q) => $q->prompt.'|'.$q->choices->pluck('label')->implode(','))->all();

    importEnglish($dir);
    $after = Question::with('choices')->orderBy('id')->get()->map(fn ($q) => $q->prompt.'|'.$q->choices->pluck('label')->implode(','))->all();

    expect(Question::count())->toBe(24)->and($after)->toBe($before)->and(Stage::count())->toBe(10);
});

it('ステージ: 級ごとに10(最後がボス)。国に結びつかず、プールは級の全問。問題がない級は作らない', function () {
    importEnglish();

    $stages = Stage::orderBy('stage_number')->get();
    $boss = $stages->last();

    expect($stages)->toHaveCount(10)->and($stages->pluck('difficulty')->unique()->all())->toBe(['初級'])
        ->and($stages->whereNotNull('country_id'))->toHaveCount(0)->and($stages->every->is_pool)->toBeTrue()
        ->and(Category::find($stages->first()->category_id)->is_language_mode)->toBeTrue()
        ->and($boss->is_boss)->toBeTrue()->and($boss->title_reward)->toBe('英語はじめの一歩')->and($boss->question_count)->toBe(15)->and($boss->reward_percent)->toBe(100)
        ->and($stages->first()->question_count)->toBe(10)->and($stages->first()->reward_percent)->toBe(50)
        ->and($stages->first()->questions()->count())->toBe(24)
        ->and(Quiz::where('title', '英語を学ぶ 初級')->exists())->toBeTrue();
});

it('古い英語コース(国に結びついたステージ)があるときは、置き換えるまで取り込まない。--fresh で消してから作る', function () {
    $category = Category::create(['name' => '英語を学ぶ', 'is_language_mode' => true]);
    $quiz = Quiz::create(['title' => '英語を学ぶ アメリカ 初級 問題集', 'difficulty' => '初級']);
    $old = Question::create(['quiz_id' => $quiz->id, 'prompt' => '古い問題']);
    $stage = Stage::create(['category_id' => $category->id, 'country_id' => null, 'difficulty' => '初級', 'stage_number' => 10, 'question_count' => 10, 'is_boss' => true, 'title_reward' => '古い称号']);
    $stage->questions()->attach($old->id, ['order' => 1]);

    $this->artisan('english:import', ['--path' => englishFixture()])->assertFailed();
    expect(Question::where('prompt', '古い問題')->exists())->toBeTrue();

    $this->artisan('english:import', ['--path' => englishFixture(), '--fresh' => true, '--force' => true])->assertSuccessful();
    expect(Question::where('prompt', '古い問題')->exists())->toBeFalse()->and(Stage::count())->toBe(10)
        ->and(Stage::where('is_boss', true)->first()->title_reward)->toBe('古い称号');
});

it('同じ訳の語(movie と film)は、お互いの選択肢に入らない', function () {
    $dir = storage_path('framework/testing/english-'.uniqid());
    mkdir("{$dir}/words", 0777, true);
    $rows = [WORD_HEADER];
    foreach ([['movie', '映画'], ['film', '映画'], ['book', '本'], ['pen', 'ペン'], ['desk', '机'], ['bag', 'かばん']] as $i => [$en, $ja]) {
        $rows[] = '11,小学生低学年,物,'.($i + 1).",名詞,英日,4択,{$en},{$ja},「{$en}」の意味は？,{$ja},ア,イ,ウ,{$en} は「{$ja}」だよ。";
    }
    file_put_contents("{$dir}/words/a.csv", implode("\n", $rows)."\n");

    importEnglish($dir);

    $movie = Question::where('prompt', '「映画」を表す英単語は？')->get()->keyBy(fn ($q) => $q->choices->firstWhere('is_correct', true)->label);
    expect($movie)->toHaveCount(2)
        ->and($movie['movie']->choices->pluck('label')->all())->not->toContain('film')
        ->and($movie['film']->choices->pluck('label')->all())->not->toContain('movie');
});

it('単語帳: 語ごとに1行(最初に出るレベル・品詞の短い表示・意味・重要度)を作り、問題の meta.word_id で結ぶ', function () {
    importEnglish();

    // レベル1の6語＋レベル11の8語
    expect(Word::count())->toBe(14);

    $cat = Word::where('key', 'cat')->firstOrFail();
    expect($cat->language)->toBe('en')->and($cat->word)->toBe('cat')->and($cat->level)->toBe(1)->and($cat->pos)->toBe('名')
        ->and($cat->importance)->toBe(3)->and($cat->meanings)->toEqual([['pos' => '名', 'ja' => ['猫']]]);

    // 英→日と日→英の両方の問題が、同じ語に結びつく
    $ids = Question::where('meta->word', 'school')->get()->pluck('meta.word_id')->unique()->values()->all();
    expect($ids)->toBe([Word::where('key', 'school')->value('id')]);
    expect(Question::where('meta->kind', 'sentence')->first()->meta)->not->toHaveKey('word_id');
});

it('単語帳: 再実行で語は増えず、子どもの記録(profile_words)も消えない。--fresh では語も記録も消えてから作り直す', function () {
    $dir = englishFixture();
    importEnglish($dir);
    $profile = createActiveProfile();
    $cat = Word::where('key', 'cat')->firstOrFail();
    ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $cat->id, 'seen_at' => now(), 'status' => 'learned']);

    importEnglish($dir);
    expect(Word::count())->toBe(14)->and(Word::where('key', 'cat')->value('id'))->toBe($cat->id)->and(ProfileWord::count())->toBe(1);

    $this->artisan('english:import', ['--path' => $dir, '--fresh' => true, '--force' => true])->assertSuccessful();
    expect(Word::count())->toBe(14)->and(ProfileWord::count())->toBe(0);
});

it('重要度の既定は、レベルで決まる(1〜60=3・61〜100=2・101〜=1)', function () {
    expect(Words::defaultImportance(1))->toBe(3)->and(Words::defaultImportance(60))->toBe(3)
        ->and(Words::defaultImportance(61))->toBe(2)->and(Words::defaultImportance(100))->toBe(2)
        ->and(Words::defaultImportance(101))->toBe(1)->and(Words::defaultImportance(150))->toBe(1);
});

it('品詞の短い表示: 英語・日本語・「・」でつないだ複数の品詞', function () {
    expect(Words::posLabel('noun'))->toBe('名')->and(Words::posLabel('名詞'))->toBe('名')->and(Words::posLabel('adjective'))->toBe('形')
        ->and(Words::posLabel('名詞・動詞'))->toBe('名・動')->and(Words::posLabel('modal auxiliary'))->toBe('助動')->and(Words::posLabel('なぞの品詞'))->toBe('なぞの品詞');
});
