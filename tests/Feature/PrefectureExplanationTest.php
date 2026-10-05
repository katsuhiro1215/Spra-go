<?php

use App\Support\Prefecture\PrefectureCatalog;
use App\Support\Prefecture\PrefectureQuizPlanner;
use App\Support\QuestionExplanation;

/*
|--------------------------------------------------------------------------
| 都道府県クイズの解説(docs/design/2026-10-06-question-explanation-design.md 6章)
|--------------------------------------------------------------------------
|
| 県のデータ表から、問題と同じところで、解説(要約)も作る。
| テスト用の表(prefectureTestCatalog)は、PrefectureQuizPlannerTest にある。
|
*/

/** 問題の文が、パターンに合う問題を、計画の全体から集める @return list<array> */
function explanationQuestions(array $plan, string $promptPattern): array
{
    return array_values(array_filter(prefectureAllQuestions($plan), fn (array $q) => preg_match($promptPattern, $q['prompt']) === 1));
}

function explanationSummary(array $question): string
{
    return $question['explanation']['summary'];
}

it('計画の全問に、要約(summary)のある解説が付き、解説はそろえた形のまま', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    foreach (prefectureAllQuestions($plan) as $question) {
        expect($question['explanation']['summary'] ?? '')->toBeString()->not->toBe('', $question['key']);
        expect(QuestionExplanation::normalize($question['explanation']))->toBe($question['explanation']);
    }
});

it('名物・名所・お祭りなど: その県の事実として説明する', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());
    $catalog = prefectureTestCatalog();

    $foods = explanationQuestions($plan, '/^甲県の めいぶつは/');
    expect($foods)->not->toBe([]);
    foreach ($foods as $q) {
        expect(explanationSummary($q))->toBe(prefectureCorrect($q).'は、甲県の名物だよ。');
    }

    $sights = explanationQuestions($plan, '/^甲県に あるのは/');
    expect($sights)->not->toBe([]);
    foreach ($sights as $q) {
        expect(explanationSummary($q))->toBe(prefectureCorrect($q).'は、甲県にあるよ。');
    }

    $culture = explanationQuestions($plan, '/^甲県の ゆうめいな/');
    expect($culture)->not->toBe([]);
    foreach ($culture as $q) {
        expect(explanationSummary($q))->toBe(prefectureCorrect($q).'は、甲県で有名だよ。');
    }

    expect($catalog['a']['name'])->toBe('甲県');
});

it('逆の問い(事実から県): 問われた事実と、正解の県の名前を、そのまま説明する', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    $reverse = explanationQuestions($plan, '/^『.+』(が あるのは どこ|で ゆうめいなのは どこ)？$/u');
    expect($reverse)->not->toBe([]);
    foreach ($reverse as $q) {
        preg_match('/^『(.+)』/u', $q['prompt'], $m);
        expect(explanationSummary($q))->toStartWith($m[1].'は、'.prefectureCorrect($q));
    }
});

it('県庁所在地: 県の名前とちがうときだけ、まちがえないでねを足す。逆の問いも同じ説明', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    $capital = explanationQuestions($plan, '/^(甲県|乙県|丙府|丁県)の けんちょうしょざいちは/u');
    expect($capital)->not->toBe([]);
    foreach ($capital as $q) {
        $name = mb_substr($q['prompt'], 0, 3) === '丙府' ? '丙府' : mb_substr($q['prompt'], 0, 2);
        $answer = prefectureCorrect($q);
        $expected = "{$name}の県庁所在地は、{$answer}だよ。";
        if ($name === '乙県') {
            $expected .= '乙県と名前がちがうから、まちがえないでね。'; // 乙県の県庁所在地は丙市
        }
        expect(explanationSummary($q))->toBe($expected);
    }

    $reverse = explanationQuestions($plan, '/^『.+』は、どこの けんちょうしょざいち？$/u');
    expect($reverse)->not->toBe([]);
    foreach ($reverse as $q) {
        preg_match('/^『(.+)』は/u', $q['prompt'], $m);
        expect(explanationSummary($q))->toStartWith(prefectureCorrect($q).'の県庁所在地は、'.$m[1].'だよ。');
    }
});

it('何地方か: その県の地方を説明する', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    $regions = explanationQuestions($plan, '/^(甲県|乙県|丙府|丁県|庚県|辛県|壬県|癸県|己県)は どの ちほう？$/u');
    expect($regions)->not->toBe([]);
    foreach ($regions as $q) {
        preg_match('/^(.+)は どの/u', $q['prompt'], $m);
        expect(explanationSummary($q))->toBe("{$m[1]}は、".prefectureCorrect($q).'地方にあるよ。');
    }
});

it('となりの県: データ表のとなりを、表の順にすべて並べる', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    $neighbors = explanationQuestions($plan, '/^甲県と となりあうのは/u');
    expect($neighbors)->not->toBe([]);
    foreach ($neighbors as $q) {
        expect(explanationSummary($q))->toBe('甲県は、乙県・丙府と、県ざかいが接しているよ。'); // 甲県のとなりは b・c
    }
});

it('はめ込み(県庁所在地): 4組の答えを、すべて書く', function () {
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    $fits = array_values(array_filter(prefectureAllQuestions($plan), fn (array $q) => $q['type'] === 'matching'));
    expect($fits)->not->toBe([]);
    foreach ($fits as $q) {
        $summary = explanationSummary($q);
        expect($summary)->toStartWith('こたえは、');
        foreach ($q['items'] as $item) {
            expect($summary)->toContain("{$item['text']}は{$item['label']}");
        }
    }
});

it('難読地名: 読みを書き、noteがあれば、その地名の説明を続ける。なければ読みだけ', function () {
    $catalog = prefectureTestCatalog();
    $catalog['a']['hard'][0]['note'] = '甲県の南にある、港のまちだよ。';
    $catalog['a']['hard'][1]['note'] = '  ';

    $plan = PrefectureQuizPlanner::plan($catalog);

    $hards = explanationQuestions($plan, '/^甲県の『a難[123]』は/u');
    expect($hards)->not->toBe([]);
    $seen = [];
    foreach ($hards as $q) {
        preg_match('/『a難(\d)』/u', $q['prompt'], $m);
        $seen[$m[1]] = true;
        $expected = "『a難{$m[1]}』は、『よみa{$m[1]}』と読むよ。".($m[1] === '1' ? '甲県の南にある、港のまちだよ。' : '');
        expect(explanationSummary($q))->toBe($expected);
    }
    expect($seen)->toHaveKey(1); // noteのある語の問いも、計画に出ている
});

it('解説を付けても、問題の文・選択肢・順番は変わらない(同じ表から、同じ計画)', function () {
    $first = PrefectureQuizPlanner::plan(prefectureTestCatalog());
    $second = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    expect($first)->toBe($second);
});

it('データ表の難読地名は、141語すべてに、その地名の説明(note)がある', function () {
    $missing = [];
    $count = 0;
    foreach (PrefectureCatalog::all() as $prefecture) {
        foreach ($prefecture['hard'] as $hard) {
            $count++;
            if (! is_string($hard['note'] ?? null) || trim($hard['note']) === '') {
                $missing[] = $prefecture['name'].'の'.$hard['word'];
            }
        }
    }

    expect($count)->toBe(141)->and($missing)->toBe([]);
});
