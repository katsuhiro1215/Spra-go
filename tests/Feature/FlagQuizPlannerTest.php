<?php

use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagQuizPlanner;

/*
|--------------------------------------------------------------------------
| 国旗クイズの計画(docs/design/2026-10-05-flag-quiz-design.md 4章)
|--------------------------------------------------------------------------
*/

/** テスト用の小さな一覧。アジア12か国(知名度1・2が8か国)・ヨーロッパ10か国(同8か国)。似ている国つき */
function flagTestCatalog(): array
{
    $rows = [];
    foreach (range(1, 12) as $n) {
        $rows[] = ["A{$n}", "あじあ{$n}", 'asia', $n <= 3 ? 1 : ($n <= 8 ? 2 : 3)];
    }
    foreach (range(1, 10) as $n) {
        $rows[] = ["E{$n}", "よーろっぱ{$n}", 'europe', $n <= 3 ? 1 : ($n <= 8 ? 2 : 3)];
    }

    $catalog = [];
    foreach ($rows as [$key, $name, $continent, $tier]) {
        $catalog[$key] = compact('key', 'name', 'continent', 'tier') + ['similar' => []];
    }
    foreach ([['A1', 'A2', 'E1'], ['A5', 'A9']] as $group) {
        foreach ($group as $key) {
            $catalog[$key]['similar'] = array_values(array_diff($group, [$key]));
        }
    }

    return $catalog;
}

function flagPlanQuestions(array $plan): array
{
    return collect($plan)->flatMap(fn ($course) => collect($course['levels'])->flatMap(
        fn ($level) => collect($level['stages'])->flatMap(fn ($stage) => $stage['questions'])
    ))->all();
}

function flagLevel(array $plan, string $course, string $code): array
{
    $found = collect($plan)->firstWhere('key', $course);

    return collect($found['levels'])->firstWhere('code', $code);
}

it('国が8か国以上あるコースだけを、大陸の順に出し、最後に世界ぜんぶを足す', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());

    expect(collect($plan)->pluck('key')->all())->toBe(['asia', 'europe', 'world']);
    expect(collect($plan)->pluck('name')->all())->toBe(['アジア', 'ヨーロッパ', '世界ぜんぶ']);
    expect(collect($plan)->pluck('order')->all())->toBe([1, 2, 3]);
    expect(collect($plan[0]['levels'])->pluck('difficulty')->all())->toBe(['初級', '中級', '上級']);
});

it('同じ一覧からは、いつも同じ計画ができる', function () {
    expect(FlagQuizPlanner::plan(flagTestCatalog()))->toBe(FlagQuizPlanner::plan(flagTestCatalog()));
});

it('ステージは、国の数を10で割った切り上げの数だけ。最後にボスが1つ。どのステージも10問', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());

    $beginner = flagLevel($plan, 'asia', 'beginner'); // 知名度1・2が8か国 → 1ステージ + ボス
    expect(collect($beginner['stages'])->pluck('number')->all())->toBe([1, 2]);
    expect(collect($beginner['stages'])->pluck('boss')->all())->toBe([false, true]);

    $intermediate = flagLevel($plan, 'asia', 'intermediate'); // 12か国 → 2ステージ + ボス
    expect(collect($intermediate['stages'])->pluck('number')->all())->toBe([1, 2, 3]);

    foreach ($plan as $course) {
        foreach ($course['levels'] as $level) {
            foreach ($level['stages'] as $stage) {
                expect($stage['questions'])->toHaveCount(10);
            }
        }
    }
});

it('ボスだけに称号がつく(コース名の国旗○○)', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());

    $stages = flagLevel($plan, 'asia', 'advanced')['stages'];
    expect($stages[0]['title_reward'])->toBeNull();
    expect(end($stages)['title_reward'])->toBe('アジアの国旗はかせ');
    expect(end(flagLevel($plan, 'europe', 'beginner')['stages'])['title_reward'])->toBe('ヨーロッパの国旗みならい');
    expect(end(flagLevel($plan, 'world', 'intermediate')['stages'])['title_reward'])->toBe('世界ぜんぶの国旗めいじん');
});

it('問題のキーは、すべて違う', function () {
    $keys = collect(flagPlanQuestions(FlagQuizPlanner::plan(flagTestCatalog())))->pluck('key');

    expect($keys->unique()->count())->toBe($keys->count());
    expect($keys->first())->toBe('flag:asia:beginner:1:q1');
});

it('初級は、国旗→国名の4択だけ。知名度3の国は正解に出ない。選択肢に国旗の絵は付かない', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();

    foreach (flagLevel($plan, 'asia', 'beginner')['stages'] as $stage) {
        foreach ($stage['questions'] as $question) {
            expect($question['type'])->toBe('multiple_choice');
            expect($question['image'])->toStartWith('/flag/A');
            expect(collect($question['choices'])->where('correct', true))->toHaveCount(1);
            expect(count($question['choices']))->toBeGreaterThanOrEqual(4);
            expect(collect($question['choices'])->pluck('image')->filter()->all())->toBe([]);

            $key = str_replace(['/flag/', '.svg'], '', $question['image']);
            expect($catalog[$key]['tier'])->toBeLessThanOrEqual(2);
        }
    }
});

