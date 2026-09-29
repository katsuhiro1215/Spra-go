<?php

use App\Models\ProfileGamePlay;
use App\Models\ProfileQuestionMemory;
use App\Support\CatchGame;
use App\Support\LevelCurve;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スプルキャッチを終える(docs/design/2026-09-29-spru-catch-design.md 3-5・4-4・5章・6-3)
|--------------------------------------------------------------------------
|
| 終えるときにサーバーで採点し直し、点数・コンボを計算して、覚え具合に書き、
| その日の最初の3回だけ経験値と学習ポイントを出す。HP とコインは動かさない。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

/** 始めるAPIで回を始め、返事(問題と正解)を返す */
function startCatchPlay(string $difficulty = '初級'): array
{
    return test()->postJson('/api/games/catch/plays', ['difficulty' => $difficulty])->assertOk()->json();
}

/** 返事の問題の先頭から、$pattern(true=正解・false=まちがい)のとおりに答える形を作る */
function catchAnswers(array $play, array $pattern): array
{
    return array_map(function (array $question, bool $correct) {
        $choice = collect($question['choices'])->first(fn (array $c) => ($c['id'] === $question['correct_choice_id']) === $correct);

        return ['question_id' => $question['id'], 'choice_id' => $choice['id']];
    }, array_slice($play['questions'], 0, count($pattern)), $pattern);
}

function finishCatchUrl(array $play): string
{
    return "/api/games/catch/plays/{$play['play_id']}/finish";
}

it('採点し直して、正解の数・点数・いちばん長いコンボを返し、遊んだ回に残す', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 4);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true, true, true, false])])
        ->assertOk()
        ->assertJsonPath('answered_count', 4)
        ->assertJsonPath('correct_count', 3)
        ->assertJsonPath('score', 35)
        ->assertJsonPath('best_combo', 3);

    $row = ProfileGamePlay::query()->sole();
    expect([$row->played_on->toDateString(), $row->answered_count, $row->correct_count, $row->score, $row->best_combo])
        ->toBe(['2026-09-29', 4, 3, 35, 3])
        ->and($row->finished_at)->not->toBeNull();
});

it('点数の決まり(画面のテストと同じ例)', function () {
    expect(CatchGame::score([true, true, true, true, true, true, false, true, true, false]))->toBe(['score' => 100, 'best_combo' => 6])
        ->and(CatchGame::score(array_fill(0, 10, true)))->toBe(['score' => 140, 'best_combo' => 10])
        ->and(CatchGame::score([false, true, true, true]))->toBe(['score' => 35, 'best_combo' => 3])
        ->and(CatchGame::score([]))->toBe(['score' => 0, 'best_combo' => 0]);
});

it('答えを問題ごとの覚え具合に書き、まちがえた問題には wrong_on が付く', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 2);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true, false])])->assertOk();

    $memories = ProfileQuestionMemory::query()->get()->keyBy('question_id');
    expect($memories)->toHaveCount(2)
        ->and($memories[$play['questions'][0]['id']]->wrong_on)->toBeNull()
        ->and($memories[$play['questions'][1]['id']]->wrong_on->toDateString())->toBe('2026-09-29');
});

it('ごほうび: 正解の数×1問あたりの経験値と学習ポイントを出し、HPとコインは変わらない', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 3, '中級');
    $before = $profile->fresh();
    $play = startCatchPlay('中級');

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true, true, false])])
        ->assertOk()
        ->assertJsonPath('reward', ['xp' => 8, 'point' => 6])
        ->assertJsonPath('rewarded_plays_left', 2);

    $after = $profile->fresh();
    expect([$after->xp - $before->xp, $after->points - $before->points, $after->hp, $after->coins])
        ->toBe([8, 6, $before->hp, $before->coins])
        ->and($profile->currencyLedger()->where('reason', 'game_catch')->pluck('delta', 'type')->all())
        ->toEqual(['xp' => 8, 'point' => 6]);
});

it('ごほうびは1日3回まで。4回目は出ず、日付が変わるとまた出る', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $finish = function () {
        $play = startCatchPlay();

        return $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true])])->assertOk();
    };

    foreach ([2, 1, 0] as $left) {
        $finish()->assertJsonPath('reward', ['xp' => 3, 'point' => 3])->assertJsonPath('rewarded_plays_left', $left);
    }
    $finish()->assertJsonPath('reward', null)->assertJsonPath('rewarded_plays_left', 0);

    $this->travelTo(Carbon::parse('2026-09-29 15:30:00', 'UTC')); // 日本時間 9/30 0:30
    $finish()->assertJsonPath('reward', ['xp' => 3, 'point' => 3])->assertJsonPath('rewarded_plays_left', 2);
});

