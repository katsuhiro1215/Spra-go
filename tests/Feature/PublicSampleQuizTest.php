<?php

use App\Models\Country;
use App\Models\Quiz;

/*
|--------------------------------------------------------------------------
| 公開クイズプレビュー(認証不要)のテスト
|--------------------------------------------------------------------------
|
| マーケティングサイトの国別クイズ紹介ページ(docs/company/MarketingPlan.md)
| から使う想定。未ログインでもアクセスできることが要件そのもの。
|
*/

function createCountryWithQuestions(string $code, int $count = 5): Country
{
    // countriesテーブルにはthree_code/name_en/country_codeがNOT NULL制約付きで存在するが
    // Country::$fillableには含まれていないため、forceCreateで直接投入する
    // (tests/Feature/ImportContentCommandTest.phpと同じ回避策)。
    $country = Country::query()->forceCreate([
        'code' => $code,
        'three_code' => strtoupper($code).'X',
        'name' => $code.'国',
        'name_en' => $code,
        'country_code' => random_int(100, 999),
    ]);
    $quiz = Quiz::create(['title' => $code.'サンプル', 'difficulty' => '初級']);

    for ($i = 0; $i < $count; $i++) {
        $question = $quiz->questions()->create([
            'country_id' => $country->id,
            'prompt' => "問題{$i}",
            'order' => $i,
        ]);
        $question->choices()->create(['label' => '正解', 'is_correct' => true, 'order' => 1]);
        $question->choices()->create(['label' => '不正解', 'is_correct' => false, 'order' => 2]);
    }

    return $country;
}

it('未ログインでもアクセスでき、最大3問返す', function () {
    createCountryWithQuestions('zz');

    $response = $this->getJson('/api/public/countries/zz/sample-quiz');

    $response->assertOk();
    expect($response->json('country.code'))->toBe('zz');
    expect($response->json('questions'))->toHaveCount(3);
    expect($response->json('questions.0.choices'))->toHaveCount(2);
});

it('問題数が3問未満の国はある分だけ返す', function () {
    createCountryWithQuestions('yy', count: 2);

    $response = $this->getJson('/api/public/countries/yy/sample-quiz');

    $response->assertOk();
    expect($response->json('questions'))->toHaveCount(2);
});

it('存在しない国コードは404になる', function () {
    $this->getJson('/api/public/countries/xx/sample-quiz')->assertNotFound();
});
