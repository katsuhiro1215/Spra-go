<?php

use App\Models\ProfileStageProgress;

/** クリア率(docs/design/2026-10-07-main-game-levels-design.md 4-3)。通常60%・ボス80%、称号は全問正解 */

function completeStage($test, $stage, int $score)
{
    return $test->postJson("/api/stages/{$stage->id}/complete", ['score' => $score])->assertOk();
}

it('通常ステージは、10問中6問以上でクリア。5問ではクリアにならず、報酬も出ない', function () {
    $profile = createActiveProfile();
    $stage = createPoolStage(10, 10, false, false, '通常');
    $coins = $profile->fresh()->coins;

    $low = completeStage($this, $stage, 5);
    expect($low->json('cleared'))->toBeFalse()->and($low->json('required'))->toBe(6);
    $progress = ProfileStageProgress::where('stage_id', $stage->id)->first();
    expect($progress->cleared_at)->toBeNull()->and($progress->best_score)->toBe(5)->and($progress->attempts)->toBe(1);
    expect($profile->fresh()->coins)->toBe($coins);

    $ok = completeStage($this, $stage, 6);
    expect($ok->json('cleared'))->toBeTrue();
    expect(ProfileStageProgress::where('stage_id', $stage->id)->first()->cleared_at)->not->toBeNull();
    expect($profile->fresh()->coins)->toBe($coins + 100);
});

it('ボスは、10問中8問以上でクリア。7問ではクリアにならない。称号は全問正解のときだけ', function () {
    createActiveProfile();
    $stage = createPoolStage(10, 10, false, true, 'ボス');
    $stage->update(['title_reward' => 'テストはかせ']);

    expect(completeStage($this, $stage, 7)->json('cleared'))->toBeFalse();
    $eight = completeStage($this, $stage, 8);
    expect($eight->json('cleared'))->toBeTrue()->and($eight->json('title_granted'))->toBeFalse();
    expect(completeStage($this, $stage, 10)->json('title_granted'))->toBeTrue();
});

it('一度クリアしたあとの低い点で、クリアは消えない', function () {
    createActiveProfile();
    $stage = createPoolStage(10, 10, false, false, '消えない');

    completeStage($this, $stage, 10);
    completeStage($this, $stage, 2);

    $progress = ProfileStageProgress::where('stage_id', $stage->id)->first();
    expect($progress->cleared_at)->not->toBeNull()->and($progress->best_score)->toBe(10)->and($progress->attempts)->toBe(2);
});

it('出す数が少ないステージでも、端が正しい(3問なら2問で60%以上)', function () {
    createActiveProfile();
    $stage = createPoolStage(3, 3, false, false, '少ない');

    expect(completeStage($this, $stage, 1)->json('cleared'))->toBeFalse();
    expect(completeStage($this, $stage, 2)->json('cleared'))->toBeTrue();
});