it('正解が0でも1回と数え、ごほうびの記録は付けない', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [false])])
        ->assertOk()
        ->assertJsonPath('reward', null)
        ->assertJsonPath('rewarded_plays_left', 2);

    expect($profile->currencyLedger()->where('reason', 'game_catch')->count())->toBe(0);
});

it('答えが0個でも終えられる', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => []])
        ->assertOk()
        ->assertJsonPath('answered_count', 0)
        ->assertJsonPath('score', 0);
});

it('終えていない回は、1日のごほうびの回数に数えない', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    startCatchPlay();
    startCatchPlay();
    startCatchPlay();

    $this->getJson('/api/games/catch')->assertJsonPath('rewarded_plays_left', 3);
});

it('日付をまたいで終えた回は、終えた日の回として数える', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $this->travelTo(Carbon::parse('2026-09-29 14:59:00', 'UTC')); // 日本時間 9/29 23:59
    $play = startCatchPlay();

    $this->travelTo(Carbon::parse('2026-09-29 15:01:00', 'UTC')); // 日本時間 9/30 0:01
    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true])])->assertOk();

    expect(ProfileGamePlay::query()->sole()->played_on->toDateString())->toBe('2026-09-30');
    $this->getJson('/api/games/catch')->assertJsonPath('rewarded_plays_left', 2);
});

it('自己ベスト: 初めての回と超えた回は new_best。下回った回は前のベストのまま', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 3);

    $first = startCatchPlay();
    $this->postJson(finishCatchUrl($first), ['answers' => catchAnswers($first, [true, true, true])])
        ->assertJsonPath('score', 35)->assertJsonPath('best_score', 35)->assertJsonPath('new_best', true);

    $second = startCatchPlay();
    $this->postJson(finishCatchUrl($second), ['answers' => catchAnswers($second, [true, false, false])])
        ->assertJsonPath('score', 10)->assertJsonPath('best_score', 35)->assertJsonPath('new_best', false);
});

it('終えた回をもう一度終えると409(ごほうびも記録も二重にならない)。ほかのプロフィールの回は404', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $play = startCatchPlay();
    $answers = catchAnswers($play, [true]);

    $this->postJson(finishCatchUrl($play), ['answers' => $answers])->assertOk();
    $this->postJson(finishCatchUrl($play), ['answers' => $answers])->assertStatus(409);

    expect($profile->currencyLedger()->where('reason', 'game_catch')->count())->toBe(2) // 1回ぶん(経験値と学習ポイントの2行)
        ->and(ProfileGamePlay::query()->sole()->answered_count)->toBe(1);

    $other = createFamilyMember($profile)->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => []]);
    $this->postJson("/api/games/catch/plays/{$other->id}/finish", ['answers' => []])->assertNotFound();
});

it('出していない問題・同じ問題を2回・ほかの問題の選択肢・ない選択肢・多すぎる答えは422で、何も残さない', function () {
    $profile = createActiveProfile();
    $questions = prepareCatchQuestions($profile, 3);
    config(['games.catch.question_count' => 2]);
    $play = startCatchPlay();
    $dealt = array_column($play['questions'], 'id');
    $notDealt = collect($questions)->first(fn ($question) => ! in_array($question->id, $dealt, true));
    $notDealtAnswer = ['question_id' => $notDealt->id, 'choice_id' => $notDealt->choices()->value('id')];
    [$a, $b] = catchAnswers($play, [true, true]);

    foreach ([
        [$notDealtAnswer],                                                    // 出していない問題
        [$a, $a],                                                             // 同じ問題を2回
        [['question_id' => $a['question_id'], 'choice_id' => $b['choice_id']]], // ほかの問題の選択肢
        [['question_id' => $a['question_id'], 'choice_id' => 999999]],         // ない選択肢
        [$a, $b, $notDealtAnswer],                                            // 出した問題の数より多い
    ] as $answers) {
        $this->postJson(finishCatchUrl($play), ['answers' => $answers])->assertStatus(422);
    }
    $this->postJson(finishCatchUrl($play), [])->assertStatus(422)->assertJsonValidationErrors('answers');

    expect(ProfileGamePlay::query()->sole()->finished_at)->toBeNull()
        ->and(ProfileQuestionMemory::query()->count())->toBe(0);
});

it('レベルが上がったら leveled_up と、終える前のレベルを返す', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1);
    $profile->update(['xp' => LevelCurve::totalXpFor(2) - 1]);
    $play = startCatchPlay();

    $this->postJson(finishCatchUrl($play), ['answers' => catchAnswers($play, [true])])
        ->assertOk()
        ->assertJsonPath('leveled_up', true)
        ->assertJsonPath('previous_level', 1)
        ->assertJsonPath('level', 2);
});
