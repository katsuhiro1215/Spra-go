<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\CoursePoolBuilder;

/** 国のコースの並べ直し(docs/design/2026-10-07-main-game-levels-design.md 4-2・4-7) */

/** 今の形(4ステージ×10問＋ボス20問)の国旗コースを作る */
function createFlagCourse(string $code, string $name, array $difficulties = ['初級']): Country
{
    $country = Country::create(['code' => $code, 'three_code' => strtoupper($code).'X', 'name' => $name, 'name_en' => $name, 'country_code' => random_int(100, 999)]);
    $root = Category::firstOrCreate(['name' => '国旗', 'parent_id' => null]);
    $category = Category::create(['name' => $name, 'parent_id' => $root->id]);
    foreach ($difficulties as $difficulty) {
        $quiz = Quiz::create(['title' => "{$name}{$difficulty}", 'difficulty' => $difficulty, 'country_id' => $country->id]);
        foreach ([1, 2, 3, 4, 5] as $number) {
            $boss = $number === 5;
            $stage = Stage::create(['category_id' => $category->id, 'country_id' => $country->id, 'difficulty' => $difficulty, 'stage_number' => $number, 'question_count' => $boss ? 20 : 10, 'is_boss' => $boss, 'title_reward' => $boss ? "{$name}はかせ" : null]);
            foreach (range(1, $boss ? 20 : 10) as $i) {
                $q = Question::create(['quiz_id' => $quiz->id, 'prompt' => "{$name}{$difficulty}{$number}-{$i}"]);
                $stage->questions()->attach($q->id, ['order' => $i]);
            }
        }
    }

    return $country;
}

function courseStages(Country $country, string $difficulty)
{
    return Stage::where('country_id', $country->id)->where('difficulty', $difficulty)->orderBy('stage_number')->get();
}

it('4ステージ＋ボスの国旗コースを、10ステージ(9つが通常・最後がボス)のプールに並べ直す', function () {
    $country = createFlagCourse('jp', '日本');

    CoursePoolBuilder::buildCountry($country);

    $stages = courseStages($country, '初級');
    expect($stages)->toHaveCount(10)->and($stages->pluck('stage_number')->all())->toBe(range(1, 10));
    foreach ($stages->take(9) as $stage) {
        expect($stage->is_boss)->toBeFalse()->and($stage->is_pool)->toBeTrue()->and($stage->question_count)->toBe(10)->and($stage->reward_percent)->toBe(50)->and($stage->title_reward)->toBeNull();
    }
    $boss = $stages->last();
    expect($boss->is_boss)->toBeTrue()->and($boss->question_count)->toBe(15)->and($boss->reward_percent)->toBe(100)->and($boss->title_reward)->toBe('日本はかせ')->and($boss->is_pool)->toBeTrue();
    // 元の60問が、すべてのステージのプールになる
    foreach ($stages as $stage) {
        expect($stage->questions()->count())->toBe(60);
    }
    expect(Question::count())->toBe(60);
});

it('級ごとの出す数は、中級15・ボス20、上級20・ボス25', function () {
    $country = createFlagCourse('us', 'アメリカ', ['初級', '中級', '上級']);

    CoursePoolBuilder::buildCountry($country);

    expect(courseStages($country, '中級')->first()->question_count)->toBe(15)->and(courseStages($country, '中級')->last()->question_count)->toBe(20)
        ->and(courseStages($country, '上級')->first()->question_count)->toBe(20)->and(courseStages($country, '上級')->last()->question_count)->toBe(25);
});

it('何度実行しても、同じ結果になる', function () {
    $country = createFlagCourse('fr', 'フランス');

    CoursePoolBuilder::buildCountry($country);
    CoursePoolBuilder::buildCountry($country);

    expect(courseStages($country, '初級'))->toHaveCount(10)->and(Question::count())->toBe(60)
        ->and(courseStages($country, '初級')->first()->questions()->count())->toBe(60)
        ->and(courseStages($country, '初級')->where('is_boss', true))->toHaveCount(1);
});

it('国のコース定義があれば、その級・ステージ数に従い、定義にない級は消す', function () {
    $country = createFlagCourse('va', 'バチカン市国', ['初級', '中級']);

    CoursePoolBuilder::buildCountry($country, ['初級' => ['stages' => 5, 'draw' => 10, 'boss' => 15]]);

    expect(courseStages($country, '初級'))->toHaveCount(5)->and(courseStages($country, '初級')->last()->is_boss)->toBeTrue()
        ->and(courseStages($country, '中級'))->toHaveCount(0);
});

it('ステージがない国・級は何も作らない', function () {
    $country = Country::create(['code' => 'xx', 'three_code' => 'XXX', 'name' => '空の国', 'name_en' => 'x', 'country_code' => 999]);

    expect(CoursePoolBuilder::buildCountry($country))->toBe(['stages' => 0, 'pool' => 0])
        ->and(Stage::count())->toBe(0);
});
