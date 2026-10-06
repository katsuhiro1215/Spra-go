<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageProgress;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\CoursePoolBuilder;

/** 言語のコース(国に結びつけない)(docs/design/2026-10-07-main-game-levels-design.md 4-1) */

/** 国に結びついた英語のステージ(今のインポートの形)を作る。$prompts は問題文(正解は「正」) */
function createCountryEnglish(Country $country, array $prompts, string $difficulty = '初級'): void
{
    $english = Category::firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);
    $quiz = Quiz::create(['title' => "英語 {$country->name} {$difficulty}", 'difficulty' => $difficulty, 'country_id' => $country->id]);
    $stage = Stage::create(['category_id' => $english->id, 'country_id' => $country->id, 'difficulty' => $difficulty, 'stage_number' => 1, 'is_boss' => true, 'title_reward' => '英語はかせ', 'question_count' => count($prompts)]);
    foreach ($prompts as $i => $prompt) {
        $q = Question::create(['quiz_id' => $quiz->id, 'prompt' => $prompt]);
        $q->choices()->create(['label' => '正', 'is_correct' => true, 'order' => 1]);
        $q->choices()->create(['label' => '誤', 'is_correct' => false, 'order' => 2]);
        $stage->questions()->attach($q->id, ['order' => $i + 1]);
    }
}

/** 日本・アメリカ・イギリスのメインの道に、問題つきのステージを足す(国の一覧に出るため) */
function withMainStageQuestion(Country $country): void
{
    $stage = Stage::where('country_id', $country->id)->first();
    $quiz = Quiz::firstOrCreate(['title' => "主{$country->code}"], ['difficulty' => '初級']);
    $q = Question::create(['quiz_id' => $quiz->id, 'prompt' => "主{$country->code}"]);
    $q->choices()->create(['label' => '正', 'is_correct' => true, 'order' => 1]);
    $stage->questions()->attach($q->id, ['order' => 1]);
}

function englishStages()
{
    return Stage::whereHas('category', fn ($q) => $q->where('name', '英語を学ぶ'))->orderBy('stage_number')->get();
}

it('アメリカとイギリスの英語が、国に結びつかない1つのコース(10ステージ)になる。同じ問題は1つ', function () {
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    createCountryEnglish($us, ['Hello', 'Thanks', 'Bye']);
    createCountryEnglish($gb, ['Hello', 'Cheers']);

    $result = CoursePoolBuilder::buildLanguages();

    $stages = englishStages();
    expect($result['en'])->toBe(['stages' => 10, 'pool' => 4])
        ->and($stages)->toHaveCount(10)->and($stages->whereNotNull('country_id'))->toHaveCount(0)
        ->and($stages->last()->is_boss)->toBeTrue()->and($stages->last()->title_reward)->toBe('英語はかせ')->and($stages->last()->question_count)->toBe(15)
        ->and($stages->first()->question_count)->toBe(10)->and($stages->first()->reward_percent)->toBe(50)
        ->and($stages->first()->questions()->count())->toBe(4);
});

it('何度実行しても同じ結果。ステージがない言語は何も作らない', function () {
    $us = createTravelCountry('us', 'アメリカ');
    createCountryEnglish($us, ['Hello', 'Thanks']);

    CoursePoolBuilder::buildLanguages();
    $again = CoursePoolBuilder::buildLanguages();

    expect($again)->toBe(['en' => ['stages' => 10, 'pool' => 2]])->and(englishStages())->toHaveCount(10)->and(Question::count())->toBe(2);
});

it('アメリカ・イギリスの国の画面は、同じ言語のコースを指す。アメリカでクリアすると、イギリスでもクリア済み', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    createCountryEnglish($us, ['Hello', 'Thanks']);
    createCountryEnglish($gb, ['Cheers']);
    CoursePoolBuilder::buildLanguages();
    arriveAt($profile, 'us');
    arriveAt($profile, 'gb');

    $first = collect($this->getJson("/api/countries/{$us->id}")->assertOk()->json('language_groups'))->firstWhere('difficulty', '初級');
    $firstStage = Stage::find($first['stages'][0]['id']);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $firstStage->id, 'best_score' => 10, 'attempts' => 1, 'cleared_at' => now()]);

    $second = collect($this->getJson("/api/countries/{$gb->id}")->assertOk()->json('language_groups'))->firstWhere('difficulty', '初級');
    expect(collect($second['stages'])->pluck('id')->all())->toBe(collect($first['stages'])->pluck('id')->all())
        ->and($second['stages'][0]['cleared'])->toBeTrue();
});

