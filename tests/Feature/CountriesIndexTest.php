<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
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

it('国ごとに、問題のあるステージの数と今のプロフィールがクリアした数(achievement)を返す', function () {
    $profile = createActiveProfile();
    $japan = createCountryWithStageContent('jp', '日本');
    createCountryWithStageContent('us', 'アメリカ');

    $category = Category::create(['name' => '日本の2つ目']);
    $second = Stage::create(['category_id' => $category->id, 'country_id' => $japan->id, 'difficulty' => '初級', 'stage_number' => 2]);
    [$question] = createQuestionWithChoices();
    $second->questions()->attach($question->id, ['order' => 1]);
    // 問題のないステージは数えない(クリアの記録があっても数えない)
    $empty = Stage::create(['category_id' => $category->id, 'country_id' => $japan->id, 'difficulty' => '初級', 'stage_number' => 3]);

    $first = $japan->stages()->where('stage_number', 1)->firstOrFail();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $first->id, 'cleared_at' => now()]);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $empty->id, 'cleared_at' => now()]);
    // 挑戦しただけ(クリアしていない)は数えない
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $second->id, 'attempts' => 1]);
    // 同じ家族の別のプレイヤーのクリアは数えない
    $other = createFamilyMember($profile);
    ProfileStageProgress::create(['user_profile_id' => $other->id, 'stage_id' => $second->id, 'cleared_at' => now()]);

    $byCode = collect($this->getJson('/api/countries')->assertOk()->json())->keyBy('code');

    expect($byCode['jp']['achievement'])->toBe(['cleared' => 1, 'total' => 2])
        ->and($byCode['us']['achievement'])->toBe(['cleared' => 0, 'total' => 1]);
});

it('プレイヤーを選んでいないときは、クリアした数を0にする', function () {
    $profile = createActiveProfile();
    $japan = createCountryWithStageContent('jp', '日本');
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $japan->stages()->firstOrFail()->id,
        'cleared_at' => now(),
    ]);

    $countries = $this->withSession(['active_profile_id' => null])->getJson('/api/countries')->assertOk()->json();

    expect(collect($countries)->firstWhere('code', 'jp')['achievement'])->toBe(['cleared' => 0, 'total' => 1]);
});