it('中級は、3問目と8問目がはめ込み(重ならない4か国)。ほかは国名→国旗で、選択肢に国旗の絵が付く', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());

    foreach (flagLevel($plan, 'asia', 'intermediate')['stages'] as $stage) {
        foreach ($stage['questions'] as $index => $question) {
            if (in_array($index + 1, [3, 8], true)) {
                expect($question['type'])->toBe('matching');
                expect($question['layout'])->toBe('slots');
                expect($question['items'])->toHaveCount(4);
                expect(collect($question['items'])->pluck('id')->unique())->toHaveCount(4);
                continue;
            }
            expect($question['type'])->toBe('multiple_choice');
            expect($question['image'])->toBeNull();
            expect($question['prompt'])->toContain('の国旗は、どれ？');
            expect(collect($question['choices'])->where('correct', true)->first()['image'])->toStartWith('/flag/');
            expect(collect($question['choices'])->every(fn ($choice) => $choice['image'] !== null))->toBeTrue();
        }
    }
});

it('上級は、まちがいの候補が似ている国から。似ている国が足りなければ、同じコースの国で足して3つ以上', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();

    foreach (flagLevel($plan, 'asia', 'advanced')['stages'] as $stage) {
        foreach ($stage['questions'] as $question) {
            if ($question['type'] !== 'multiple_choice') {
                continue;
            }
            $correct = collect($question['choices'])->firstWhere('correct', true);
            $country = collect($catalog)->firstWhere('name', $correct['label']);
            $wrongNames = collect($question['choices'])->where('correct', false)->pluck('label');

            expect($wrongNames->count())->toBeGreaterThanOrEqual(3);
            expect($wrongNames->unique()->count())->toBe($wrongNames->count());
            expect($wrongNames)->not->toContain($correct['label']);
            foreach ($country['similar'] as $similarKey) {
                expect($wrongNames)->toContain($catalog[$similarKey]['name']);
            }
        }
    }
});

it('上級のはめ込みには、いちばん上の国(アンカー)の似ている国が入る', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();
    $fits = collect(flagLevel($plan, 'asia', 'advanced')['stages'])
        ->flatMap(fn ($stage) => $stage['questions'])
        ->where('type', 'matching');

    expect($fits)->not->toBeEmpty();
    foreach ($fits as $fit) {
        $ids = collect($fit['items'])->pluck('id');
        foreach (array_slice($catalog[$fit['items'][0]['id']]['similar'], 0, 3) as $similarKey) {
            expect($ids)->toContain($similarKey);
        }
    }
});

it('どの級でも、そのコースの国は、どれも1回は正解として出る(はめ込みは4か国とも正解に数える)', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();

    foreach (['asia', 'europe', 'world'] as $courseKey) {
        foreach (['beginner', 'intermediate', 'advanced'] as $code) {
            $level = flagLevel($plan, $courseKey, $code);
            $shown = collect($level['stages'])->flatMap(fn ($stage) => $stage['questions'])->flatMap(
                fn ($question) => $question['type'] === 'matching'
                    ? collect($question['items'])->pluck('label')
                    : [collect($question['choices'])->firstWhere('correct', true)['label']]
            )->unique();

            $expected = collect($catalog)
                ->when($courseKey !== 'world', fn ($c) => $c->where('continent', $courseKey))
                ->when($code === 'beginner', fn ($c) => $c->where('tier', '<=', 2))
                ->pluck('name');

            expect($shown->intersect($expected)->count())->toBe($expected->count());
        }
    }
});

it('世界ぜんぶの選択肢は、ほかの大陸の国も出る', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $names = collect(flagLevel($plan, 'world', 'beginner')['stages'])
        ->flatMap(fn ($stage) => $stage['questions'])
        ->flatMap(fn ($question) => collect($question['choices'])->pluck('label'));

    expect($names->contains(fn ($name) => str_starts_with($name, 'あじあ')))->toBeTrue();
    expect($names->contains(fn ($name) => str_starts_with($name, 'よーろっぱ')))->toBeTrue();
});

it('本物の一覧では、全部のステージが10問・選択肢が4つ以上・キーが重ならない', function () {
    $plan = FlagQuizPlanner::plan(FlagCatalog::all());
    $questions = flagPlanQuestions($plan);

    expect(collect($plan)->pluck('key')->all())->toBe(array_keys(FlagCatalog::COURSES));
    expect(collect($questions)->pluck('key')->unique()->count())->toBe(count($questions));
    foreach ($plan as $course) {
        foreach ($course['levels'] as $level) {
            foreach ($level['stages'] as $stage) {
                expect($stage['questions'])->toHaveCount(10);
            }
        }
    }
    foreach ($questions as $question) {
        if ($question['type'] === 'multiple_choice') {
            expect(count($question['choices']))->toBeGreaterThanOrEqual(4);
        }
    }
});
