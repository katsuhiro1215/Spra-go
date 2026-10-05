<?php

use App\Support\Prefecture\PrefectureCatalog;
use App\Support\Prefecture\PrefectureQuizPlanner;

/*
|--------------------------------------------------------------------------
| 都道府県クイズの計画(docs/design/2026-10-05-prefecture-quiz-design.md 5章)
|--------------------------------------------------------------------------
*/

/**
 * テスト用の小さな表。近畿: a・b・c・d(事実あり)、e(事実なし)、f(事実あり・となりなし)。関東: g・h・i・j(事実あり)。
 * a と b の foods の先頭は、同じ文字「共通の名物」
 */
function prefectureTestCatalog(): array
{
    $make = function (string $key, string $name, string $region, string $capital, array $neighbors, bool $ready) {
        $row = ['key' => $key, 'name' => $name, 'region' => $region, 'capital' => $capital, 'neighbors' => $neighbors, 'foods' => [], 'sights' => [], 'culture' => [], 'hard' => []];
        if ($ready) {
            $row['foods'] = ["{$key}の食1", "{$key}の食2", "{$key}の食3", "{$key}の食4"];
            $row['sights'] = ["{$key}の所1", "{$key}の所2", "{$key}の所3", "{$key}の所4"];
            $row['culture'] = ["{$key}の文1", "{$key}の文2", "{$key}の文3"];
            $row['hard'] = array_map(fn ($i) => ['word' => "{$key}難{$i}", 'reading' => "よみ{$key}{$i}", 'wrong' => ["まちがい{$key}{$i}あ", "まちがい{$key}{$i}い", "まちがい{$key}{$i}う"]], [1, 2, 3]);
        }

        return $row;
    };

    $catalog = [
        'a' => $make('a', '甲県', 'kinki', '甲市', ['b', 'c'], true),
        'b' => $make('b', '乙県', 'kinki', '丙市', ['a', 'c', 'd'], true),
        'c' => $make('c', '丙府', 'kinki', '丙府市', ['a', 'b', 'd'], true),
        'd' => $make('d', '丁県', 'kinki', '丁市', ['b', 'c'], true),
        'e' => $make('e', '戊県', 'kinki', '戊市', [], false),
        'f' => $make('f', '己県', 'kinki', '己市', [], true),
        'g' => $make('g', '庚県', 'kanto', '庚市', ['h'], true),
        'h' => $make('h', '辛県', 'kanto', '辛市', ['g', 'i'], true),
        'i' => $make('i', '壬県', 'kanto', '壬市', ['h', 'j'], true),
        'j' => $make('j', '癸県', 'kanto', '癸市', ['i'], true),
    ];
    $catalog['a']['foods'][0] = '共通の名物';
    $catalog['b']['foods'][0] = '共通の名物';

    return $catalog;
}

function prefectureCourse(array $plan, string $region, string $course): array
{
    $found = collect($plan)->firstWhere('key', $region);

    return collect($found['courses'])->firstWhere('key', $course);
}

function prefectureStage(array $plan, string $region, string $course, string $code): array
{
    $level = collect(prefectureCourse($plan, $region, $course)['levels'])->firstWhere('code', $code);

    return $level['stages'][0];
}

function prefectureAllQuestions(array $plan): array
{
    return collect($plan)->flatMap(fn ($region) => collect($region['courses'])->flatMap(
        fn ($course) => collect($course['levels'])->flatMap(fn ($level) => collect($level['stages'])->flatMap(fn ($stage) => $stage['questions']))
    ))->all();
}

function prefectureCorrect(array $question): string
{
    return collect($question['choices'])->firstWhere('correct', true)['label'];
}

it('地方は決まった順で、コースのある県がない地方は出ない。県のコースは事実のそろった県だけ', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    expect(collect($plan)->pluck('key')->all())->toBe(['kanto', 'kinki']);
    expect(collect($plan)->pluck('name')->all())->toBe(['関東', '近畿']);
    expect(collect($plan)->pluck('order')->all())->toBe([2, 4]);
    expect(collect($plan)->pluck('group')->unique()->all())->toBe([true]);

    $kinki = collect($plan)->firstWhere('key', 'kinki');
    expect(collect($kinki['courses'])->pluck('key')->all())->toBe(['a', 'b', 'c', 'd', 'f']); // eは事実がない
    expect(collect($kinki['courses'])->pluck('order')->all())->toBe([1, 2, 3, 4, 6]);
    expect(collect($kinki['courses'])->pluck('name')->all())->toBe(['甲県', '乙県', '丙府', '丁県', '己県']);
});

