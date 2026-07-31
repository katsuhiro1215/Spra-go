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
