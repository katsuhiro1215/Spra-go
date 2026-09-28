<?php

use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 問題ごとの覚え具合(docs/design/2026-09-29-spaced-review-design.md 3章)
|--------------------------------------------------------------------------
|
| 段階1〜5。出す日以降に正解すると1つ上がり(間は 1→3→7→14→30日)、段階5で正解すると「覚えた」。
| まちがえるといつでも段階1・次の日。出す日より前の正解では変わらない。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

function memoryOf(UserProfile $profile, Question $question): ProfileQuestionMemory
{
    return ProfileQuestionMemory::query()
        ->where('user_profile_id', $profile->id)
        ->where('question_id', $question->id)
        ->sole();
}

/** 覚え具合を [段階, 次に出る日, 覚えた日] の形にする */
function memoryState(UserProfile $profile, Question $question): array
{
    $memory = memoryOf($profile, $question);

    return [$memory->level, $memory->due_on?->toDateString(), $memory->mastered_on?->toDateString()];
}

/** 出す日が来た問題を作る(9/20にまちがえた → 9/21から出す) */
function dueQuestionFor(UserProfile $profile, ?int $countryId = null): Question
{
    [$question] = createQuestionWithChoices();
    $question->update(['country_id' => $countryId]);
    QuestionMemory::record($profile, $question->id, false, '2026-09-20');

    return $question;
}

it('初めて答えたら、正解でも不正解でも段階1で、次の日に出す', function () {
    $profile = createActiveProfile();
    [$right] = createQuestionWithChoices();
    [$wrong] = createQuestionWithChoices();

    QuestionMemory::record($profile, $right->id, true);
    QuestionMemory::record($profile, $wrong->id, false);

    expect(memoryState($profile, $right))->toBe([1, '2026-09-30', null])
        ->and(memoryState($profile, $wrong))->toBe([1, '2026-09-30', null])
        ->and(memoryOf($profile, $right)->last_answered_on->toDateString())->toBe('2026-09-29');
});

