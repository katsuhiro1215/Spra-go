<?php

use App\Support\Space\SpaceQuizPlanner;

/*
|--------------------------------------------------------------------------
| 宇宙クイズの計画(docs/design/2026-10-09-space-quiz-design.md 3・5章)
|--------------------------------------------------------------------------
*/

/** 難しさ $level の問題を $count 問。絵の問題は $pictureEvery 問に1つ */
function spaceQuestions(string $level, int $count, int $pictureEvery = 0): array
{
    $questions = [];
    foreach (range(1, $count) as $number) {
        $picture = $pictureEvery > 0 && $number % $pictureEvery === 0;
        $questions[] = [
            'level' => $level, 'number' => $number, 'theme' => 'テスト', 'kind' => $picture ? 'picture' : 'text',
            'prompt' => "{$level}の問題{$number}？", 'correct' => '太陽', 'wrong' => ['月', '星', '雲'], 'explanation' => "解説{$number}",
        ];
    }

    return $questions;
}

const SPACE_PICTURES = [
    '太陽' => ['key' => 'sun', 'name' => '太陽'], '月' => ['key' => 'moon', 'name' => '月'],
    '星' => ['key' => 'star', 'name' => '星'], '雲' => ['key' => 'cloud', 'name' => '雲'],
];

function spaceStageSizes(array $nodes, string $difficulty): array
{
    $level = collect($nodes[0]['levels'])->firstWhere('difficulty', $difficulty);

    return $level ? array_map(fn ($stage) => count($stage['questions']), $level['stages']) : [];
}

it('難しさごとに、8・8・8 / 8・8・8 / 6・6 のステージに区切る', function () {
    $questions = [...spaceQuestions('初級', 24), ...spaceQuestions('中級', 24), ...spaceQuestions('上級', 12)];

    $plan = SpaceQuizPlanner::plan($questions, SPACE_PICTURES, ['sun', 'moon', 'star', 'cloud']);

    expect($plan['nodes'][0]['name'])->toBe('宇宙たんけん')
        ->and(spaceStageSizes($plan['nodes'], '初級'))->toBe([8, 8, 8])
        ->and(spaceStageSizes($plan['nodes'], '中級'))->toBe([8, 8, 8])
        ->and(spaceStageSizes($plan['nodes'], '上級'))->toBe([6, 6])
        ->and($plan['skipped'])->toBe([]);
});

it('端数は、前のステージから1つずつ多くして、均等に分ける', function () {
    $plan = SpaceQuizPlanner::plan(spaceQuestions('初級', 14), SPACE_PICTURES, []);

    expect(spaceStageSizes($plan['nodes'], '初級'))->toBe([7, 7]);
});

it('問題がない難しさは、作らない', function () {
    $plan = SpaceQuizPlanner::plan(spaceQuestions('初級', 8), SPACE_PICTURES, []);

    expect(array_column($plan['nodes'][0]['levels'], 'difficulty'))->toBe(['初級']);
});

it('各級の最後のステージだけがボスで、称号が付く', function () {
    $questions = [...spaceQuestions('初級', 16), ...spaceQuestions('中級', 8), ...spaceQuestions('上級', 6)];

    $plan = SpaceQuizPlanner::plan($questions, SPACE_PICTURES, []);
    $stages = fn (string $difficulty) => collect($plan['nodes'][0]['levels'])->firstWhere('difficulty', $difficulty)['stages'];

    expect(collect($stages('初級'))->pluck('boss')->all())->toBe([false, true])
        ->and(collect($stages('初級'))->pluck('title_reward')->all())->toBe([null, 'うちゅうたんけんたい'])
        ->and($stages('中級')[0]['title_reward'])->toBe('うちゅうパイロット')
        ->and($stages('上級')[0]['title_reward'])->toBe('うちゅうはかせ')
        ->and(collect($stages('初級'))->pluck('number')->all())->toBe([1, 2]);
});

it('問題は、キー・問題文・選択肢・解説を持ち、文字の問題の選択肢に絵はない', function () {
    $plan = SpaceQuizPlanner::plan(spaceQuestions('初級', 8), SPACE_PICTURES, []);

    $question = $plan['nodes'][0]['levels'][0]['stages'][0]['questions'][0];

    expect($question['key'])->toBe('space:初級:1')
        ->and($question['type'])->toBe('multiple_choice')
        ->and($question['prompt'])->toBe('初級の問題1？')
        ->and($question['image'])->toBeNull()
        ->and($question['explanation'])->toBe(['summary' => '解説1'])
        ->and(array_column($question['choices'], 'label'))->toBe(['太陽', '月', '星', '雲'])
        ->and(array_column($question['choices'], 'correct'))->toBe([true, false, false, false])
        ->and(array_column($question['choices'], 'image'))->toBe([null, null, null, null]);
});

it('絵の問題の選択肢には、/space/キー.webp の絵が付く', function () {
    $plan = SpaceQuizPlanner::plan(spaceQuestions('初級', 8, 8), SPACE_PICTURES, ['sun', 'moon', 'star', 'cloud']);

    $question = $plan['nodes'][0]['levels'][0]['stages'][0]['questions'][7];

    expect(array_column($question['choices'], 'image'))->toBe(['/space/sun.webp', '/space/moon.webp', '/space/star.webp', '/space/cloud.webp']);
});

it('絵が1つでも届いていない絵の問題は外し、外した問題のキーを返す', function () {
    $questions = spaceQuestions('初級', 10, 5); // 5番・10番が絵の問題

    $plan = SpaceQuizPlanner::plan($questions, SPACE_PICTURES, ['sun', 'moon', 'star']); // cloud の絵がない

    expect($plan['skipped'])->toBe(['space:初級:5', 'space:初級:10'])
        ->and(spaceStageSizes($plan['nodes'], '初級'))->toBe([8]);
});

it('絵が増えると、外れていた問題が戻る', function () {
    $questions = spaceQuestions('初級', 10, 5);

    $without = SpaceQuizPlanner::plan($questions, SPACE_PICTURES, []);
    $with = SpaceQuizPlanner::plan($questions, SPACE_PICTURES, ['sun', 'moon', 'star', 'cloud']);

    expect(collect($without['nodes'][0]['levels'][0]['stages'])->sum(fn ($s) => count($s['questions'])))->toBe(8)
        ->and(collect($with['nodes'][0]['levels'][0]['stages'])->sum(fn ($s) => count($s['questions'])))->toBe(10);
});
