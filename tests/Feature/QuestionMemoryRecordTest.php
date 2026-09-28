<?php

use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 答えたときの記録と、今までの記録からの引き継ぎ(docs/design/2026-09-29-spaced-review-design.md 3-3・3-5・4-4)
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

/** 回答APIと同じ行(正解は体力・XP・コイン・ポイントの4行、不正解は体力の1行)を、指定した時刻で付ける */
function ledgerAnswer(UserProfile $profile, Question $question, bool $correct, string $utc): void
{
    $types = $correct ? ['hp' => -1, 'xp' => 10, 'coin' => 5, 'point' => 10] : ['hp' => -2];
    foreach ($types as $type => $delta) {
        $row = $profile->currencyLedger()->create([
            'type' => $type,
            'delta' => $delta,
            'reason' => $correct ? 'answer_correct' : 'answer_wrong',
            'question_id' => $question->id,
        ]);
        $row->forceFill(['created_at' => Carbon::parse($utc, 'UTC')])->save();
    }
}

it('答えのAPIで答えると、覚え具合が記録される', function () {
    $profile = createActiveProfile();
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])->assertOk();

    $memory = ProfileQuestionMemory::query()->where('user_profile_id', $profile->id)->sole();
    expect([$memory->question_id, $memory->level, $memory->due_on->toDateString()])->toBe([$question->id, 1, '2026-09-30']);
});

it('練習(やり直し)の答えは記録しない', function () {
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect(ProfileQuestionMemory::query()->count())->toBe(0);
});

it('体力が0で答えられなかったときは記録しない', function () {
    $profile = createActiveProfile();
    $profile->update(['hp' => 0, 'hp_updated_at' => now()]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertStatus(409);

    expect(ProfileQuestionMemory::query()->count())->toBe(0);
});

it('今までの記録を古い順に読み直して、覚え具合を作る(日付は日本時間)', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ledgerAnswer($profile, $question, false, '2026-09-20 01:00:00'); // 9/20 まちがえた → 段階1・9/21
    ledgerAnswer($profile, $question, true, '2026-09-20 16:00:00');  // 日本時間 9/21 正解 → 段階2・9/24
    ledgerAnswer($profile, $question, true, '2026-09-22 01:00:00');  // 9/22 出す日より前 → 変わらない

    QuestionMemory::rebuildFromLedger();

    $memory = ProfileQuestionMemory::query()->sole();
    expect([$memory->level, $memory->due_on->toDateString(), $memory->last_answered_on->toDateString()])
        ->toBe([2, '2026-09-24', '2026-09-22']);
});

it('1回の正解の4行は1回と数える', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ledgerAnswer($profile, $question, true, '2026-09-20 01:00:00');

    QuestionMemory::rebuildFromLedger();

    expect(ProfileQuestionMemory::query()->sole()->level)->toBe(1);
});

it('プロフィールごとに作り、消された問題の記録は読み飛ばす', function () {
    $profile = createActiveProfile();
    $sibling = createFamilyMember($profile);
    [$kept] = createQuestionWithChoices();
    [$deleted] = createQuestionWithChoices();
    ledgerAnswer($profile, $kept, false, '2026-09-20 01:00:00');
    ledgerAnswer($sibling, $kept, true, '2026-09-20 01:00:00');
    ledgerAnswer($profile, $deleted, false, '2026-09-20 01:00:00');
    $deleted->delete(); // 記録の question_id は null になる(nullOnDelete)

    QuestionMemory::rebuildFromLedger();

    expect(ProfileQuestionMemory::query()->orderBy('user_profile_id')->pluck('user_profile_id')->all())
        ->toBe([$profile->id, $sibling->id]);
});
