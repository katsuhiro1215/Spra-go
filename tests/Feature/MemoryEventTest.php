<?php

use App\Models\ProfileQuestionMemory;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 覚え具合の一言(docs/design/2026-10-09-review-variety-design.md 5章)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/9 12:00
});

/** 覚え具合を作る。$level・$dueOn・$wrongOn・$lastOn は、答える前の状態 */
function memoryFor($profile, int $questionId, array $attributes): void
{
    ProfileQuestionMemory::create(['user_profile_id' => $profile->id, 'question_id' => $questionId] + $attributes);
}

it('初めて会う問題は、正解しても一言なし', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();

    expect(QuestionMemory::record($profile, $question->id, true))->toBeNull();
});

it('まちがいは、一言なし', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    memoryFor($profile, $question->id, ['level' => 2, 'due_on' => '2026-10-09', 'last_answered_on' => '2026-10-01']);

    expect(QuestionMemory::record($profile, $question->id, false))->toBeNull();
});

it('段階5で出す日に正解して「覚えた」になると mastered', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    memoryFor($profile, $question->id, ['level' => 5, 'due_on' => '2026-10-09', 'last_answered_on' => '2026-09-09']);

    expect(QuestionMemory::record($profile, $question->id, true))->toBe(['event' => 'mastered', 'days' => null]);
});

it('前の答えがまちがいで、今回は正解なら recovered(mastered の次に強い)', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    memoryFor($profile, $question->id, ['level' => 1, 'due_on' => '2026-10-09', 'wrong_on' => '2026-10-08', 'last_answered_on' => '2026-10-08']);

    expect(QuestionMemory::record($profile, $question->id, true))->toBe(['event' => 'recovered', 'days' => null]);
});

it('段階が上がって5になったら almost', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    memoryFor($profile, $question->id, ['level' => 4, 'due_on' => '2026-10-09', 'last_answered_on' => '2026-10-08']);

    expect(QuestionMemory::record($profile, $question->id, true))->toBe(['event' => 'almost', 'days' => null]);
});

it('3日以上あいて正解なら returned(日数つき)。2日では出ない', function () {
    $profile = createActiveProfile();
    [$a, $b] = [createQuestionWithChoices()[0], createQuestionWithChoices()[0]];
    memoryFor($profile, $a->id, ['level' => 2, 'due_on' => '2026-10-09', 'last_answered_on' => '2026-10-06']);
    memoryFor($profile, $b->id, ['level' => 2, 'due_on' => '2026-10-09', 'last_answered_on' => '2026-10-07']);

    expect(QuestionMemory::record($profile, $a->id, true))->toBe(['event' => 'returned', 'days' => 3])
        ->and(QuestionMemory::record($profile, $b->id, true))->toBeNull();
});

it('覚えた問題を正解しても、一言は出ない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    memoryFor($profile, $question->id, ['level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01']);

    expect(QuestionMemory::record($profile, $question->id, true))->toBeNull();
});

it('答えの窓口が、memory を返す。練習では出さない・記録もしない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    memoryFor($profile, $question->id, ['level' => 1, 'due_on' => '2026-10-09', 'wrong_on' => '2026-10-08', 'last_answered_on' => '2026-10-08']);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])
        ->assertOk()
        ->assertJsonPath('memory', null);
    expect(ProfileQuestionMemory::where('question_id', $question->id)->value('wrong_on'))->not->toBeNull();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('memory', ['event' => 'recovered', 'days' => null]);
});
