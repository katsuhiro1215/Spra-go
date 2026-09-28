<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| GET /api/countries のテスト(学ぶタブ、docs/design/2026-09-28-travel-tickets-design.md 3-6)
|--------------------------------------------------------------------------
|
| 日本と旅の行き先の国のうち、コンテンツがある国だけを 日本 → 行き先の順 に返す。
| まだ着いていない行き先には鍵(locked)を付ける。
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

it('日本が先頭、そのあと行き先の順。コンテンツのない国と、行き先でない国は出ない', function () {
    createActiveProfile();
    createCountryWithStageContent('fr', 'フランス');
    createCountryWithStageContent('it', 'イタリア');
    createCountryWithStageContent('US', 'アメリカ');
    createCountryWithStageContent('jp', '日本');
    Country::create(['code' => 'kr', 'three_code' => 'KRX', 'name' => '韓国', 'name_en' => '韓国', 'country_code' => 410]);

    $codes = collect($this->getJson('/api/countries')->assertOk()->json())->pluck('code')->all();

    expect($codes)->toBe(['jp', 'US', 'fr']);
});

it('日本と着いた国は鍵がなく、まだ着いていない行き先に鍵が付く', function () {
    $profile = createActiveProfile();
    createCountryWithStageContent('jp', '日本');
    createCountryWithStageContent('us', 'アメリカ');
    createCountryWithStageContent('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);

    $locked = collect($this->getJson('/api/countries')->assertOk()->json())->pluck('locked', 'code')->all();

    expect($locked)->toBe(['jp' => false, 'us' => false, 'gb' => true]);
});

it('推定した国の印(is_suggested)は返さない', function () {
    createActiveProfile();
    createCountryWithStageContent('jp', '日本');

    $response = $this->withHeader('Accept-Language', 'ja')->getJson('/api/countries')->assertOk();

    expect($response->json('0'))->not->toHaveKey('is_suggested');
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

    $byCode = collect($this->getJson('/api/countries')->assertOk()->json())->keyBy('code');

    expect($byCode['us']['has_language_mode'])->toBeTrue();
    expect($byCode['jp']['has_language_mode'])->toBeFalse();
});
