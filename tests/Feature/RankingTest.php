<?php

use App\Models\User;
use App\Models\UserProfile;
use App\Models\UserSchema;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| ミニゲームのランキング(docs/design/2026-10-13-ranking-design.md)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-14 03:00:00', 'UTC')); // 日本時間 水曜 12:00。今週は 10/12(月)〜10/18(日)
    config(['games.puzzle_space.catalog' => ['released_on' => null, 'season' => null]]);
});

/** 終えた回を1つ作る */
function rankPlay(UserProfile $profile, int $score, string $playedOn = '2026-10-14', string $game = 'catch', string $difficulty = '初級', array $extra = []): void
{
    $profile->gamePlays()->create($extra + [
        'game' => $game, 'difficulty' => $difficulty, 'question_ids' => [],
        'finished_at' => now(), 'played_on' => $playedOn, 'score' => $score,
    ]);
}

/** 別の家族のプレイヤー。$public でみんなのランキングに出す */
function rankStranger(string $name, bool $public): UserProfile
{
    $schema = User::factory()->create()->schema()->create(['name' => 'よその家族', 'ranking_public' => $public]);

    return $schema->profiles()->create(['name' => $name, 'avatar' => 'avatar-2']);
}

function rankBoard($test, string $scope, string $path = 'catch', string $difficulty = '初級', string $period = 'week')
{
    return $test->getJson("/api/games/{$path}/ranking?".http_build_query(['scope' => $scope, 'difficulty' => $difficulty, 'period' => $period]));
}

it('家族: 点数の高い順に並べ、ほかの家族・ほかの級・ほかのゲームは混ざらない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    rankPlay($me, 50);
    rankPlay($me, 80);
    rankPlay($sister, 120);
    rankPlay($sister, 10, difficulty: '中級');
    rankPlay($sister, 999, game: 'flag_catch');
    rankPlay(rankStranger('よその子', true), 500);

    $rows = rankBoard($this, 'family')->assertOk()->json('rows');

    expect(array_column($rows, 'rank'))->toBe([1, 2])
        ->and(array_column($rows, 'name'))->toBe(['いもうと', 'テストプレイヤー'])
        ->and(array_column($rows, 'value'))->toBe([120, 80])
        ->and(array_column($rows, 'is_me'))->toBe([false, true]);
});

it('家族: 記録のない人は載らず、だれも遊んでいなければ空', function () {
    createActiveProfile();

    rankBoard($this, 'family')->assertOk()->assertJsonPath('rows', [])->assertJsonPath('me', null);
});

it('パズルは短い時間の順。サーバーの時間と合うと確かめた回だけが載る', function () {
    $me = createActiveProfile();
    $brother = createFamilyMember($me, 'おにいちゃん');
    rankPlay($me, 90, game: 'puzzle_flag', extra: ['elapsed_ms' => 61000, 'time_verified' => true]);
    rankPlay($me, 90, game: 'puzzle_flag', extra: ['elapsed_ms' => 45000, 'time_verified' => true]);
    rankPlay($brother, 90, game: 'puzzle_flag', extra: ['elapsed_ms' => 3000, 'time_verified' => false]);

    $rows = rankBoard($this, 'family', 'puzzle-flag')->assertOk()->json('rows');

    expect(array_column($rows, 'name'))->toBe(['テストプレイヤー'])
        ->and($rows[0]['value'])->toBe(45000);
});

it('今週は月曜0時(日本時間)から。ずっとは、それより前も数える', function () {
    $me = createActiveProfile();
    rankPlay($me, 70, '2026-10-11'); // 日曜(先週)
    rankPlay($me, 30, '2026-10-12'); // 月曜(今週)

    expect(rankBoard($this, 'family')->json('rows.0.value'))->toBe(30)
        ->and(rankBoard($this, 'family', period: 'all')->json('rows.0.value'))->toBe(70);
});

it('同じ値は同じ順位で、先に出したほうが上。次の順位は詰めない', function () {
    $me = createActiveProfile();
    $a = createFamilyMember($me, 'A');
    $b = createFamilyMember($me, 'B');
    $this->travelTo(Carbon::parse('2026-10-14 03:00:00', 'UTC'));
    rankPlay($a, 100);
    $this->travelTo(Carbon::parse('2026-10-14 03:05:00', 'UTC'));
    rankPlay($me, 100);
    rankPlay($b, 40);

    $rows = rankBoard($this, 'family')->json('rows');

    expect(array_column($rows, 'name'))->toBe(['A', 'テストプレイヤー', 'B'])
        ->and(array_column($rows, 'rank'))->toBe([1, 1, 3]);
});