it('同じ表からは、いつも同じ計画ができる', function () {
    expect(PrefectureQuizPlanner::plan(prefectureTestCatalog()))->toBe(PrefectureQuizPlanner::plan(prefectureTestCatalog()));
});

it('県のコースは3級で、各級は1ステージ(10問)のボス。称号は上級だけ「県名はかせ」', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());
    $course = prefectureCourse($plan, 'kinki', 'b');

    expect(collect($course['levels'])->pluck('difficulty')->all())->toBe(['初級', '中級', '上級']);
    foreach ($course['levels'] as $level) {
        expect($level['stages'])->toHaveCount(1);
        $stage = $level['stages'][0];
        expect($stage['number'])->toBe(1);
        expect($stage['boss'])->toBeTrue();
        expect($stage['questions'])->toHaveCount(10);
        expect($stage['title_reward'])->toBe($level['code'] === 'advanced' ? '乙県はかせ' : null);
    }
    expect(PrefectureCatalog::title('乙県'))->toBe('乙県はかせ');
});

it('どの問題も、正解が1つで、選択肢の文字が重ならない。はめ込みは枠4つ・項目4つ', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    foreach (prefectureAllQuestions($plan) as $question) {
        if ($question['type'] === 'matching') {
            expect($question['layout'])->toBe('slots');
            expect($question['items'])->toHaveCount(4);
            expect(collect($question['items'])->pluck('id')->unique())->toHaveCount(4);
            expect(collect($question['items'])->pluck('text')->unique())->toHaveCount(4);
            expect(collect($question['items'])->pluck('label')->unique())->toHaveCount(4);
            expect(collect($question['items'])->pluck('image')->unique()->all())->toBe([null]);

            continue;
        }
        expect($question['type'])->toBe('multiple_choice');
        expect($question['choices'])->toHaveCount(4);
        expect(collect($question['choices'])->where('correct', true))->toHaveCount(1);
        expect(collect($question['choices'])->pluck('label')->unique())->toHaveCount(4);
    }
});

it('1ステージに、同じ問い(文と正解)が2回出ない。問題の目印も重ならない', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());
    $keys = [];

    foreach ($plan as $region) {
        foreach ($region['courses'] as $course) {
            foreach ($course['levels'] as $level) {
                $signatures = collect($level['stages'][0]['questions'])->map(
                    fn ($q) => $q['type'] === 'matching' ? 'fit:'.collect($q['items'])->pluck('id')->sort()->implode(',') : $q['prompt'].'|'.prefectureCorrect($q)
                );
                expect($signatures->unique())->toHaveCount(10);
            }
        }
    }
    foreach (prefectureAllQuestions($plan) as $question) {
        expect($question['key'])->toStartWith('pref:');
        $keys[] = $question['key'];
    }
    expect(array_unique($keys))->toHaveCount(count($keys));
});

it('はめ込みは、中級と上級の3問目と8問目。初級にはない。県庁所在地を県の枠に入れる', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    foreach (['a', 'b', 'f'] as $course) {
        foreach (['beginner', 'intermediate', 'advanced'] as $code) {
            $types = collect(prefectureStage($plan, 'kinki', $course, $code)['questions'])->pluck('type')->values();
            $fitAt = $types->keys()->filter(fn ($i) => $types[$i] === 'matching')->map(fn ($i) => $i + 1)->values()->all();
            expect($fitAt)->toBe($code === 'beginner' ? [] : [3, 8]);
        }
    }

    $fit = prefectureStage($plan, 'kinki', 'a', 'intermediate')['questions'][2];
    expect(collect($fit['items'])->pluck('id')->all())->toContain('a');
    $self = collect($fit['items'])->firstWhere('id', 'a');
    expect($self['text'])->toBe('甲市');
    expect($self['label'])->toBe('甲県');
});

