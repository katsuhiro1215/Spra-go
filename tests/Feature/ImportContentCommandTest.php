<?php

use App\Models\Country;
use App\Models\QuestionTheme;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| content:import コマンドのテスト
|--------------------------------------------------------------------------
|
| コンテンツ制作担当が作るJSON原稿はAIによるドラフトのため、DBに書き込む前に
| 形式的な誤り(選択肢が4件でない、正解が複数あるなど)を検知できることが重要。
| docs/MVPRequirements.md参照。
|
*/

function seedThemesAndCountry(): void
{
    Country::query()->create([
        'code' => 'ZZ',
        'three_code' => 'ZZZ',
        'name' => 'テスト国',
        'name_en' => 'Testland',
        'country_code' => 999,
    ]);

    foreach (['flag_to_country', 'language'] as $key) {
        QuestionTheme::query()->create(['key' => $key, 'label' => $key]);
    }
}

function fixturePath(): string
{
    return base_path('tests/Fixtures/sample_content.json');
}

/** @return string 一時ファイルのパス。呼び出し側で削除は不要(tearDownで一括削除)。 */
function writeTempFixture(callable $mutate): string
{
    $data = json_decode(file_get_contents(fixturePath()), true);
    $mutate($data);

    $path = tempnam(sys_get_temp_dir(), 'sprago_content_').'.json';
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE));

    return $path;
}

it('正しいJSON原稿を取り込むとStage/Question/Choiceが作成される', function () {
    seedThemesAndCountry();

    $this->artisan('content:import', ['file' => fixturePath()])
        ->assertExitCode(0);

    expect(Stage::count())->toBe(2);

    $bossStage = Stage::query()->where('is_boss', true)->first();
    expect($bossStage->title_reward)->toBe('テスト国博士');
    expect($bossStage->questions()->count())->toBe(2);

    $question = \App\Models\Question::query()->where('prompt', 'この国旗はどこの国？')->first();
    expect($question)->not->toBeNull();
    expect($question->choices()->count())->toBe(4);
    expect($question->choices()->where('is_correct', true)->count())->toBe(1);
});

it('同じ原稿を2回取り込んでも質問が重複しない', function () {
    seedThemesAndCountry();

    $this->artisan('content:import', ['file' => fixturePath()])->assertExitCode(0);
    $this->artisan('content:import', ['file' => fixturePath()])->assertExitCode(0);

    expect(Stage::count())->toBe(2);
    expect(\App\Models\Question::count())->toBe(4);
});

it('--dry-runではDBに書き込まれない', function () {
    seedThemesAndCountry();

    $this->artisan('content:import', ['file' => fixturePath(), '--dry-run' => true])
        ->assertExitCode(0);

    expect(Stage::count())->toBe(0);
    expect(\App\Models\Question::count())->toBe(0);
});

it('選択肢が4件でない問題があると取り込みは失敗し何も書き込まれない', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        array_pop($data['stages'][0]['questions'][0]['choices']);
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(1);

    expect(Stage::count())->toBe(0);
});

it('正解が2件以上ある問題があると取り込みは失敗する', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][0]['choices'][1]['is_correct'] = true;
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(1);

    expect(Stage::count())->toBe(0);
});

it('存在しない国コードの場合は失敗する', function () {
    foreach (['flag_to_country', 'language'] as $key) {
        QuestionTheme::query()->create(['key' => $key, 'label' => $key]);
    }
    // Countryを作らない

    $this->artisan('content:import', ['file' => fixturePath()])->assertExitCode(1);

    expect(Stage::count())->toBe(0);
});

it('存在しないtheme_keyの場合は失敗する', function () {
    seedThemesAndCountry();
    QuestionTheme::query()->where('key', 'language')->delete();

    $this->artisan('content:import', ['file' => fixturePath()])->assertExitCode(1);

    expect(Stage::count())->toBe(0);
});

it('ファイルが存在しない場合は失敗する', function () {
    $this->artisan('content:import', ['file' => '/tmp/does-not-exist-sprago.json'])
        ->assertExitCode(1);
});

