<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| GET /api/countries のテスト
|--------------------------------------------------------------------------
|
| ホーム画面に表示する国は「実際にコンテンツがある国」のみに絞る
| (190ヶ国全部だと選べない上、ほとんどが行き止まりになるため)。
| あわせてAccept-Languageからの弱い国推定(is_suggested)も確認する。
|
*/

function createCountryWithStageContent(string $code, string $name): Country
{
    $country = Country::create([
        'code' => $code,
        'three_code' => strtoupper($code).'X',
        'name' => $name,
        'name_en' => $name,
        'country_code' => random_int(100, 999),
    ]);

    $category = Category::create(['name' => $name.'カテゴリ']);
    $stage = Stage::create([
        'category_id' => $category->id,
        'country_id' => $country->id,
        'difficulty' => '初級',
        'stage_number' => 1,
    ]);
    [$question] = createQuestionWithChoices();
    $stage->questions()->attach($question->id, ['order' => 1]);

    return $country;
}

function createCountryWithoutContent(string $code, string $name): Country
{
    return Country::create([
        'code' => $code,
        'three_code' => strtoupper($code).'X',
        'name' => $name,
        'name_en' => $name,
        'country_code' => random_int(100, 999),
    ]);
}

it('コンテンツがある国だけ一覧に出る', function () {
    createActiveProfile();
    createCountryWithStageContent('zz', 'テスト国Z');
    createCountryWithoutContent('yy', 'テスト国Y');

    $response = $this->getJson('/api/countries');

    $response->assertOk();
    $codes = collect($response->json())->pluck('code');
    expect($codes)->toContain('zz');
    expect($codes)->not->toContain('yy');
});

it('Accept-Languageの地域サブタグから推定し先頭に並ぶ', function () {
    createActiveProfile();
    createCountryWithStageContent('fr', 'フランス');
    createCountryWithStageContent('jp', '日本');

    $response = $this->withHeader('Accept-Language', 'fr-FR,fr;q=0.9')
        ->getJson('/api/countries');

    $response->assertOk();
    expect($response->json('0.code'))->toBe('fr');
    expect($response->json('0.is_suggested'))->toBeTrue();
});

it('地域サブタグが無くても言語だけで推定できる(日本語→日本)', function () {
    createActiveProfile();
    createCountryWithStageContent('jp', '日本');
    createCountryWithStageContent('us', 'アメリカ');

    $response = $this->withHeader('Accept-Language', 'ja,en;q=0.5')
        ->getJson('/api/countries');

    $response->assertOk();
    expect($response->json('0.code'))->toBe('jp');
});

it('該当する国が無ければis_suggestedはすべてfalse', function () {
    createActiveProfile();
    createCountryWithStageContent('jp', '日本');

    $response = $this->withHeader('Accept-Language', 'de-DE,de;q=0.9')
        ->getJson('/api/countries');

    $response->assertOk();
    expect(collect($response->json())->pluck('is_suggested')->unique()->all())
        ->toBe([false]);
});

it('言語学習モードのステージがある国だけhas_language_modeがtrue', function () {
    createActiveProfile();
    $us = createCountryWithStageContent('us', 'アメリカ');
    createCountryWithStageContent('jp', '日本');

    $languageCategory = Category::create(['name' => '英語を学ぶ', 'is_language_mode' => true]);
    $stage = Stage::create([
        'category_id' => $languageCategory->id,
        'country_id' => $us->id,
        'difficulty' => '初級',
        'stage_number' => 1,
    ]);
    [$question] = createQuestionWithChoices();
    $stage->questions()->attach($question->id, ['order' => 1]);

    $response = $this->getJson('/api/countries');

    $response->assertOk();
    $byCode = collect($response->json())->keyBy('code');
    expect($byCode['us']['has_language_mode'])->toBeTrue();
    expect($byCode['jp']['has_language_mode'])->toBeFalse();
});
