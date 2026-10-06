<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\ProfileTitle;
use App\Models\Stage;
use App\Models\User;

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

    $root = Category::firstOrCreate(['name' => config('courses.country_root'), 'parent_id' => null]);
    $category = Category::create(['name' => $name.'カテゴリ', 'parent_id' => $root->id]);

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

it('いちばん長い連続と、節目ごとのバッジをもらったかを返す', function () {
    $profile = createActiveProfile();
    $profile->update(['best_streak' => 7, 'current_streak' => 1]);

    $response = $this->getJson('/api/passport');

    $response->assertOk();
    expect($response->json('best_streak'))->toBe(7);
    expect($response->json('streak_milestones'))->toBe([
        ['days' => 3, 'earned' => true],
        ['days' => 7, 'earned' => true],
        ['days' => 30, 'earned' => false],
    ]);
});

it('プロフィールを選んでいなければ、連続は0日でバッジはどれもまだ', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->withHeader('Referer', 'http://localhost');

    $response = $this->getJson('/api/passport');

    $response->assertOk();
    expect($response->json('best_streak'))->toBe(0);
    expect(collect($response->json('streak_milestones'))->pluck('earned')->all())->toBe([false, false, false]);
});

/*
|--------------------------------------------------------------------------
| 日本のバッジ(docs/design/2026-10-06-passport-prefecture-badges-design.md)
|--------------------------------------------------------------------------
*/

it('prefecture_badges に47県が、地方の順に出る。もらっていなければ earned が偽で、コースの番号は null', function () {
    createActiveProfile();

    $badges = collect($this->getJson('/api/passport')->assertOk()->json('prefecture_badges'));

    expect($badges)->toHaveCount(47);
    expect($badges->pluck('region')->unique()->values()->all())->toBe(['hokkaido-tohoku', 'kanto', 'chubu', 'kinki', 'chugoku-shikoku', 'kyushu-okinawa']);
    expect($badges->first())->toBe([
        'key' => 'hokkaido', 'name' => '北海道', 'region' => 'hokkaido-tohoku', 'region_name' => '北海道・東北',
        'badge' => '/badge/pref/hokkaido.webp', 'earned' => false, 'master' => false, 'course_id' => null,
    ]);
    expect($badges->where('earned', true))->toHaveCount(0);
});

it('称号「◯◯はかせ」を持つ県だけ earned になる。別のプレイヤーの称号は数えない', function () {
    $profile = createActiveProfile();
    $other = createFamilyMember($profile);
    ProfileTitle::create(['user_profile_id' => $profile->id, 'title' => '大阪府はかせ', 'unlocked_at' => now()]);
    ProfileTitle::create(['user_profile_id' => $profile->id, 'title' => '近畿はかせ', 'unlocked_at' => now()]); // 地方の称号は、県のバッジではない
    ProfileTitle::create(['user_profile_id' => $other->id, 'title' => '京都府はかせ', 'unlocked_at' => now()]);

    $earned = collect($this->getJson('/api/passport')->assertOk()->json('prefecture_badges'))->where('earned', true);

    expect($earned->pluck('key')->values()->all())->toBe(['osaka']);
});

it('称号「◯◯マスター」を持つ県は master が真。はかせだけの県は earned だけが真', function () {
    $profile = createActiveProfile();
    ProfileTitle::create(['user_profile_id' => $profile->id, 'title' => '大阪府はかせ', 'unlocked_at' => now()]);
    ProfileTitle::create(['user_profile_id' => $profile->id, 'title' => '大阪府マスター', 'unlocked_at' => now()]);
    ProfileTitle::create(['user_profile_id' => $profile->id, 'title' => '京都府はかせ', 'unlocked_at' => now()]);

    $badges = collect($this->getJson('/api/passport')->assertOk()->json('prefecture_badges'))->keyBy('key');

    expect($badges['osaka']['earned'])->toBeTrue()->and($badges['osaka']['master'])->toBeTrue()
        ->and($badges['kyoto']['earned'])->toBeTrue()->and($badges['kyoto']['master'])->toBeFalse()
        ->and(collect($badges)->where('master', true))->toHaveCount(1);
});

it('その県のコースがあれば、course_id にその番号が付く(地方のカテゴリーの下の、県名のカテゴリー)', function () {
    createActiveProfile();
    $root = Category::create(['name' => '都道府県クイズ', 'is_course_group' => true]);
    $region = Category::create(['name' => '近畿', 'parent_id' => $root->id, 'is_course_group' => true]);
    $osaka = Category::create(['name' => '大阪府', 'parent_id' => $region->id]);
    Category::create(['name' => '京都府']); // 地方の下にない、同じ名前のカテゴリーは使わない

    $badges = collect($this->getJson('/api/passport')->assertOk()->json('prefecture_badges'))->keyBy('key');

    expect($badges['osaka']['course_id'])->toBe($osaka->id);
    expect($badges['kyoto']['course_id'])->toBeNull();
});

it('今の項目(countries・titles・trips など)は、これまでどおり返る', function () {
    createActiveProfile();

    $this->getJson('/api/passport')->assertOk()->assertJsonStructure([
        'countries', 'titles', 'visited_count', 'best_streak', 'streak_milestones', 'trips', 'mastered_count', 'prefecture_badges',
    ]);
});

it('スタンプは、国のメインの道(国旗)だけで決まる。英語のステージを残していても銅が付く', function () {
    $profile = createActiveProfile();
    $country = createCountryWithDifficultyStages('zz', 'テスト国Z');
    $english = Category::firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);
    Stage::create(['category_id' => $english->id, 'country_id' => $country->id, 'difficulty' => '初級', 'stage_number' => 1, 'is_boss' => true]);
    $main = Stage::where('country_id', $country->id)->where('difficulty', '初級')->whereHas('category', fn ($q) => $q->whereNotNull('parent_id'))->first();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $main->id, 'cleared_at' => now()]);

    $countryData = collect($this->getJson('/api/passport')->assertOk()->json('countries'))->firstWhere('code', 'zz');

    expect($countryData['stamp_tier'])->toBe('bronze');
});

it('スタンプは、前の級をすべてクリアしていないと上の段位が付かない(銅なしの金は付かない)', function () {
    $profile = createActiveProfile();
    $country = createCountryWithDifficultyStages('zz', 'テスト国Z');
    $advanced = Stage::where('country_id', $country->id)->where('difficulty', '上級')->first();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $advanced->id, 'cleared_at' => now()]);

    $countryData = collect($this->getJson('/api/passport')->assertOk()->json('countries'))->firstWhere('code', 'zz');

    expect($countryData['stamp_tier'])->toBe('none');
});

it('country_levels と language_levels を返す。母国(日本)の言語は出ない', function () {
    $profile = createActiveProfile();
    createCountryWithDifficultyStages('zz', 'テスト国Z');
    $english = Category::firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);
    Stage::create(['category_id' => $english->id, 'country_id' => null, 'difficulty' => '初級', 'stage_number' => 1, 'is_boss' => true]);

    $response = $this->getJson('/api/passport')->assertOk();

    expect(collect($response->json('country_levels'))->firstWhere('code', 'zz'))->toMatchArray(['level' => 0, 'max' => 3])
        ->and(collect($response->json('language_levels'))->pluck('key')->all())->toBe(['en']);
});