it('10位より下でも、自分の順位が返る', function () {
    $me = createActiveProfile();
    rankPlay($me, 1);
    foreach (range(1, 11) as $i) {
        rankPlay(createFamilyMember($me, "子{$i}"), 100 + $i);
    }

    $response = rankBoard($this, 'family')->assertOk();

    expect($response->json('rows'))->toHaveCount(10)
        ->and($response->json('me'))->toBe(['rank' => 12, 'value' => 1]);
});

it('みんな: 保護者がOnにした家族だけが載る。名前・番号・レベルは出さない', function () {
    $me = createActiveProfile();
    UserSchema::findOrFail($me->user_schema_id)->update(['ranking_public' => true]);
    rankPlay($me, 40);
    rankPlay(rankStranger('たろう', true), 90);
    rankPlay(rankStranger('Offの子', false), 500);

    $response = rankBoard($this, 'public')->assertOk();
    $rows = $response->json('rows');

    expect($rows)->toHaveCount(2)
        ->and($rows[0]['value'])->toBe(90)
        ->and($rows[0]['avatar'])->toBe('avatar-2')
        ->and(array_keys($rows[0]))->toEqualCanonicalizing(['rank', 'nickname', 'avatar', 'value', 'is_me'])
        ->and($rows[0]['nickname'])->not->toBe('たろう')
        ->and($rows[1]['is_me'])->toBeTrue()
        ->and(json_encode($response->json()))->not->toContain('たろう')->not->toContain('Offの子');
});

it('みんな: 自分の家族がOffなら見られない。ずっと(期間)はみんなにはない', function () {
    $me = createActiveProfile();

    rankBoard($this, 'public')->assertForbidden();

    UserSchema::findOrFail($me->user_schema_id)->update(['ranking_public' => true]);
    rankBoard($this, 'public', period: 'all')->assertUnprocessable();
    rankBoard($this, 'public')->assertOk();
});

it('Offに戻すと、すぐにみんなのランキングから消える', function () {
    $me = createActiveProfile();
    $schema = UserSchema::findOrFail($me->user_schema_id);
    $schema->update(['ranking_public' => true]);
    $other = rankStranger('よその子', true);
    rankPlay($other, 50);
    rankPlay($me, 10);

    expect(rankBoard($this, 'public')->json('rows'))->toHaveCount(2);

    UserSchema::findOrFail($other->user_schema_id)->update(['ranking_public' => false]);

    expect(rankBoard($this, 'public')->json('rows'))->toHaveCount(1);
});

it('知らない級・ゲーム・範囲は受け付けない', function () {
    createActiveProfile();

    rankBoard($this, 'family', difficulty: '超級')->assertUnprocessable();
    rankBoard($this, 'world')->assertUnprocessable();
    $this->getJson('/api/games/nothing/ranking?scope=family&difficulty=初級&period=week')->assertNotFound();
});

it('設定: Onにするときはパスワードが要り、違えば切り替わらない。Offはパスワードなし', function () {
    $me = createActiveProfile();
    $user = User::findOrFail(UserSchema::findOrFail($me->user_schema_id)->user_id);
    $user->update(['password' => 'secret-pass-1']);
    $this->actingAs($user->fresh())->withHeader('Referer', 'http://localhost')->withSession(['active_profile_id' => $me->id]);

    $this->getJson('/api/ranking/settings')->assertOk()->assertJsonPath('public', false);

    $this->putJson('/api/ranking/settings', ['public' => true, 'password' => 'wrong'])->assertUnprocessable();
    $this->putJson('/api/ranking/settings', ['public' => true])->assertUnprocessable();
    expect(UserSchema::find($me->user_schema_id)->ranking_public)->toBeFalse();

    $this->putJson('/api/ranking/settings', ['public' => true, 'password' => 'secret-pass-1'])->assertOk()->assertJsonPath('public', true);
    expect(UserSchema::find($me->user_schema_id)->ranking_public)->toBeTrue();

    $this->putJson('/api/ranking/settings', ['public' => false])->assertOk()->assertJsonPath('public', false);
    expect(UserSchema::find($me->user_schema_id)->ranking_public)->toBeFalse();
});

it('ニックネームは番号から決まり(同じ人は同じ)、パスワードつきで付け直せる', function () {
    $me = createActiveProfile();
    $user = User::findOrFail(UserSchema::findOrFail($me->user_schema_id)->user_id);
    $user->update(['password' => 'secret-pass-1']);
    $this->actingAs($user->fresh())->withHeader('Referer', 'http://localhost')->withSession(['active_profile_id' => $me->id]);

    $first = $this->getJson('/api/ranking/settings')->json('nickname');
    expect($first)->toMatch('/^\S+ \S+$/u')->and($this->getJson('/api/ranking/settings')->json('nickname'))->toBe($first);

    $this->postJson('/api/ranking/nickname', ['password' => 'wrong'])->assertUnprocessable();
    $new = $this->postJson('/api/ranking/nickname', ['password' => 'secret-pass-1'])->assertOk()->json('nickname');

    expect($new)->not->toBe($first)->and($this->getJson('/api/ranking/settings')->json('nickname'))->toBe($new);
});

