<?php

use App\Support\LevelCurve;

/*
|--------------------------------------------------------------------------
| レベルの上がり方(docs/design/2026-09-27-spru-wave-b-design.md 3-6)
|--------------------------------------------------------------------------
|
| 次のレベルまでのXPは、100から始めて、だんだん増える(頭打ちなし)。5の倍数に丸める
| (docs/design/2026-10-07-header-level-design.md 6章)。正解のXPは難しさで変わる。
| 上がり方を変える前に上がったレベルは下げない。
|
*/

it('各レベルに届くまでの合計XPが設計書の表どおり', function () {
    $totals = collect([1, 2, 3, 6, 11, 16, 21, 31, 51])->mapWithKeys(fn (int $level) => [$level => LevelCurve::totalXpFor($level)])->all();

    expect($totals)->toBe([1 => 0, 2 => 100, 3 => 210, 6 => 615, 11 => 1595, 16 => 3060, 21 => 5140, 31 => 11635, 51 => 37475]);
});

it('次のレベルまでのXP: 100から始まり、頭打ちなく増え続ける', function () {
    $steps = collect([1, 2, 5, 10, 20, 30, 50, 100])->mapWithKeys(fn (int $level) => [$level => LevelCurve::xpToNext($level)])->all();

    expect($steps)->toBe([1 => 100, 2 => 110, 5 => 150, 10 => 230, 20 => 470, 30 => 810, 50 => 1790, 100 => 5990]);

    foreach (range(1, 120) as $level) {
        expect(LevelCurve::xpToNext($level + 1))->toBeGreaterThanOrEqual(LevelCurve::xpToNext($level))
            ->and(LevelCurve::xpToNext($level) % 5)->toBe(0);
    }
});

it('合計XPからレベルを求める(境目ちょうどで上がる)', function () {
    expect(LevelCurve::levelForXp(0))->toBe(1)
        ->and(LevelCurve::levelForXp(99))->toBe(1)
        ->and(LevelCurve::levelForXp(100))->toBe(2)
        ->and(LevelCurve::levelForXp(209))->toBe(2)
        ->and(LevelCurve::levelForXp(210))->toBe(3)
        ->and(LevelCurve::levelForXp(37475))->toBe(51);

    foreach ([2, 7, 15, 40] as $level) {
        expect(LevelCurve::levelForXp(LevelCurve::totalXpFor($level)))->toBe($level)
            ->and(LevelCurve::levelForXp(LevelCurve::totalXpFor($level) - 1))->toBe($level - 1);
    }
});

it('正解のXPは初級10・中級15・上級20', function (string $difficulty, int $xp) {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    $question->quiz->update(['difficulty' => $difficulty]);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.delta.xp', $xp);

    expect($profile->fresh()->xp)->toBe($xp);
})->with([['初級', 10], ['中級', 15], ['上級', 20]]);

it('学習ポイントは難しさにかかわらず10', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    $question->quiz->update(['difficulty' => '上級']);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();

    expect($profile->fresh()->points)->toBe(10);
});

it('新しい上がり方の境目でレベルが上がる', function () {
    $profile = createActiveProfile();
    $profile->update(['xp' => 205, 'level' => 2]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.level', 3)
        ->assertJsonPath('profile.leveled_up', true)
        ->assertJsonPath('profile.level_xp', ['floor' => 210, 'next' => 330]);
});

it('前の計算で上がっていたレベルは下がらない', function () {
    $profile = createActiveProfile();
    // 前の計算ではLv.5、新しい計算ではLv.4になるXP(新しい計算でLv.5は330から)
    $profile->update(['xp' => 325, 'level' => 5]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.level', 5)
        ->assertJsonPath('profile.leveled_up', false);
});

it('町の情報に今のレベルの合計XPと次のレベルの合計XPが含まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['xp' => 150, 'level' => 2]);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('profile.level_xp', ['floor' => 100, 'next' => 210]);
});

it('プロフィールの取得が、今のレベルの合計XPと次のレベルの合計XPを返す(ヘッダーの輪に使う)', function () {
    $profile = createActiveProfile();
    $profile->update(['xp' => 150, 'level' => 2]);

    $this->getJson('/api/profiles/active')->assertOk()
        ->assertJsonPath('level', 2)
        ->assertJsonPath('xp', 150)
        ->assertJsonPath('level_xp', ['floor' => 100, 'next' => 210]);
});