it('国の一覧の language は、ステージのある言語だけ。母国の言語・ステージのない言語は null', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $fr = createTravelCountry('fr', 'フランス');
    $jp = createTravelCountry('jp', '日本');
    foreach ([$us, $fr, $jp] as $country) {
        withMainStageQuestion($country);
    }
    createCountryEnglish($us, ['Hello']);
    CoursePoolBuilder::buildLanguages();

    $countries = collect($this->getJson('/api/countries')->assertOk()->json())->keyBy('code');

    expect($countries['us']['language'])->toBe(['key' => 'en', 'name' => '英語'])
        ->and($countries['fr']['language'])->toBeNull()
        ->and($countries['jp']['language'])->toBeNull()
        ->and($countries['us']['has_language_mode'])->toBeTrue()
        ->and($countries['fr']['has_language_mode'])->toBeFalse();
});

it('国の画面の groups は、国のメインの道(国旗)だけ。英語・世界遺産は出ない', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    arriveAt($profile, 'us');
    createCountryEnglish($us, ['Hello']);
    Stage::create(['category_id' => Category::create(['name' => '世界遺産'])->id, 'country_id' => $us->id, 'difficulty' => '初級', 'stage_number' => 1]);

    $groups = collect($this->getJson("/api/countries/{$us->id}")->assertOk()->json('groups'));

    expect($groups->pluck('category.name')->unique()->all())->toBe(['アメリカカテゴリ']);
});

use App\Models\QuestionTheme;

/** テーマ($themeKey。null ならテーマなし)つきの、国に結びついた英語のステージを作る */
function createThemedEnglish(Country $country, int $number, ?string $themeKey, string $prompt): void
{
    $english = Category::firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);
    $quiz = Quiz::firstOrCreate(['title' => "英語テーマ{$country->code}"], ['difficulty' => '初級', 'country_id' => $country->id]);
    $theme = $themeKey ? QuestionTheme::firstOrCreate(['key' => $themeKey], ['label' => $themeKey]) : null;
    $stage = Stage::create(['category_id' => $english->id, 'country_id' => $country->id, 'difficulty' => '初級', 'stage_number' => $number, 'question_theme_id' => $theme?->id, 'is_boss' => false]);
    $q = Question::create(['quiz_id' => $quiz->id, 'prompt' => $prompt, 'meta' => ['flag_key' => "既存{$prompt}"]]);
    $q->choices()->create(['label' => '正', 'is_correct' => true, 'order' => 1]);
    $q->choices()->create(['label' => '誤', 'is_correct' => false, 'order' => 2]);
    $stage->questions()->attach($q->id, ['order' => 1]);
}

it('言語のコースにまとめるとき、問題にテーマから種類(word/sentence)を付ける。既存の meta は残す', function () {
    $us = createTravelCountry('us', 'アメリカ');
    createThemedEnglish($us, 1, 'vocabulary', 'Dog');
    createThemedEnglish($us, 2, 'phrase', 'How are you?');
    createThemedEnglish($us, 3, 'grammar', 'I am a student.');
    createThemedEnglish($us, 4, null, 'Cat');

    CoursePoolBuilder::buildLanguages();
    CoursePoolBuilder::buildLanguages();

    $kinds = Question::all()->mapWithKeys(fn ($q) => [$q->prompt => $q->meta['kind'] ?? null])->all();
    expect($kinds)->toBe(['Dog' => 'word', 'How are you?' => 'sentence', 'I am a student.' => 'sentence', 'Cat' => 'word'])
        ->and(Question::where('prompt', 'Dog')->first()->meta['flag_key'])->toBe('既存Dog');
});
