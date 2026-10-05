<?php

use App\Models\Question;
use App\Models\Quiz;
use App\Support\QuestionMemory;

/*
|--------------------------------------------------------------------------
| 国旗キャッチ専用の問題は、おさらいと仲間の復習に出さない(docs/design/2026-10-05-flag-catch-design.md 4-3)
|--------------------------------------------------------------------------
*/

function catchOnlyQuestion(bool $catchOnly): Question
{
    $quiz = Quiz::create(['title' => 'テスト', 'difficulty' => '初級']);

    return Question::create([
        'quiz_id' => $quiz->id,
        'prompt' => 'テスト問題',
        'meta' => $catchOnly ? ['flag_key' => 'catch:test', 'catch_only' => true] : null,
    ]);
}

it('出す日が来た問題のうち、国旗キャッチ専用の問題は、復習(dueIds)に出ない。国旗キャッチの中(dueIdsAmong)では出る', function () {
    $profile = createActiveProfile();
    $catchOnly = catchOnlyQuestion(true);
    $normal = catchOnlyQuestion(false);

    foreach ([$catchOnly, $normal] as $question) {
        QuestionMemory::record($profile, $question->id, true, '2026-09-01'); // 出す日は、とっくに来ている
    }

    expect(QuestionMemory::dueIds($profile, 10))->toBe([$normal->id]);
    expect(QuestionMemory::dueIdsAmong($profile, [$catchOnly->id, $normal->id], 10))->toContain($catchOnly->id, $normal->id);
});
