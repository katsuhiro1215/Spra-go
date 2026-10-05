<?php

use App\Models\ProfileGamePlay;
use App\Support\FlagQuiz\FlagCatchPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| 国旗キャッチ(docs/design/2026-10-05-flag-catch-design.md 2〜5章)
|--------------------------------------------------------------------------
|
| 小さな一覧(flagTestCatalog)で、初級6・中級16・上級22問を登録して確かめる。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-05 03:00:00', 'UTC')); // 日本時間 10/5 12:00
});

function prepareFlagCatch(): void
{
    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));
}

/** 始めて、全部の問題に答える($allCorrect が偽なら、全部まちがい) @return array{0: array, 1: list<array{question_id: int, choice_id: int}>} */
function startFlagCatch($test, string $difficulty = '初級', bool $allCorrect = true): array
{
    $start = $test->postJson('/api/games/flag-catch/plays', ['difficulty' => $difficulty])->assertOk()->json();
    $answers = collect($start['questions'])->map(fn (array $question) => [
        'question_id' => $question['id'],
        'choice_id' => $allCorrect
            ? $question['correct_choice_id']
            : collect($question['choices'])->firstWhere('id', '!=', $question['correct_choice_id'])['id'],
    ])->all();

    return [$start, $answers];
}

it('難しさごとの列の数・使える問題の数・自己ベストと、今日のごほうびの残りを、英語とは別に返す。鍵は関係ない', function () {
    $profile = createActiveProfile(); // どの国にも着いていない
    prepareFlagCatch();
    $profile->gamePlays()->create(['game' => 'flag_catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-05', 'score' => 70]);
    $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-05', 'score' => 140]);

    $this->getJson('/api/games/flag-catch')
        ->assertOk()
        ->assertJsonPath('category_id', null)
        ->assertJsonPath('difficulties.0', ['difficulty' => '初級', 'lanes' => 2, 'available' => 6, 'best_score' => 70])
        ->assertJsonPath('difficulties.1', ['difficulty' => '中級', 'lanes' => 3, 'available' => 16, 'best_score' => null])
        ->assertJsonPath('difficulties.2', ['difficulty' => '上級', 'lanes' => 4, 'available' => 22, 'best_score' => null])
        ->assertJsonPath('rewarded_plays_left', 2);

    $this->getJson('/api/games/catch')->assertOk()->assertJsonPath('rewarded_plays_left', 2); // 英語は英語の1回を数える
});

it('始めると、列の数の選択肢(国旗の絵つき)と正解のidを返し、遊んだ回が flag_catch で残る', function () {
    createActiveProfile();
    prepareFlagCatch();

    $response = $this->postJson('/api/games/flag-catch/plays', ['difficulty' => '中級'])
        ->assertOk()
        ->assertJsonPath('lanes', 3)
        ->assertJsonPath('fall_ms', 6000)
        ->assertJsonCount(10, 'questions');

    foreach ($response->json('questions') as $question) {
        expect($question['prompt'])->toMatch('/^「.+」の国旗は？$/');
        expect($question['choices'])->toHaveCount(3);
        expect(collect($question['choices'])->pluck('id'))->toContain($question['correct_choice_id']);
        foreach ($question['choices'] as $choice) {
            expect($choice['image'])->toStartWith('/flag/');
        }
    }

    $play = ProfileGamePlay::query()->firstOrFail();
    expect([$play->game, $play->difficulty])->toBe(['flag_catch', '中級']);
    expect($play->question_ids)->toBe(collect($response->json('questions'))->pluck('id')->all());
});

it('使える問題が10問より少なければ、ある分だけ出す(初級は6問)。問題がなければ422', function () {
    createActiveProfile();

    $this->postJson('/api/games/flag-catch/plays', ['difficulty' => '初級'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'この難しさの問題はまだないよ');

    prepareFlagCatch();
    $this->postJson('/api/games/flag-catch/plays', ['difficulty' => '初級'])->assertOk()->assertJsonCount(6, 'questions');
});

it('国旗キャッチ専用でない問題(英語など)は出さない', function () {
    $profile = createActiveProfile();
    prepareFlagCatch();
    prepareCatchQuestions($profile, 3); // 英語の問題

    $ids = collect($this->postJson('/api/games/flag-catch/plays', ['difficulty' => '初級'])->assertOk()->json('questions'))->pluck('id');

    expect(\App\Models\Question::whereIn('id', $ids)->whereNull('meta->catch_only')->count())->toBe(0);
});

it('採点し直して、正解の数・点数を返し、ごほうびは国旗キャッチ専用の理由で記録する。覚え具合にも書く', function () {
    $profile = createActiveProfile();
    prepareFlagCatch();
    [$start, $answers] = startFlagCatch($this, '初級');

    $this->postJson("/api/games/flag-catch/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('correct_count', 6)
        ->assertJsonPath('score', 80) // 10×6 + 5×4(コンボ3以上の正解)
        ->assertJsonPath('best_combo', 6)
        ->assertJsonPath('new_best', true)
        ->assertJsonPath('reward', ['xp' => 18, 'point' => 18])
        ->assertJsonPath('rewarded_plays_left', 2);

    expect(DB::table('profile_currency_ledger')->where('user_profile_id', $profile->id)->where('reason', 'game_flag_catch')->count())->toBe(2);
    expect(DB::table('profile_currency_ledger')->where('reason', 'game_catch')->count())->toBe(0);
    expect(DB::table('profile_question_memories')->where('user_profile_id', $profile->id)->count())->toBe(6);
});

it('ごほうびは1日3回まで。国旗キャッチの回数は、英語の回数に影響しない', function () {
    createActiveProfile();
    prepareFlagCatch();

    foreach ([true, true, true, true] as $_) {
        [$start, $answers] = startFlagCatch($this, '初級');
        $last = $this->postJson("/api/games/flag-catch/plays/{$start['play_id']}/finish", ['answers' => $answers])->assertOk();
    }

    expect($last->json('reward'))->toBeNull(); // 4回目
    $this->getJson('/api/games/flag-catch')->assertJsonPath('rewarded_plays_left', 0);
    $this->getJson('/api/games/catch')->assertJsonPath('rewarded_plays_left', 3);
});

it('自己ベストは、ゲームごとに別。英語のベストは国旗キャッチに出ない', function () {
    $profile = createActiveProfile();
    prepareFlagCatch();
    $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-04', 'score' => 140]);
    [$start, $answers] = startFlagCatch($this, '初級');

    $this->postJson("/api/games/flag-catch/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('new_best', true)
        ->assertJsonPath('best_score', 80);
});

it('別のゲームの回は終えられない(404)', function () {
    $profile = createActiveProfile();
    $english = $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => []]);
    $flag = $profile->gamePlays()->create(['game' => 'flag_catch', 'difficulty' => '初級', 'question_ids' => []]);

    $this->postJson("/api/games/flag-catch/plays/{$english->id}/finish", ['answers' => []])->assertStatus(404);
    $this->postJson("/api/games/catch/plays/{$flag->id}/finish", ['answers' => []])->assertStatus(404);
    $this->postJson("/api/games/flag-catch/plays/{$flag->id}/finish", ['answers' => []])->assertOk();
});

it('難しさが正しくなければ422', function () {
    createActiveProfile();

    $this->postJson('/api/games/flag-catch/plays', ['difficulty' => '超級'])->assertStatus(422);
    $this->postJson('/api/games/flag-catch/plays', [])->assertStatus(422);
});

it('国旗キャッチの窓口は、ログインしていないと401', function () {
    $this->getJson('/api/games/flag-catch')->assertStatus(401);
});
