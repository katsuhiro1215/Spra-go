<?php

use App\Models\ProfileGamePlay;
use App\Support\CatchGame;
use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\Space\SpaceQuizPlanner;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| うちゅう旅行(docs/design/2026-10-09-space-trip-design.md 2〜6章)
|--------------------------------------------------------------------------
|
| 宇宙の問題を、初級12・中級10・上級10問で登録して確かめる(文字の問題だけ)。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/9 12:00
});

function prepareSpaceTrip(): void
{
    $questions = [];
    foreach (['初級' => 12, '中級' => 10, '上級' => 10] as $level => $count) {
        foreach (range(1, $count) as $number) {
            $questions[] = [
                'level' => $level, 'number' => $number, 'theme' => 'テスト', 'kind' => 'text',
                'prompt' => "{$level}の問題{$number}？", 'correct' => '太陽', 'wrong' => ['月', '星', '雲'], 'explanation' => "解説{$number}",
            ];
        }
    }
    FlagQuizWriter::writeTree(SpaceQuizPlanner::ROOT_NAME, SpaceQuizPlanner::plan($questions, [], [])['nodes']);
}

/** 始めて、全部の問題に答える。$stars は、答えごとの星の数(省略なら星を送らない) */
function playSpaceTrip($test, string $difficulty = '初級', bool $allCorrect = true, ?int $stars = null): array
{
    $start = $test->postJson('/api/games/space-trip/plays', ['difficulty' => $difficulty])->assertOk()->json();
    $answers = collect($start['questions'])->map(fn (array $question) => [
        'question_id' => $question['id'],
        'choice_id' => $allCorrect
            ? $question['correct_choice_id']
            : collect($question['choices'])->firstWhere('id', '!=', $question['correct_choice_id'])['id'],
    ] + ($stars !== null ? ['stars' => $stars] : []))->all();

    return [$start, $answers];
}

it('難しさごとの列の数・使える問題の数・自己ベストと、今日のごほうびの残りを返す。宇宙の子のカテゴリーのステージの問題も数える', function () {
    $profile = createActiveProfile();
    prepareSpaceTrip();
    $profile->gamePlays()->create(['game' => 'space_trip', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-10-09', 'score' => 90]);

    $this->getJson('/api/games/space-trip')
        ->assertOk()
        ->assertJsonPath('difficulties.0', ['difficulty' => '初級', 'lanes' => 2, 'available' => 12, 'best_score' => 90])
        ->assertJsonPath('difficulties.1', ['difficulty' => '中級', 'lanes' => 3, 'available' => 10, 'best_score' => null])
        ->assertJsonPath('difficulties.2', ['difficulty' => '上級', 'lanes' => 4, 'available' => 10, 'best_score' => null])
        ->assertJsonPath('rewarded_plays_left', 2);
});

it('始めると、10問・列の数の選択肢・隕石の段の数・正解のidを返し、遊んだ回が space_trip で残る', function () {
    $profile = createActiveProfile();
    prepareSpaceTrip();

    $response = $this->postJson('/api/games/space-trip/plays', ['difficulty' => '中級'])
        ->assertOk()
        ->assertJsonPath('lanes', 3)
        ->assertJsonPath('fall_ms', 6000)
        ->assertJsonPath('obstacle_rows', 3)
        ->assertJsonCount(10, 'questions');

    foreach ($response->json('questions') as $question) {
        expect($question['choices'])->toHaveCount(3)
            ->and(collect($question['choices'])->pluck('id')->all())->toContain($question['correct_choice_id']);
    }
    expect(ProfileGamePlay::where('game', 'space_trip')->count())->toBe(1)
        ->and($profile->gamePlays()->where('game', 'space_trip')->first()->difficulty)->toBe('中級');
});

it('宇宙の問題がまだないときは、始められない', function () {
    createActiveProfile();

    $this->postJson('/api/games/space-trip/plays', ['difficulty' => '初級'])
        ->assertStatus(422)
        ->assertJsonPath('message', config('games.space_trip.messages.empty'));
});

it('星を送らない回は、今までと同じ点数。全問正解で140点', function () {
    createActiveProfile();
    prepareSpaceTrip();
    [$start, $answers] = playSpaceTrip($this);

    $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('score', 140)
        ->assertJsonPath('correct_count', 10)
        ->assertJsonPath('stars', 0)
        ->assertJsonPath('destination', 'pluto');
});

it('星の数が点数に足され、記録に星の合計が残る(全問正解・各問3つで 140+30)', function () {
    $profile = createActiveProfile();
    prepareSpaceTrip();
    [$start, $answers] = playSpaceTrip($this, '初級', true, 3);

    $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('score', 170)
        ->assertJsonPath('stars', 30);

    expect($profile->gamePlays()->where('game', 'space_trip')->first()->stars)->toBe(30);
});

it('まちがえた問題の星も、点数に入る', function () {
    createActiveProfile();
    prepareSpaceTrip();
    [$start, $answers] = playSpaceTrip($this, '初級', false, 2);

    $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('score', 20)
        ->assertJsonPath('correct_count', 0);
});

it('星が範囲外(負・4以上・数でない)なら、422で、記録も残らない', function (mixed $stars) {
    createActiveProfile();
    prepareSpaceTrip();
    [$start, $answers] = playSpaceTrip($this, '初級', true, 1);
    $answers[0]['stars'] = $stars;

    $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])->assertStatus(422);

    expect(ProfileGamePlay::where('game', 'space_trip')->whereNotNull('finished_at')->count())->toBe(0);
})->with(['負' => [-1], '4' => [4], '文字' => ['abc']]);

