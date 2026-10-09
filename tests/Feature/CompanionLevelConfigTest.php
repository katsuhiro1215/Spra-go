<?php

/*
|--------------------------------------------------------------------------
| 通常キャラが会えるレベル(docs/design/2026-10-08-town-growth-design.md 4-2)
|--------------------------------------------------------------------------
*/

it('会える順は今の通常キャラの5人で、Lv3から5レベルおき', function () {
    expect(config('companions.level_order'))->toBe(['lumi', 'momo', 'kuru', 'piko', 'ruru'])
        ->and(config('companions.level_first'))->toBe(3)
        ->and(config('companions.level_step'))->toBe(5);
});

it('会える順に入っているのは、設定にある通常キャラ(レアでない)だけ', function () {
    foreach (config('companions.level_order') as $key) {
        expect(config("companions.list.{$key}"))->not->toBeNull()
            ->and(config("companions.list.{$key}.rare", false))->toBeFalse();
    }
});