it('type:matchingの問題原稿を取り込むとitems付きのQuestion/Choiceが作成される', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][] = [
            'prompt' => '国旗と国名を合わせよう',
            'type' => 'matching',
            'items' => [
                ['id' => 'jp', 'image' => '/flag/jp.svg', 'label' => '日本'],
                ['id' => 'fr', 'image' => '/flag/fr.svg', 'label' => 'フランス'],
                ['id' => 'us', 'image' => '/flag/us.svg', 'label' => 'アメリカ'],
            ],
        ];
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(0);

    $question = \App\Models\Question::query()->where('prompt', '国旗と国名を合わせよう')->first();
    expect($question)->not->toBeNull();
    expect($question->type)->toBe('matching');
    expect($question->meta['items'])->toHaveCount(3);
    expect($question->choices()->count())->toBe(3);
    $jpChoice = $question->choices()->get()->first(fn ($c) => $c->meta['item_id'] === 'jp');
    expect($jpChoice->label)->toBe('日本');
});

it('type:matchingでitemsが1件しかない問題があると取り込みは失敗する', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][] = [
            'prompt' => '国旗と国名を合わせよう(不正)',
            'type' => 'matching',
            'items' => [
                ['id' => 'jp', 'image' => '/flag/jp.svg', 'label' => '日本'],
            ],
        ];
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(1);
    expect(\App\Models\Question::count())->toBe(0);
});

it('type:true_falseの問題原稿(選択肢2件)を取り込める', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][] = [
            'prompt' => 'この国旗は日本のものである',
            'type' => 'true_false',
            'choices' => [
                ['label' => '○', 'is_correct' => true],
                ['label' => '×', 'is_correct' => false],
            ],
        ];
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(0);

    $question = \App\Models\Question::query()->where('prompt', 'この国旗は日本のものである')->first();
    expect($question)->not->toBeNull();
    expect($question->type)->toBe('true_false');
    expect($question->choices()->count())->toBe(2);
});

it('type:true_falseで選択肢が4件あると取り込みは失敗する(2件固定のため)', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][] = [
            'prompt' => 'この国旗は日本のものである(不正)',
            'type' => 'true_false',
            'choices' => [
                ['label' => '○', 'is_correct' => true],
                ['label' => '×', 'is_correct' => false],
                ['label' => 'ダミー', 'is_correct' => false],
                ['label' => 'ダミー2', 'is_correct' => false],
            ],
        ];
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(1);
    expect(\App\Models\Question::count())->toBe(0);
});

it('type:orderingの問題原稿(choices配列の並び順=正解順)を取り込める', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][] = [
            'prompt' => '面積が小さい順に並べよう',
            'type' => 'ordering',
            'choices' => [
                ['label' => 'バチカン市国'],
                ['label' => 'モナコ'],
                ['label' => '日本'],
            ],
        ];
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(0);

    $question = \App\Models\Question::query()->where('prompt', '面積が小さい順に並べよう')->first();
    expect($question)->not->toBeNull();
    expect($question->type)->toBe('ordering');
    $orderedLabels = $question->choices()->orderBy('order')->pluck('label')->all();
    expect($orderedLabels)->toBe(['バチカン市国', 'モナコ', '日本']);
});

it('type:orderingでchoicesが1件しかない問題があると取り込みは失敗する', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][] = [
            'prompt' => '面積が小さい順に並べよう(不正)',
            'type' => 'ordering',
            'choices' => [
                ['label' => 'バチカン市国'],
            ],
        ];
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(1);
    expect(\App\Models\Question::count())->toBe(0);
});

it('type:sortingの問題原稿を取り込むとitems/baskets付きのQuestionが作成される', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][] = [
            'prompt' => 'アジアかヨーロッパかで仕分けよう',
            'type' => 'sorting',
            'baskets' => [
                ['id' => 'asia', 'label' => 'アジア'],
                ['id' => 'europe', 'label' => 'ヨーロッパ'],
            ],
            'items' => [
                ['id' => 'jp', 'image' => '/flag/jp.svg', 'correct_basket_id' => 'asia'],
                ['id' => 'fr', 'image' => '/flag/fr.svg', 'correct_basket_id' => 'europe'],
            ],
        ];
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(0);

    $question = \App\Models\Question::query()->where('prompt', 'アジアかヨーロッパかで仕分けよう')->first();
    expect($question)->not->toBeNull();
    expect($question->type)->toBe('sorting');
    expect($question->meta['baskets'])->toHaveCount(2);
    expect($question->meta['items'])->toHaveCount(2);
    expect($question->choices()->count())->toBe(0);
});

it('nest_by_country:trueを指定すると国旗以外のルートでも「ルート>国名」構造でカテゴリーが作られる', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['category_root'] = '世界遺産';
        $data['nest_by_country'] = true;
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(0);

    $root = \App\Models\Category::query()->where('name', '世界遺産')->whereNull('parent_id')->first();
    expect($root)->not->toBeNull();
    expect($root->is_language_mode)->toBeFalse();
    $child = \App\Models\Category::query()->where('name', 'テスト国')->where('parent_id', $root->id)->first();
    expect($child)->not->toBeNull();
});

