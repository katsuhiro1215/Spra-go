<?php

use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagCatchPlanner;

/*
|--------------------------------------------------------------------------
| 国旗キャッチの問題の計画(docs/design/2026-10-05-flag-catch-design.md 4章)
|--------------------------------------------------------------------------
*/

function flagCatchLevel(array $plan, string $code): array
{
    return collect($plan)->firstWhere('code', $code);
}

function flagCatchWrongNames(array $question): array
{
    return collect($question['choices'])->where('correct', false)->pluck('label')->all();
}

it('難しさごとに、知名度で絞った国を、1か国1問で作る。クイズの名前は「国旗キャッチ ○級」', function () {
    $plan = FlagCatchPlanner::plan(flagTestCatalog());

    expect(collect($plan)->pluck('code')->all())->toBe(['beginner', 'intermediate', 'advanced']);
    expect(collect($plan)->pluck('difficulty')->all())->toBe(['初級', '中級', '上級']);
    expect(collect($plan)->pluck('title')->all())->toBe(['国旗キャッチ 初級', '国旗キャッチ 中級', '国旗キャッチ 上級']);
    // 小さな一覧: 知名度1が6か国、知名度1・2が16か国、全部で22か国
    expect(collect($plan)->map(fn ($level) => count($level['questions']))->all())->toBe([6, 16, 22]);
});

it('問題は、「国名」の国旗は？。選択肢は国旗の絵つきで、正解が1つ、まちがいが3つ以上。キーは重ならない', function () {
    $plan = FlagCatchPlanner::plan(flagTestCatalog());
    $questions = collect($plan)->flatMap(fn ($level) => $level['questions']);

    expect($questions->pluck('key')->unique()->count())->toBe($questions->count());
    expect(flagCatchLevel($plan, 'beginner')['questions'][0]['key'])->toBe('catch:beginner:A1');

    foreach ($questions as $question) {
        expect($question['type'])->toBe('multiple_choice');
        expect($question['image'])->toBeNull();
        expect($question['prompt'])->toMatch('/^「.+」の国旗は？$/');
        expect(collect($question['choices'])->where('correct', true))->toHaveCount(1);
        expect(count($question['choices']))->toBeGreaterThanOrEqual(4);
        expect(collect($question['choices'])->every(fn ($choice) => str_starts_with($choice['image'], '/flag/')))->toBeTrue();
        expect(collect($question['choices'])->pluck('label')->unique()->count())->toBe(count($question['choices']));
    }
});

it('正解の国名が問題文に入り、正解の選択肢の国名と同じ', function () {
    $question = flagCatchLevel(FlagCatchPlanner::plan(flagTestCatalog()), 'beginner')['questions'][0];
    $correct = collect($question['choices'])->firstWhere('correct', true);

    expect($question['prompt'])->toBe("「{$correct['label']}」の国旗は？");
    expect($correct['image'])->toBe('/flag/A1.svg');
});

it('初級・中級のまちがいは、その難しさの国の中から。上級のまちがいは似ている国から', function () {
    $plan = FlagCatchPlanner::plan(flagTestCatalog());
    $catalog = flagTestCatalog();
    $tier1 = collect($catalog)->where('tier', 1)->pluck('name')->all();
    $tier12 = collect($catalog)->where('tier', '<=', 2)->pluck('name')->all();

    foreach (flagCatchLevel($plan, 'beginner')['questions'] as $question) {
        expect(array_diff(flagCatchWrongNames($question), $tier1))->toBe([]);
    }
    foreach (flagCatchLevel($plan, 'intermediate')['questions'] as $question) {
        expect(array_diff(flagCatchWrongNames($question), $tier12))->toBe([]);
    }

    $first = flagCatchLevel($plan, 'advanced')['questions'][0]; // A1。似ている国は A2・E1
    expect(flagCatchWrongNames($first))->toContain('あじあ2', 'よーろっぱ1');
    expect(count(flagCatchWrongNames($first)))->toBeGreaterThanOrEqual(3);
});

it('同じ一覧からは、いつも同じ計画ができる', function () {
    expect(FlagCatchPlanner::plan(flagTestCatalog()))->toBe(FlagCatchPlanner::plan(flagTestCatalog()));
});

it('本物の一覧では、知名度1・知名度1と2・全部の国の数だけ問題ができる', function () {
    $catalog = FlagCatalog::all();
    $plan = FlagCatchPlanner::plan($catalog);

    expect(collect($plan)->map(fn ($level) => count($level['questions']))->all())->toBe([
        collect($catalog)->where('tier', '<=', 1)->count(),
        collect($catalog)->where('tier', '<=', 2)->count(),
        count($catalog),
    ]);
});
