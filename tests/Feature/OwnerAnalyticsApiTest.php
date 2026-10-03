<?php

use App\Models\Owner;
use App\Models\ProfilePlayDay;
use App\Models\User;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 分析のAPI(docs/design/2026-10-03-analytics-design.md 4-4)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-20 03:00:00', 'UTC')); // 日本時間 10/20
});

it('Owner以外は見られない', function () {
    $this->getJson('/api/owner/analytics')->assertStatus(401);

    $this->actingAs(User::factory()->create())->getJson('/api/owner/analytics')->assertStatus(401);
});

it('分析の7つの塊と、ご意見の件数を返す', function () {
    $owner = Owner::factory()->create();
    $profile = makePlayerAt('2026-10-15 00:00:00');
    answerAt($profile, '2026-10-19 03:00:00');
    answerAt($profile, '2026-10-20 01:00:00', false);

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/analytics?days=7')->assertOk();

    expect(array_keys($response->json()))->toBe(['days', 'summary', 'daily', 'retention', 'cohorts', 'funnel', 'dropoff', 'hard_questions', 'activities', 'feedback'])
        ->and($response->json('days'))->toBe(7)
        ->and($response->json('daily'))->toHaveCount(7)
        ->and($response->json('daily.6.date'))->toBe('2026-10-20')
        ->and($response->json('daily.6.answers'))->toBe(1)
        ->and($response->json('summary.active_today'))->toBe(1)
        ->and($response->json('feedback'))->toBe(['new' => 0, 'read' => 0, 'done' => 0]);
});

it('期間は 7・14・30・90 のどれか。それ以外は14', function (mixed $days, int $expected) {
    $owner = Owner::factory()->create();

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/analytics'.($days === null ? '' : "?days={$days}"))->assertOk();

    expect($response->json('days'))->toBe($expected)->and($response->json('daily'))->toHaveCount($expected);
})->with([[7, 7], [30, 30], [90, 90], [null, 14], [5, 14], ['abc', 14], [365, 14]]);

it('データが何も無くても、割合は null になり、壊れない', function () {
    $owner = Owner::factory()->create();

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/analytics')->assertOk();

    expect($response->json('retention.d1'))->toBe(['rate' => null, 'base' => 0])
        ->and($response->json('cohorts'))->toBe([])
        ->and($response->json('hard_questions'))->toBe([])
        ->and($response->json('daily.0.accuracy'))->toBeNull()
        ->and($response->json('funnel.0.rate'))->toBeNull();
});

it('User一覧に、登録日・プレイヤー数・最後に遊んだ日・解いた問題数・遊んだ時間を足し、今までの項目は残す', function () {
    $owner = Owner::factory()->create();
    $a = makePlayerAt('2026-10-14 15:00:00', 'A'); // 日本時間 10/15 0:00 に登録
    $schemaA = App\Models\UserSchema::findOrFail($a->user_schema_id);
    $a2 = $schemaA->profiles()->create(['name' => 'A2']);
    $quiet = makePlayerAt('2026-10-14 00:00:00', '遊んでいない');
    answerAt($a, '2026-10-16 03:00:00');
    answerAt($a2, '2026-10-18 03:00:00');
    answerAt($a2, '2026-10-18 04:00:00', false);
    ProfilePlayDay::create(['user_profile_id' => $a->id, 'played_on' => '2026-10-16', 'seconds' => 300]);
    ProfilePlayDay::create(['user_profile_id' => $a2->id, 'played_on' => '2026-10-18', 'seconds' => 360]);

    $rows = collect($this->actingAs($owner, 'owner')->getJson('/api/owner/users')->assertOk()->json())->keyBy('id');
    $userA = $rows[$schemaA->user_id];
    $userQuiet = $rows[App\Models\UserSchema::findOrFail($quiet->user_schema_id)->user_id];

    expect($userA)->toHaveKeys(['id', 'name', 'email', 'email_verified_at', 'created_at'])
        ->and($userA)->toMatchArray(['registered_on' => '2026-10-15', 'players' => 2, 'last_played_on' => '2026-10-18', 'answers' => 3, 'play_minutes' => 11])
        ->and($userQuiet)->toMatchArray(['players' => 1, 'last_played_on' => null, 'answers' => 0, 'play_minutes' => 0]);
});
