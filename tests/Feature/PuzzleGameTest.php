<?php

use App\Support\FlagQuiz\FlagCatchPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スライドパズル(docs/design/2026-10-09-slide-puzzle-design.md 2・3-1)
|--------------------------------------------------------------------------
|
| 国旗パズル(puzzle-flag)は、国旗キャッチの問題を使う。宇宙パズル(puzzle-space)は、絵つきの問題がなければ遊べない。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/9 12:00
    config(['games.puzzle_space.catalog' => ['released_on' => null, 'season' => null]]);
});

function preparePuzzleFlag(): void
{
    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));
}

/** 始めて、全部の問題に答える @return array{0: array, 1: list<array{question_id: int, choice_id: int}>} */
function startPuzzle($test, string $path = 'puzzle-flag', string $difficulty = '初級', bool $allCorrect = true): array
{
    $start = $test->postJson("/api/games/{$path}/plays", ['difficulty' => $difficulty])->assertOk()->json();
    $answers = collect($start['questions'])->map(fn (array $question) => [
        'question_id' => $question['id'],
        'choice_id' => $allCorrect
            ? $question['correct_choice_id']
            : collect($question['choices'])->firstWhere('id', '!=', $question['correct_choice_id'])['id'],
    ])->all();

    return [$start, $answers];
}

it('難しさごとの盤の大きさ・使える問題の数・自己ベストの時間・ごほうびの残りを返す', function () {
    $profile = createActiveProfile();
    preparePuzzleFlag();
    $profile->gamePlays()->create(['game' => 'puzzle_flag', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-09', 'score' => 90, 'elapsed_ms' => 61000]);
    $profile->gamePlays()->create(['game' => 'puzzle_flag', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-08', 'score' => 50, 'elapsed_ms' => 45000]);

    $this->getJson('/api/games/puzzle-flag')
        ->assertOk()
        ->assertJsonPath('difficulties.0', ['difficulty' => '初級', 'lanes' => 4, 'available' => 6, 'best_score' => 90, 'grid' => [2, 2], 'best_ms' => 45000])
        ->assertJsonPath('difficulties.1.grid', [3, 2])
        ->assertJsonPath('difficulties.1.best_ms', null)
        ->assertJsonPath('difficulties.2.grid', [3, 3])
        ->assertJsonPath('rewarded_plays_left', 2);
});

it('始めると、3問・4つの選択肢・盤の大きさ・正解の国旗の絵を返す', function () {
    createActiveProfile();
    preparePuzzleFlag();

    $response = $this->postJson('/api/games/puzzle-flag/plays', ['difficulty' => '中級'])
        ->assertOk()
        ->assertJsonPath('grid', [3, 2])
        ->assertJsonCount(3, 'questions');

    foreach ($response->json('questions') as $question) {
        $correct = collect($question['choices'])->firstWhere('id', $question['correct_choice_id']);
        expect($question['choices'])->toHaveCount(4)
            ->and($correct['image'])->toStartWith('/flag/');
    }
    $this->assertDatabaseHas('profile_game_plays', ['game' => 'puzzle_flag', 'difficulty' => '中級']);
});

it('終えると、時間と自己ベストを返して保存する。遅い回では、自己ベストは変わらない', function () {
    $profile = createActiveProfile();
    preparePuzzleFlag();

    [$start, $answers] = startPuzzle($this);
    $this->postJson("/api/games/puzzle-flag/plays/{$start['play_id']}/finish", ['answers' => $answers, 'elapsed_ms' => 52000])
        ->assertOk()
        ->assertJsonPath('elapsed_ms', 52000)
        ->assertJsonPath('best_ms', 52000)
        ->assertJsonPath('new_best_time', true)
        ->assertJsonPath('reward', ['xp' => 30, 'point' => 30]);

    [$start, $answers] = startPuzzle($this);
    $this->postJson("/api/games/puzzle-flag/plays/{$start['play_id']}/finish", ['answers' => $answers, 'elapsed_ms' => 70000])
        ->assertOk()
        ->assertJsonPath('best_ms', 52000)
        ->assertJsonPath('new_best_time', false);

    expect($profile->gamePlays()->where('game', 'puzzle_flag')->whereNotNull('finished_at')->pluck('elapsed_ms')->sort()->values()->all())->toBe([52000, 70000]);
});

it('時間を送らなくても終えられる(時間なしの回は自己ベストにならない)。おかしな時間は断る', function () {
    createActiveProfile();
    preparePuzzleFlag();

    [$start, $answers] = startPuzzle($this);
    $this->postJson("/api/games/puzzle-flag/plays/{$start['play_id']}/finish", ['answers' => $answers, 'elapsed_ms' => -5])->assertUnprocessable();
    $this->postJson("/api/games/puzzle-flag/plays/{$start['play_id']}/finish", ['answers' => $answers, 'elapsed_ms' => 4000000])->assertUnprocessable();
    $this->postJson("/api/games/puzzle-flag/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('elapsed_ms', null)
        ->assertJsonPath('new_best_time', false);
});

it('宇宙パズルは、絵つきの問題がなければ遊べない(文字だけの宇宙の問題は使わない)', function () {
    createActiveProfile();
    prepareSpaceTrip(); // 文字の問題だけ

    $this->getJson('/api/games/puzzle-space')
        ->assertOk()
        ->assertJsonPath('difficulties.0.available', 0);
    $this->postJson('/api/games/puzzle-space/plays', ['difficulty' => '初級'])->assertUnprocessable();
});

it('出す日の前のパズルは404', function () {
    createActiveProfile();
    preparePuzzleFlag();
    config(['games.puzzle_flag.catalog' => ['released_on' => '2026-12-01', 'season' => null]]);

    $this->getJson('/api/games/puzzle-flag')->assertNotFound();
    expect(collect($this->getJson('/api/games')->json())->pluck('key')->all())->not->toContain('puzzle-flag');
});