/** 始めた回を、$seconds 秒後に、パズルの時間 $elapsedMs で終える */
function finishPuzzleAfter($test, int $seconds, int $elapsedMs): array
{
    preparePuzzleFlag();
    $start = $test->postJson('/api/games/puzzle-flag/plays', ['difficulty' => '初級'])->assertOk()->json();
    $answers = collect($start['questions'])->map(fn (array $q) => ['question_id' => $q['id'], 'choice_id' => $q['correct_choice_id']])->all();
    $test->travel($seconds)->seconds();

    return $test->postJson("/api/games/puzzle-flag/plays/{$start['play_id']}/finish", ['answers' => $answers, 'elapsed_ms' => $elapsedMs])->assertOk()->json();
}

it('パズルの時間: 始めてから終えるまでの時間に収まっていれば、ランキングに載る', function () {
    $me = createActiveProfile();

    finishPuzzleAfter($this, 70, 52000);

    expect($me->gamePlays()->first()->time_verified)->toBeTrue()
        ->and(rankBoard($this, 'family', 'puzzle-flag')->json('rows.0.value'))->toBe(52000);
});

it('パズルの時間: サーバーが測った時間より長い・短すぎる記録は載らない(遊んだ記録はそのまま)', function () {
    $me = createActiveProfile();

    $long = finishPuzzleAfter($this, 5, 52000); // 5秒しか経っていないのに52秒
    expect($long['elapsed_ms'])->toBe(52000);

    $short = finishPuzzleAfter($this, 70, 1000); // 12ピースを1秒
    expect($short['elapsed_ms'])->toBe(1000)
        ->and($me->gamePlays()->pluck('time_verified')->all())->toBe([false, false])
        ->and(rankBoard($this, 'family', 'puzzle-flag')->json('rows'))->toBe([]);
});

it('終えた回の返事に、家族の今週の順位が付く。みんなは、保護者がOnのときだけ', function () {
    $me = createActiveProfile();
    prepareCatchQuestions($me, 3);
    $start = $this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->assertOk()->json();
    $answers = collect($start['questions'])->map(fn (array $q) => ['question_id' => $q['id'], 'choice_id' => $q['correct_choice_id']])->all();

    $done = $this->postJson("/api/games/catch/plays/{$start['play_id']}/finish", ['answers' => $answers])->assertOk()->json();

    expect($done['rank_family'])->toBe(1)->and($done)->not->toHaveKey('rank_public');

    UserSchema::findOrFail($me->user_schema_id)->update(['ranking_public' => true]);
    $start = $this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->assertOk()->json();
    $done = $this->postJson("/api/games/catch/plays/{$start['play_id']}/finish", ['answers' => $answers])->assertOk()->json();
    expect($done['rank_public'])->toBe(1);
});

it('パスワードの確認は、1分に6回まで(総当たりで保護者のパスワードを探せない)', function () {
    $me = createActiveProfile();
    $user = User::findOrFail(UserSchema::findOrFail($me->user_schema_id)->user_id);
    $user->update(['password' => 'secret-pass-1']);
    $this->actingAs($user->fresh())->withHeader('Referer', 'http://localhost')->withSession(['active_profile_id' => $me->id]);

    foreach (range(1, 6) as $_) {
        $this->putJson('/api/ranking/settings', ['public' => true, 'password' => 'wrong'])->assertUnprocessable();
    }

    $this->putJson('/api/ranking/settings', ['public' => true, 'password' => 'secret-pass-1'])->assertStatus(429);
    $this->postJson('/api/ranking/nickname', ['password' => 'secret-pass-1'])->assertStatus(429);
});

it('パスワードのないアカウント(Googleだけで登録)は、オンにもニックネームの変更もできない。オフにはできる', function () {
    $me = createActiveProfile();
    $schema = UserSchema::findOrFail($me->user_schema_id);
    $user = User::findOrFail($schema->user_id);
    $user->forceFill(['password' => null])->save();
    $this->actingAs($user->fresh())->withHeader('Referer', 'http://localhost')->withSession(['active_profile_id' => $me->id]);

    $this->putJson('/api/ranking/settings', ['public' => true])->assertUnprocessable();
    $this->postJson('/api/ranking/nickname', [])->assertUnprocessable();
    expect($schema->fresh()->ranking_public)->toBeFalse();

    $schema->update(['ranking_public' => true]);
    $this->putJson('/api/ranking/settings', ['public' => false])->assertOk()->assertJsonPath('public', false);
});
