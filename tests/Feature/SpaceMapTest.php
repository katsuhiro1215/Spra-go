<?php

use App\Models\Question;
use App\Support\QuestionMemory;
use App\Support\SpaceCards;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 宇宙ぼうけんマップとうちゅうずかん(docs/design/2026-10-10-space-adventure-map-design.md)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-10 03:00:00', 'UTC')); // 日本時間 10/10 12:00
});

/** 星から始めて、先頭の $correct 問だけ正解して終える @return \Illuminate\Testing\TestResponse */
function playStop($test, string $stop, int $correct)
{
    $start = $test->postJson('/api/games/space-trip/plays', ['stop' => $stop])->assertOk()->json();
    $answers = collect($start['questions'])->values()->map(fn (array $question, int $i) => [
        'question_id' => $question['id'],
        'choice_id' => $i < $correct
            ? $question['correct_choice_id']
            : collect($question['choices'])->firstWhere('id', '!=', $question['correct_choice_id'])['id'],
    ])->all();

    return $test->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers]);
}

it('地図: 最初は月だけ開いている。星は9つで、順に 月 → … → 冥王星。難しさは星の順で決まる', function () {
    createActiveProfile();
    prepareSpaceTrip();

    $response = $this->getJson('/api/games/space-trip/map')->assertOk();
    $stops = collect($response->json('stops'));

    expect($stops->pluck('key')->all())->toBe(['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'])
        ->and($stops->pluck('difficulty')->all())->toBe(['初級', '初級', '初級', '中級', '中級', '中級', '上級', '上級', '上級'])
        ->and($stops->pluck('open')->all())->toBe([true, false, false, false, false, false, false, false, false])
        ->and($response->json('current'))->toBe('moon');
});

it('閉じている星・知らない星からは始められない。開いている星からは、星の難しさで始まり、回に星が残る', function () {
    $profile = createActiveProfile();
    prepareSpaceTrip();

    $this->postJson('/api/games/space-trip/plays', ['stop' => 'mercury'])->assertUnprocessable();
    $this->postJson('/api/games/space-trip/plays', ['stop' => 'nowhere'])->assertUnprocessable();
    $this->postJson('/api/games/space-trip/plays', ['stop' => 'moon'])->assertOk()->assertJsonCount(10, 'questions');

    $this->assertDatabaseHas('profile_game_plays', ['user_profile_id' => $profile->id, 'game' => 'space_trip', 'difficulty' => '初級', 'stop' => 'moon']);
});

it('6問以上の正解でクリア。次の星が開き、はじめてのクリアのボーナス(経験値30・ポイント30)が出る。星の評価は正解の数で決まる', function () {
    $profile = createActiveProfile();
    prepareSpaceTrip();

    playStop($this, 'moon', 5)->assertOk()
        ->assertJsonPath('map.stop', 'moon')->assertJsonPath('map.cleared', false)->assertJsonPath('map.stars', 0)->assertJsonPath('map.bonus', null);
    $this->getJson('/api/games/space-trip/map')->assertJsonPath('stops.1.open', false);

    $response = playStop($this, 'moon', 6)->assertOk()
        ->assertJsonPath('map.cleared', true)->assertJsonPath('map.stars', 1)->assertJsonPath('map.first_clear', true)
        ->assertJsonPath('map.unlocked', 'mercury')->assertJsonPath('map.bonus', ['xp' => 30, 'point' => 30]);
    // 1回目(正解5問 = 経験値15・ポイント15)と2回目(正解6問 = 18・18)のごほうびに、はじめてのクリアのボーナス(30・30)が1回だけ足される
    $profile->refresh();
    expect($profile->xp)->toBe(15 + 18 + 30)->and($profile->points)->toBe(15 + 18 + 30);

    $this->getJson('/api/games/space-trip/map')->assertJsonPath('stops.1.open', true)->assertJsonPath('stops.0.stars', 1)->assertJsonPath('current', 'mercury');
});

it('星の評価: 8問で2つ、10問で3つ。くり返しても、いちばんよい評価が残り、ボーナスははじめてだけ', function () {
    $profile = createActiveProfile();
    prepareSpaceTrip();

    playStop($this, 'moon', 8)->assertJsonPath('map.stars', 2)->assertJsonPath('map.best_stars', 2);
    playStop($this, 'moon', 10)->assertJsonPath('map.stars', 3)->assertJsonPath('map.best_stars', 3)->assertJsonPath('map.first_clear', false)->assertJsonPath('map.bonus', null);
    playStop($this, 'moon', 6)->assertJsonPath('map.stars', 1)->assertJsonPath('map.best_stars', 3);

    expect($profile->spaceStops()->where('stop', 'moon')->value('stars'))->toBe(3);
});

it('地図から始めない回(れんしゅう)は、星の記録に入らない', function () {
    $profile = createActiveProfile();
    prepareSpaceTrip();

    [$start, $answers] = playSpaceTrip($this, '初級');
    $this->postJson("/api/games/space-trip/plays/{$start['play_id']}/finish", ['answers' => $answers])->assertOk()->assertJsonMissingPath('map');

    expect($profile->spaceStops()->count())->toBe(0);
});

/** 宇宙の絵の問題(正解の選択肢の絵が /space/{key}.webp)を作る */
function spacePictureQuestion(string $key): Question
{
    [$question, $correct] = createQuestionWithChoices();
    $question->update(['meta' => ['flag_key' => "space:初級:{$key}"]]);
    $correct->update(['meta' => ['image' => "/space/{$key}.webp"]]);

    return $question;
}

it('ずかん: 宇宙の絵の問題に正解するとカードが開く。まちがえただけでは開かず、開いたあとにまちがえても消えない', function () {
    $profile = createActiveProfile();
    $sun = spacePictureQuestion('sun');
    $earth = spacePictureQuestion('earth');

    QuestionMemory::record($profile, $earth->id, false);
    expect(SpaceCards::keys($profile))->toBe([]);

    QuestionMemory::record($profile, $sun->id, true);
    QuestionMemory::record($profile, $sun->id, false);
    expect(SpaceCards::keys($profile))->toBe(['sun']);
});

it('ずかんの一覧: 宇宙の絵の全部が並び、開いているか・名前・絵が付く。開いていないカードは名前を出さない', function () {
    $profile = createActiveProfile();
    QuestionMemory::record($profile, spacePictureQuestion('sun')->id, true);

    $cards = collect($this->getJson('/api/space/cards')->assertOk()->json('cards'));

    $sun = $cards->firstWhere('key', 'sun');
    $earth = $cards->firstWhere('key', 'earth');
    expect($cards->count())->toBeGreaterThanOrEqual(30)
        ->and($sun)->toMatchArray(['unlocked' => true, 'name' => '太陽', 'image' => '/space/sun.webp'])
        ->and($earth)->toMatchArray(['unlocked' => false, 'name' => null]);
});

it('はじめて開いたカードは、その回の返事に入る(2度目からは入らない)', function () {
    createActiveProfile();
    prepareSpaceTrip();
    config(['games.space_trip.question_count' => 100]); // 旅の問題を全部使って、絵の問題が必ず入るようにする
    $picture = spacePictureQuestion('sun');
    \App\Models\Stage::query()->whereHas('questions')->first()->questions()->attach($picture->id, ['order' => 99]);

    $first = playStop($this, 'moon', 100)->assertOk()->json('map.new_cards');
    $second = playStop($this, 'moon', 100)->assertOk()->json('map.new_cards');

    expect($first)->toBe([['key' => 'sun', 'name' => '太陽', 'image' => '/space/sun.webp']])
        ->and($second)->toBe([]);
});