it('到着する星は、正解の数(10問に換算)で決まる', function (int $correct, string $destination) {
    createActiveProfile();
    prepareSpaceTrip();
    [$start, $answers] = playSpaceTrip($this, '初級', false);
    foreach (array_slice(array_keys($answers), 0, $correct) as $index) {
        $answers[$index]['choice_id'] = $start['questions'][$index]['correct_choice_id'];
    }

    $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('destination', $destination);
})->with([
    '0問' => [0, 'moon'], '2問' => [2, 'moon'], '3問' => [3, 'mars'], '4問' => [4, 'mars'], '5問' => [5, 'jupiter'],
    '6問' => [6, 'jupiter'], '7問' => [7, 'saturn'], '8問' => [8, 'saturn'], '9問' => [9, 'neptune'], '10問' => [10, 'pluto'],
]);

it('到着する星の換算: 出した問題が10問より少ないときは、10問に換算する', function () {
    expect(CatchGame::spaceDestination(8, 8))->toBe('pluto')
        ->and(CatchGame::spaceDestination(4, 8))->toBe('jupiter')
        ->and(CatchGame::spaceDestination(0, 0))->toBe('moon');
});

it('ごほうびは、英語・国旗とは別に、1日3回まで。正解1問あたりは難しさで決まる', function () {
    $profile = createActiveProfile();
    prepareSpaceTrip();

    foreach (range(1, 3) as $i) {
        [$start, $answers] = playSpaceTrip($this, '中級');
        $response = $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])->assertOk();
        expect($response->json('reward'))->toBe(['xp' => 40, 'point' => 30]);
    }
    [$start, $answers] = playSpaceTrip($this, '中級');
    $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('reward', null);

    $this->getJson('/api/games/catch')->assertOk()->assertJsonPath('rewarded_plays_left', 3);
    expect($profile->fresh()->coins)->toBe(0);
});

it('英語・国旗の点数と返事の形は変わらない(星・到着する星が出ない)', function () {
    expect(CatchGame::score([true, true, true]))->toBe(['score' => 35, 'best_combo' => 3])
        ->and(CatchGame::score([true, true, true], [1, 2, 3]))->toBe(['score' => 41, 'best_combo' => 3]);
});

it('今週のゲームは、ごほうびが1.5倍(切り上げ)。ほかのゲームは1倍', function () {
    createActiveProfile();
    prepareSpaceTrip();
    config(['games.rollout.featured_multiplier' => 1.5]);
    config(['games.space_trip.catalog' => ['released_on' => null, 'season' => ['from' => '10-01', 'until' => '10-31']]]); // 季節のゲームが今週のゲーム

    [$start, $answers] = playSpaceTrip($this, '中級');
    $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])
        ->assertOk()
        ->assertJsonPath('reward', ['xp' => 60, 'point' => 45]);

    $this->getJson('/api/games')->assertOk()->assertJsonPath('0.featured', false);
});