it('問題に image を指定するとmetaに保存され、国旗の代わりに表示できる', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][0]['image'] = '/heritage/jp/mt-fuji.jpg';
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(0);

    $question = \App\Models\Question::query()->where('prompt', 'この国旗はどこの国？')->first();
    expect($question->meta['image'])->toBe('/heritage/jp/mt-fuji.jpg');
});

it('type:sortingでcorrect_basket_idがbasketsに存在しないと取り込みは失敗する', function () {
    seedThemesAndCountry();

    $path = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][] = [
            'prompt' => 'アジアかヨーロッパかで仕分けよう(不正)',
            'type' => 'sorting',
            'baskets' => [
                ['id' => 'asia', 'label' => 'アジア'],
                ['id' => 'europe', 'label' => 'ヨーロッパ'],
            ],
            'items' => [
                ['id' => 'jp', 'image' => '/flag/jp.svg', 'correct_basket_id' => 'africa'],
                ['id' => 'fr', 'image' => '/flag/fr.svg', 'correct_basket_id' => 'europe'],
            ],
        ];
    });

    $this->artisan('content:import', ['file' => $path])->assertExitCode(1);
    expect(\App\Models\Question::count())->toBe(0);
});

// 問題の番号(key)がある問題は、原稿を直して取り込み直すと、問題文・選択肢も直る(日本のコースの原稿の直し)
it('key のある問題は、取り込み直すと、問題文と選択肢の文字が直る。問題の番号と選択肢の数は変わらない', function () {
    seedThemesAndCountry();
    $first = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][0]['key'] = 'ZZ01-B-001';
    });
    $this->artisan('content:import', ['file' => $first])->assertExitCode(0);
    $question = \App\Models\Question::query()->where('meta->key', 'ZZ01-B-001')->firstOrFail();
    $choiceIds = $question->choices()->orderBy('id')->pluck('id')->all();

    $second = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][0]['key'] = 'ZZ01-B-001';
        $data['stages'][0]['questions'][0]['prompt'] = '直したあとの問題文？';
        $data['stages'][0]['questions'][0]['choices'][1]['label'] = '直したまちがい';
    });
    $this->artisan('content:import', ['file' => $second])->assertExitCode(0);

    $fresh = $question->fresh();
    expect(\App\Models\Question::query()->where('meta->key', 'ZZ01-B-001')->count())->toBe(1)
        ->and($fresh->prompt)->toBe('直したあとの問題文？')
        ->and($fresh->choices()->orderBy('id')->pluck('id')->all())->toBe($choiceIds)
        ->and($fresh->choices()->pluck('label')->all())->toContain('直したまちがい')
        ->and($fresh->choices()->where('is_correct', true)->count())->toBe(1);
});

it('key のある問題は、選択肢の数が変わったときも、選択肢を入れ替える', function () {
    seedThemesAndCountry();
    $first = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][0]['key'] = 'ZZ01-B-002';
    });
    $this->artisan('content:import', ['file' => $first])->assertExitCode(0);

    $second = writeTempFixture(function (&$data) {
        $question = &$data['stages'][0]['questions'][0];
        $question['key'] = 'ZZ01-B-002';
        $question['choices'] = [['label' => 'ただしい', 'is_correct' => true], ['label' => 'まちがい', 'is_correct' => false]];
        $question['type'] = 'true_false';
    });
    $this->artisan('content:import', ['file' => $second])->assertExitCode(0);

    $choices = \App\Models\Question::query()->where('meta->key', 'ZZ01-B-002')->firstOrFail()->choices;
    expect($choices->pluck('label')->all())->toBe(['ただしい', 'まちがい']);
});

it('key のない問題は、取り込み直しても、問題文・選択肢を書き換えない(これまでどおり)', function () {
    seedThemesAndCountry();
    $this->artisan('content:import', ['file' => fixturePath()])->assertExitCode(0);
    $changed = writeTempFixture(function (&$data) {
        $data['stages'][0]['questions'][0]['choices'][1]['label'] = 'あとから変えた';
    });
    $this->artisan('content:import', ['file' => $changed])->assertExitCode(0);

    expect(\App\Models\QuestionChoice::query()->where('label', 'あとから変えた')->exists())->toBeFalse();
});
