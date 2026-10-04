<?php

use App\Support\FlagQuiz\FlagCatalog;

/*
|--------------------------------------------------------------------------
| 国旗クイズの国の一覧(docs/design/2026-10-05-flag-quiz-design.md 5章)
|--------------------------------------------------------------------------
*/

it('国連加盟の193か国が、大陸ごとの数どおりにそろっている', function () {
    $catalog = FlagCatalog::all();
    $perContinent = collect($catalog)->countBy('continent')->all();

    expect($catalog)->toHaveCount(193);
    expect($perContinent)->toBe([
        'asia' => 47,
        'europe' => 43,
        'africa' => 54,
        'north-america' => 23,
        'south-america' => 12,
        'oceania' => 14,
    ]);
});

it('keyと国名が重ならず、大陸と知名度が決まった値で、国旗の絵が実在する', function () {
    $catalog = FlagCatalog::all();

    expect(collect($catalog)->pluck('name')->unique())->toHaveCount(193);

    foreach ($catalog as $key => $country) {
        expect($country['key'])->toBe($key);
        expect(array_keys(FlagCatalog::CONTINENTS))->toContain($country['continent']);
        expect($country['tier'])->toBeIn([1, 2, 3]);
        expect(is_file(base_path("frontend/public/flag/{$key}.svg")))->toBeTrue("国旗の絵がない: {$key}");
    }
});

it('似ている国は、一覧にいる国で、自分ではなく、お互いに似ていて、最大4か国', function () {
    $catalog = FlagCatalog::all();

    foreach ($catalog as $key => $country) {
        expect(count($country['similar']))->toBeLessThanOrEqual(4);
        foreach ($country['similar'] as $other) {
            expect($other)->not->toBe($key);
            expect($catalog)->toHaveKey($other);
            expect($catalog[$other]['similar'])->toContain($key);
        }
    }
});

it('初級に出る(知名度1・2)国が、どの大陸にも8か国以上ある', function () {
    $beginner = collect(FlagCatalog::all())->where('tier', '<=', 2)->countBy('continent');

    foreach (array_keys(FlagCatalog::CONTINENTS) as $continent) {
        expect($beginner[$continent])->toBeGreaterThanOrEqual(8);
    }
});

it('コースは、大陸6つと世界ぜんぶ', function () {
    expect(array_keys(FlagCatalog::COURSES))->toBe([
        'asia', 'europe', 'africa', 'north-america', 'south-america', 'oceania', 'world',
    ]);
    expect(FlagCatalog::COURSES['world'])->toBe('世界ぜんぶ');
});
