<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Support\CourseLevels;

/** 国レベル・言語レベル(docs/design/2026-10-07-main-game-levels-design.md 4-5) */

function clearStageRow($profile, Stage $stage): void
{
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stage->id, 'best_score' => 10, 'attempts' => 1, 'cleared_at' => now()]);
}

function createLanguageCourse(string $categoryName = '英語を学ぶ', int $stages = 3): Category
{
    $category = Category::firstOrCreate(['name' => $categoryName], ['is_language_mode' => true]);
    foreach (range(1, $stages) as $n) {
        Stage::create(['category_id' => $category->id, 'country_id' => null, 'difficulty' => '初級', 'stage_number' => $n, 'is_boss' => $n === $stages]);
    }

    return $category;
}

it('国レベルは、メインの道のクリアしたステージの数。最大は全ステージの数', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本'); // メインの道は3ステージ
    clearCountryStage($profile, $japan, '初級', false);

    $levels = collect(CourseLevels::forCountries($profile))->keyBy('code');

    expect($levels['jp'])->toMatchArray(['name' => '日本', 'level' => 1, 'max' => 3]);
});

it('国レベルは、ほかのカテゴリー(英語・世界遺産)のクリアを数えず、同じステージを繰り返しても1', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    $heritage = Stage::create(['category_id' => Category::create(['name' => '世界遺産'])->id, 'country_id' => $japan->id, 'difficulty' => '初級', 'stage_number' => 1]);
    clearStageRow($profile, $heritage);
    $main = Stage::where('country_id', $japan->id)->where('difficulty', '初級')->where('is_boss', false)->first();
    clearStageRow($profile, $main);
    ProfileStageProgress::where('stage_id', $main->id)->update(['attempts' => 5]);

    expect(collect(CourseLevels::forCountries($profile))->keyBy('code')['jp']['level'])->toBe(1);
});

it('ステージのない国は出ない', function () {
    $profile = createActiveProfile();
    \App\Models\Country::create(['code' => 'xx', 'three_code' => 'XXX', 'name' => '空', 'name_en' => 'x', 'country_code' => 998]);

    expect(CourseLevels::forCountries($profile))->toBe([]);
});

it('言語レベルは、国に結びつかない言語のコースのクリア数。母国の言語は出ない', function () {
    $profile = createActiveProfile();
    createLanguageCourse('英語を学ぶ', 3);
    createLanguageCourse('日本語を学ぶ', 2);
    $first = Stage::whereHas('category', fn ($q) => $q->where('name', '英語を学ぶ'))->orderBy('stage_number')->first();
    clearStageRow($profile, $first);

    $levels = collect(CourseLevels::forLanguages($profile, 'jp'))->keyBy('key');

    expect($levels->keys()->all())->toBe(['en'])->and($levels['en'])->toMatchArray(['name' => '英語', 'level' => 1, 'max' => 3]);
});

it('母国がアメリカなら、英語は出ず、日本語が出る', function () {
    $profile = createActiveProfile();
    createLanguageCourse('英語を学ぶ', 3);
    createLanguageCourse('日本語を学ぶ', 2);

    expect(collect(CourseLevels::forLanguages($profile, 'us'))->pluck('key')->all())->toBe(['ja']);
});

it('ステージのない言語は出ない', function () {
    $profile = createActiveProfile();

    expect(CourseLevels::forLanguages($profile, 'jp'))->toBe([]);
});