it('出す日以降に正解すると1つ上がり、間は 3→7→14→30日。段階5で正解すると覚えた', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();

    QuestionMemory::record($profile, $question->id, true, '2026-09-01');
    expect(memoryState($profile, $question))->toBe([1, '2026-09-02', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-09-02');
    expect(memoryState($profile, $question))->toBe([2, '2026-09-05', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-09-06'); // 出す日より後でも上がる
    expect(memoryState($profile, $question))->toBe([3, '2026-09-13', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-09-13');
    expect(memoryState($profile, $question))->toBe([4, '2026-09-27', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-09-27');
    expect(memoryState($profile, $question))->toBe([5, '2026-10-27', null]);

    QuestionMemory::record($profile, $question->id, true, '2026-10-27');
    expect(memoryState($profile, $question))->toBe([5, null, '2026-10-27']);
});

it('出す日より前の正解では、段階も次に出る日も変わらない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    QuestionMemory::record($profile, $question->id, true, '2026-09-28');

    QuestionMemory::record($profile, $question->id, true, '2026-09-28');

    expect(memoryState($profile, $question))->toBe([1, '2026-09-29', null]);
});

it('同じ日に2回正解しても、段階は1つだけ上がる(ステージのおさらいと相棒の復習の両方で出たとき)', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    QuestionMemory::record($profile, $question->id, true, '2026-09-28');

    QuestionMemory::record($profile, $question->id, true);
    QuestionMemory::record($profile, $question->id, true);

    expect(memoryState($profile, $question))->toBe([2, '2026-10-02', null]);
});

it('まちがえると、覚えた問題でも段階1に戻り、覚えたも取り消す', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ProfileQuestionMemory::query()->create([
        'user_profile_id' => $profile->id, 'question_id' => $question->id,
        'level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01',
    ]);

    QuestionMemory::record($profile, $question->id, false);

    expect(memoryState($profile, $question))->toBe([1, '2026-09-30', null]);
});

it('覚えた問題に正解しても変わらない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ProfileQuestionMemory::query()->create([
        'user_profile_id' => $profile->id, 'question_id' => $question->id,
        'level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01',
    ]);

    QuestionMemory::record($profile, $question->id, true);

    expect(memoryState($profile, $question))->toBe([5, null, '2026-09-01']);
});

it('出す日が来た問題だけを、出す日が古い順に返す。まだの問題・覚えた問題・ほかのプロフィールの問題は出さない', function () {
    $profile = createActiveProfile();
    [$old] = createQuestionWithChoices();
    [$new] = createQuestionWithChoices();
    [$notYet] = createQuestionWithChoices();
    [$mastered] = createQuestionWithChoices();
    QuestionMemory::record($profile, $new->id, false, '2026-09-25');
    QuestionMemory::record($profile, $old->id, false, '2026-09-10');
    QuestionMemory::record($profile, $notYet->id, false); // 次に出るのは 9/30
    ProfileQuestionMemory::query()->create([
        'user_profile_id' => $profile->id, 'question_id' => $mastered->id,
        'level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01',
    ]);
    QuestionMemory::record(createFamilyMember($profile), $notYet->id, false, '2026-09-01');

    expect(QuestionMemory::dueIds($profile, 10))->toBe([$old->id, $new->id]);
});

it('数の上限と、除く問題が効く', function () {
    $profile = createActiveProfile();
    $a = dueQuestionFor($profile);
    $b = dueQuestionFor($profile);
    $c = dueQuestionFor($profile);

    expect(QuestionMemory::dueIds($profile, 2))->toBe([$a->id, $b->id])
        ->and(QuestionMemory::dueIds($profile, 10, [$a->id]))->toBe([$b->id, $c->id])
        ->and(QuestionMemory::dueIds($profile, 0))->toBe([]);
});

it('指定した国の問題を先に、そのあと出す日が古い順', function () {
    $profile = createActiveProfile();
    $japan = createTravelCountry('jp', '日本');
    [$other] = createQuestionWithChoices();
    [$mine] = createQuestionWithChoices();
    $mine->update(['country_id' => $japan->id]);
    QuestionMemory::record($profile, $other->id, false, '2026-09-10');
    QuestionMemory::record($profile, $mine->id, false, '2026-09-20');

    expect(QuestionMemory::dueIds($profile, 10, [], $japan->id))->toBe([$mine->id, $other->id]);
});

it('鍵の国の問題は出さない。国のない問題と、着いた国の問題は出す', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'gb', 'arrived_at' => now()]);
    $locked = dueQuestionFor($profile, $us->id);
    $visited = dueQuestionFor($profile, $gb->id);
    $noCountry = dueQuestionFor($profile);

    expect(QuestionMemory::dueIds($profile, 10))->toBe([$visited->id, $noCountry->id])
        ->and(QuestionMemory::dueIds($profile, 10))->not->toContain($locked->id);
});

it('覚えた問題の数を数える', function () {
    $profile = createActiveProfile();
    foreach ([null, '2026-09-01', '2026-09-02'] as $masteredOn) {
        [$question] = createQuestionWithChoices();
        ProfileQuestionMemory::query()->create([
            'user_profile_id' => $profile->id, 'question_id' => $question->id,
            'level' => 5, 'due_on' => $masteredOn ? null : '2026-10-01', 'mastered_on' => $masteredOn, 'last_answered_on' => '2026-09-01',
        ]);
    }

    expect(QuestionMemory::masteredCount($profile))->toBe(2);
});

it('問題が消されると、覚え具合も消える', function () {
    $profile = createActiveProfile();
    $question = dueQuestionFor($profile);

    $question->delete();

    expect(ProfileQuestionMemory::query()->count())->toBe(0)
        ->and(QuestionMemory::dueIds($profile, 10))->toBe([]);
});

it('パスポートに覚えた問題の数が出る', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    ProfileQuestionMemory::query()->create([
        'user_profile_id' => $profile->id, 'question_id' => $question->id,
        'level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01',
    ]);

    $this->getJson('/api/passport')->assertOk()->assertJsonPath('mastered_count', 1);
});
