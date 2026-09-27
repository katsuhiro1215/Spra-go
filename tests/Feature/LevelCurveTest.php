<?php

use App\Support\LevelCurve;

/*
|--------------------------------------------------------------------------
| レベルの上がり方(docs/design/2026-09-27-spru-wave-b-design.md 3-6)
|--------------------------------------------------------------------------
|
| 次のレベルまでのXPは100から+20ずつ、上限300。正解のXPは難しさで変わる。
| 上がり方を変える前に上がったレベルは下げない。
|
*/

it('各レベルに届くまでの合計XPが設計書の表どおり', function () {
    $totals = collect(range(1, 13))->mapWithKeys(fn (int $level) => [$level => LevelCurve::totalXpFor($level)])->all();

    expect($totals)->toBe([
        1 => 0, 2 => 100, 3 => 220, 4 => 360, 5 => 520, 6 => 700, 7 => 900,
        8 => 1120, 9 => 1360, 10 => 1620, 11 => 1900, 12 => 2200, 13 => 2500,
    ]);
});

it('合計XPからレベルを求める(境目ちょうどで上がる)', function () {
    expect(LevelCurve::levelForXp(0))->toBe(1)
        ->and(LevelCurve::levelForXp(99))->toBe(1)
        ->and(LevelCurve::levelForXp(100))->toBe(2)
        ->and(LevelCurve::levelForXp(219))->toBe(2)
        ->and(LevelCurve::levelForXp(220))->toBe(3)
        ->and(LevelCurve::levelForXp(2500))->toBe(13);
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
    $profile->update(['xp' => 215, 'level' => 2]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.level', 3)
        ->assertJsonPath('profile.leveled_up', true)
        ->assertJsonPath('profile.level_xp', ['floor' => 220, 'next' => 360]);
});

it('前の計算で上がっていたレベルは下がらない', function () {
    $profile = createActiveProfile();
    // 前の計算(XP100ごと)ではLv.5、新しい計算ではLv.4になるXP
    $profile->update(['xp' => 400, 'level' => 5]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.level', 5)
        ->assertJsonPath('profile.leveled_up', false);
});

it('町の情報に今のレベルの合計XPと次のレベルの合計XPが含まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['xp' => 150, 'level' => 2]);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('profile.level_xp', ['floor' => 100, 'next' => 220]);
});
