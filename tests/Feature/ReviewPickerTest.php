<?php

use App\Models\ProfileQuestionMemory;
use App\Models\ProfileWord;
use App\Models\Question;
use App\Models\UserProfile;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 復習の出し方の優先順位(docs/design/2026-10-09-review-priority-design.md)
|--------------------------------------------------------------------------
|
| 枠: 最近まちがえた(7日以内)・苦手の語(出す日前でも3日あければ)・あと1回で覚える(段階5)。
| 残りは、出す日が古い順(いちばん遅れている問題)。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-10-09 03:00:00', 'UTC')); // 日本時間 10/09 12:00
});

/** 覚え具合の行を直接作る(段階・出す日などを自由に決める)。既定は「10/08が出す日・段階1」 */
function pickerMemory(UserProfile $profile, array $attributes = [], ?Question $question = null): Question
{
    $question ??= createQuestionWithChoices()[0];
    ProfileQuestionMemory::create($attributes + [
        'user_profile_id' => $profile->id,
        'question_id' => $question->id,
        'level' => 1,
        'due_on' => '2026-10-08',
        'mastered_on' => null,
        'last_answered_on' => '2026-10-07',
        'wrong_on' => null,
    ]);

    return $question;
}

/** 苦手にした語の問題を作る(meta.word_id つき)。$memory はその問題の覚え具合 */
function pickerWeak(UserProfile $profile, array $memory = [], string $status = 'weak'): Question
{
    [$question] = createQuestionWithChoices();
    $word = makeWord('picker'.uniqid());
    $question->update(['meta' => ['kind' => 'word', 'word' => $word->word, 'word_id' => $word->id]]);
    ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $word->id, 'seen_at' => now(), 'status' => $status]);

    return pickerMemory($profile, $memory, $question);
}

it('最近まちがえた問題: 7日以内にまちがえて、出す日が来ているものを、新しい順に出す', function () {
    $profile = createActiveProfile();
    $older = pickerMemory($profile, ['wrong_on' => '2026-10-03', 'due_on' => '2026-10-04']);
    $newer = pickerMemory($profile, ['wrong_on' => '2026-10-08', 'due_on' => '2026-10-09']);
    pickerMemory($profile, ['wrong_on' => '2026-10-01', 'due_on' => '2026-10-02']); // 8日前: 最近ではない
    pickerMemory($profile, ['wrong_on' => '2026-10-09', 'due_on' => '2026-10-10']); // 今日まちがえた: 出す日は明日
    pickerMemory($profile); // まちがえていない

    expect(QuestionMemory::slotIds($profile, 'recent_wrong', 10))->toBe([$newer->id, $older->id]);
});

it('あと1回で覚える問題: 段階5で出す日が来ているものだけ。出す日が古い順', function () {
    $profile = createActiveProfile();
    $second = pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-07']);
    $first = pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-01']);
    pickerMemory($profile, ['level' => 4, 'due_on' => '2026-10-01']);
    pickerMemory($profile, ['level' => 5, 'due_on' => '2026-10-10']); // まだ

    expect(QuestionMemory::slotIds($profile, 'almost', 10))->toBe([$first->id, $second->id]);
});

it('苦手の語: 出す日が来ていれば出る。来ていなくても、最後に答えてから3日あいていれば出る(2日では出ない)', function () {
    $profile = createActiveProfile();
    $due = pickerWeak($profile, ['due_on' => '2026-10-08', 'last_answered_on' => '2026-10-08']);
    $gap3 = pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-10-06']);
    pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-10-07']); // 2日
    $mastered = pickerWeak($profile, ['level' => 5, 'due_on' => null, 'mastered_on' => '2026-09-01', 'last_answered_on' => '2026-09-01']);

    // 最後に答えた日が古い順
    expect(QuestionMemory::slotIds($profile, 'weak', 10))->toBe([$mastered->id, $gap3->id, $due->id]);
});

it('苦手の語: 覚えたマークの語・語のない問題は、出す日が来ていなければ出ない。語のない問題でも壊れない', function () {
    $profile = createActiveProfile();
    pickerWeak($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-09-20'], 'learned');
    pickerMemory($profile, ['level' => 3, 'due_on' => '2026-10-14', 'last_answered_on' => '2026-09-20']); // 語のない問題

    expect(QuestionMemory::slotIds($profile, 'weak', 10))->toBe([]);
});

it('枠の共通の決まり: 除く問題・国旗キャッチ専用・鍵の国は出ない。国の優先は先に並ぶ。limit 0 は空', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'gb', 'arrived_at' => now()]);

    $base = ['wrong_on' => '2026-10-07', 'due_on' => '2026-10-08'];
    $other = pickerMemory($profile, $base);
    $mine = pickerMemory($profile, $base);
    $mine->update(['country_id' => $gb->id]);
    $locked = pickerMemory($profile, $base);
    $locked->update(['country_id' => $us->id]);
    $catchOnly = pickerMemory($profile, $base);
    $catchOnly->update(['meta' => ['flag_key' => 'catch:test', 'catch_only' => true]]);
    $excluded = pickerMemory($profile, $base);

    $ids = QuestionMemory::slotIds($profile, 'recent_wrong', 10, [$excluded->id], $gb->id);

    expect($ids)->toBe([$mine->id, $other->id])
        ->and(QuestionMemory::slotIds($profile, 'recent_wrong', 0))->toBe([]);
});
