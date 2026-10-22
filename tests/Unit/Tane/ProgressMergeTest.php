<?php

use App\Support\Tane\ProgressMerge;

// 記録の合わせ方(company/spra/tane/docs/2026-10-21-account-sync-design.md 6章)。
// tests/Fixtures/tane-merge-cases.json は Tane(TypeScript)側にも同じものを置いて、同じ例で通す

function taneMergeCases(): array
{
    return json_decode(file_get_contents(__DIR__.'/../../Fixtures/tane-merge-cases.json'), true, 512, JSON_THROW_ON_ERROR);
}

test('固定の例のすべてで、merge(a, b) が期待どおりになる', function () {
    foreach (taneMergeCases() as $case) {
        expect(ProgressMerge::merge($case['a'], $case['b']))->toBe($case['expected'], $case['name']);
    }
});

test('どちらが先でも同じ答えになる(日時が同じ例だけは、先に渡したほうが残る)', function () {
    foreach (taneMergeCases() as $case) {
        if ($case['order_sensitive'] ?? false) {
            continue;
        }
        expect(ProgressMerge::merge($case['b'], $case['a']))->toBe($case['expected'], $case['name']);
    }
});

test('同じものを何度合わせても変わらない', function () {
    foreach (taneMergeCases() as $case) {
        expect(ProgressMerge::merge($case['expected'], $case['expected']))->toBe($case['expected'], $case['name']);
        expect(ProgressMerge::merge(ProgressMerge::merge($case['a'], $case['b']), $case['b']))->toBe($case['expected'], $case['name']);
    }
});

test('古い記録を送っても、★・最高点は下がらない', function () {
    $server = ['stars' => ['add-1' => 5], 'best' => ['add-1' => 9000]];
    $old = ['stars' => ['add-1' => 1], 'best' => ['add-1' => 10]];

    $merged = ProgressMerge::merge(ProgressMerge::validate($server), ProgressMerge::validate($old));

    expect($merged['stars'])->toBe(['add-1' => 5])->and($merged['best'])->toBe(['add-1' => 9000]);
});

test('validate は、形のちがうステージIDと範囲外の★を捨てて、ほかは残す', function () {
    $out = ProgressMerge::validate([
        'stars' => ['add-1' => 3, 'ADD-1' => 3, 'add-1000' => 3, 'add' => 3, 'sub-2' => 6, 'mul-1' => 0, 'div-1' => '3', 'div-2' => 5],
        'best' => ['add-1' => 2400, 'div-2' => -5, 'sub-2' => 100],
    ]);

    expect($out['stars'])->toBe(['add-1' => 3, 'div-2' => 5]);
    // 最高点は、残った★のあるステージだけ。範囲外(マイナス)も捨てる
    expect($out['best'])->toBe(['add-1' => 2400]);
});

test('validate は、足りないキーを空で補い、型のちがうものは捨てる', function () {
    expect(ProgressMerge::validate([]))->toBe(ProgressMerge::empty());
    expect(ProgressMerge::validate(['stars' => 'x', 'garden' => 'y', 'gardenChangedAt' => 'いつか', 'lastModeId' => 5]))->toBe(ProgressMerge::empty());
});

test('validate は、ステージの記録を200件まで、にわを8つまでにする', function () {
    $stars = [];
    foreach (range(1, 201) as $n) {
        $stars['add-'.$n] = 1;
    }
    $garden = array_map(fn ($n) => 'add-'.$n, range(1, 12));

    $out = ProgressMerge::validate(['stars' => $stars, 'garden' => $garden], maxStageRecords: 200);

    expect($out['stars'])->toHaveCount(200)->and($out['garden'])->toHaveCount(8)->and($out['garden'][0])->toBe('add-1');
});

test('validate は、にわの重なりを除き、遠い未来の日時は今に直す', function () {
    $future = (new DateTimeImmutable('+30 days'))->format(DATE_ATOM);
    $out = ProgressMerge::validate(['garden' => ['add-1', 'add-1', 'sub-2'], 'gardenChangedAt' => $future]);

    expect($out['garden'])->toBe(['add-1', 'sub-2']);
    // 時計の狂った端末の日時が、いつまでも勝ち続けないように
    expect((new DateTimeImmutable($out['gardenChangedAt']))->getTimestamp())->toBeLessThan((new DateTimeImmutable('+1 day'))->getTimestamp());
});

test('空の形は、JSON にしたとき {} と [] が正しく出る', function () {
    $json = json_encode(ProgressMerge::forJson(ProgressMerge::empty()));

    expect($json)->toBe('{"stars":{},"best":{},"challengeBest":{},"endless":{},"garden":[],"gardenChangedAt":null,"lastModeId":null,"lastModeAt":null}');
});