it('上級に難読地名が2問。漢字にはふりがなを付けない印(plain)があり、選択肢はひらがなの4択', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());
    $questions = collect(prefectureStage($plan, 'kinki', 'a', 'advanced')['questions']);
    $hard = $questions->filter(fn ($q) => ($q['plain'] ?? []) !== [])->values();

    expect($hard)->toHaveCount(2);
    expect($questions[0]['plain'])->toBe(['a難1']);
    expect($hard[0]['prompt'])->toContain('甲県')->toContain('a難1');
    expect(prefectureCorrect($hard[0]))->toBe('よみa1');
    expect(collect($hard[0]['choices'])->pluck('label')->all())->toContain('まちがいa1あ', 'まちがいa1い', 'まちがいa1う');
    expect($hard[1]['plain'])->toBe(['a難2']);

    // 初級・中級には、plain がない
    foreach (['beginner', 'intermediate'] as $code) {
        foreach (prefectureStage($plan, 'kinki', 'a', $code)['questions'] as $question) {
            expect($question['plain'] ?? [])->toBe([]);
        }
    }
});

it('同じ文字が2つの県にある事実は、逆の問いに使わず、ほかの県のまちがいの選択肢にも出ない', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    foreach (prefectureAllQuestions($plan) as $question) {
        expect($question['prompt'] ?? '')->not->toContain('『共通の名物』');
        if ($question['type'] === 'multiple_choice' && ! str_contains($question['prompt'], '甲県') && ! str_contains($question['prompt'], '乙県')) {
            expect(collect($question['choices'])->pluck('label')->all())->not->toContain('共通の名物');
        }
    }

    // その県自身の問いには、正解としては出てよい(甲県の初級1問目は、名物の1つ目)
    $first = prefectureStage($plan, 'kinki', 'a', 'beginner')['questions'][0];
    expect(prefectureCorrect($first))->toBe('共通の名物');
});

it('となりのない県は「となり」の問いがなく、予備の問いで10問になる', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    foreach (['intermediate', 'advanced'] as $code) {
        $questions = prefectureStage($plan, 'kinki', 'f', $code)['questions'];
        expect($questions)->toHaveCount(10);
        expect(collect($questions)->filter(fn ($q) => str_contains($q['prompt'], 'となりあう')))->toHaveCount(0);
    }
    $other = prefectureStage($plan, 'kinki', 'a', 'intermediate')['questions'];
    expect(collect($other)->filter(fn ($q) => str_contains($q['prompt'], 'となりあう')))->toHaveCount(1);
});

it('級ごとのまちがいの選び方: 中級は同じ地方から、上級のとなりの問いは、となりでない県から', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());
    $catalog = prefectureTestCatalog();
    $kintoNames = collect($catalog)->where('region', 'kinki')->pluck('name');

    // 中級の1問目(県庁所在地): bの県庁所在地のまちがいは、同じ地方の県の県庁所在地から
    $q = prefectureStage($plan, 'kinki', 'b', 'intermediate')['questions'][0];
    $capitals = collect($catalog)->where('region', 'kinki')->pluck('capital');
    expect(prefectureCorrect($q))->toBe('丙市');
    foreach ($q['choices'] as $choice) {
        expect($capitals->contains($choice['label']))->toBeTrue();
    }

    // 上級のとなりの問い(4問目): 正解はbのとなり、まちがいはbのとなりでない県(f・e・同じ地方)から
    $q = prefectureStage($plan, 'kinki', 'b', 'advanced')['questions'][3];
    expect(['甲県', '丙府', '丁県'])->toContain(prefectureCorrect($q));
    foreach ($q['choices'] as $choice) {
        if (! $choice['correct']) {
            expect(['甲県', '丙府', '丁県', '乙県'])->not->toContain($choice['label']);
        }
    }
    expect($kintoNames->count())->toBe(6);
});

it('上級の2問目は、県名と県庁所在地の名前がちがう県だけ県庁所在地の問い。同じ県は名物', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    // 乙県は県庁所在地が「丙市」でちがう → 県庁所在地の問い
    $b = prefectureStage($plan, 'kinki', 'b', 'advanced')['questions'][1];
    expect($b['prompt'])->toContain('けんちょうしょざいち');
    expect(prefectureCorrect($b))->toBe('丙市');

    // 甲県は県庁所在地が「甲市」で県名と同じ → 名物
    $a = prefectureStage($plan, 'kinki', 'a', 'advanced')['questions'][1];
    expect($a['prompt'])->toContain('めいぶつ');

    // 上級のまちがいに、となりの県の県庁所在地が入る(乙県のとなり: 甲・丙府・丁)
    $neighborCapitals = ['甲市', '丙府市', '丁市'];
    expect(collect($b['choices'])->pluck('label')->intersect($neighborCapitals)->count())->toBe(3);
});
