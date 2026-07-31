<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\ProfileTitle;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| GET /api/passport のテスト
|--------------------------------------------------------------------------
|
| マイパスポート画面(SPEC.md 4-4b)向けの実データ集計。難易度クリア状況から
| スタンプの段位(bronze/silver/gold)・鍵(解放済み難易度)・初回クリア日を
| 算出し、称号一覧・訪問国数もあわせて返す。
|
*/

function createCountryWithDifficultyStages(string $code, string $name): Country
{
    $country = Country::create([
        'code' => $code,
        'three_code' => strtoupper($code).'X',
        'name' => $name,
        'name_en' => $name,
        'country_code' => random_int(100, 999),
    ]);

    $category = Category::create(['name' => $name.'カテゴリ']);

    foreach (['初級', '中級', '上級'] as $stageNumber => $difficulty) {
        $stage = Stage::create([
            'category_id' => $category->id,
            'country_id' => $country->id,
            'difficulty' => $difficulty,
            'stage_number' => 1,
            'is_boss' => true,
        ]);
        [$question] = createQuestionWithChoices();
        $stage->questions()->attach($question->id, ['order' => 1]);
    }

    return $country;
}

it('難易度を全問クリアするとスタンプの段位が上がり次の難易度の鍵が開く', function () {
    $profile = createActiveProfile();
    $country = createCountryWithDifficultyStages('zz', 'テスト国Z');

    $beginnerStage = Stage::where('country_id', $country->id)->where('difficulty', '初級')->first();

    $response = $this->getJson('/api/passport');
    $response->assertOk();
    $countryData = collect($response->json('countries'))->firstWhere('code', 'zz');
    expect($countryData['stamp_tier'])->toBe('none');
    expect($countryData['unlocked_difficulties'])->toBe(['初級']);
    expect($countryData['first_cleared_at'])->toBeNull();

    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $beginnerStage->id,
        'cleared_at' => now(),
    ]);

    $response = $this->getJson('/api/passport');
    $countryData = collect($response->json('countries'))->firstWhere('code', 'zz');
    expect($countryData['stamp_tier'])->toBe('bronze');
    expect($countryData['unlocked_difficulties'])->toBe(['初級', '中級']);
    expect($countryData['first_cleared_at'])->not->toBeNull();
});

it('称号一覧と訪問国数を返す', function () {
    $profile = createActiveProfile();
    createCountryWithDifficultyStages('zz', 'テスト国Z');
    createCountryWithDifficultyStages('yy', 'テスト国Y');

    ProfileTitle::create([
        'user_profile_id' => $profile->id,
        'title' => 'テスト称号',
        'unlocked_at' => now(),
    ]);

    $stage = Stage::whereHas('country', fn ($q) => $q->where('code', 'zz'))
        ->where('difficulty', '初級')->first();
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $stage->id,
        'cleared_at' => now(),
    ]);

    $response = $this->getJson('/api/passport');

    $response->assertOk();
    expect($response->json('titles'))->toBe(['テスト称号']);
    expect($response->json('visited_count'))->toBe(1);
});
