<?php

use App\Models\Feedback;

/*
|--------------------------------------------------------------------------
| 保護者のご意見と、問題の「へん」報告(docs/design/2026-10-03-closed-beta-design.md 5章)
|--------------------------------------------------------------------------
*/

it('保護者が、種類と本文でご意見を送れる', function () {
    createActiveProfile();

    $this->postJson('/api/feedback', ['kind' => 'request', 'body' => 'ひらがなの問題がほしいです', 'page' => '/profiles'])
        ->assertCreated()->assertJsonPath('sent', true);

    $feedback = Feedback::firstOrFail();
    expect($feedback->kind)->toBe('request')
        ->and($feedback->body)->toBe('ひらがなの問題がほしいです')
        ->and($feedback->status)->toBe('new')
        ->and($feedback->page)->toBe('/profiles')
        ->and($feedback->user_profile_id)->toBeNull();
});

it('ご意見は、本文が必須・2000字まで・種類は3つのどれか', function () {
    createActiveProfile();

    $this->postJson('/api/feedback', ['kind' => 'request'])->assertStatus(422)->assertJsonValidationErrors('body');
    $this->postJson('/api/feedback', ['kind' => 'request', 'body' => str_repeat('あ', 2001)])->assertStatus(422);
    $this->postJson('/api/feedback', ['kind' => 'question_report', 'body' => 'x'])->assertStatus(422)->assertJsonValidationErrors('kind');

    expect(Feedback::count())->toBe(0);
});

it('ログインしていないとご意見は送れない', function () {
    $this->postJson('/api/feedback', ['kind' => 'bug', 'body' => 'x'])->assertStatus(401);
});

it('ご意見は1時間に10件まで', function () {
    createActiveProfile();

    foreach (range(1, 10) as $i) {
        $this->postJson('/api/feedback', ['kind' => 'other', 'body' => "意見{$i}"])->assertCreated();
    }

    $this->postJson('/api/feedback', ['kind' => 'other', 'body' => '意見11'])->assertStatus(429);
});

it('子どもが問題の「へん」を、理由を選んで報告できる', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'wrong_answer'])
        ->assertOk()->assertJsonPath('reported', true);

    $feedback = Feedback::firstOrFail();
    expect($feedback->kind)->toBe('question_report')
        ->and($feedback->user_profile_id)->toBe($profile->id)
        ->and($feedback->question_id)->toBe($question->id)
        ->and($feedback->reason)->toBe('wrong_answer')
        ->and($feedback->body)->toBe('答えがまちがっているみたい');
});

it('同じ子が同じ問題を重ねて報告しても、1件のまま', function () {
    createActiveProfile();
    [$question] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'wrong_answer'])->assertOk();
    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'unreadable'])->assertOk()->assertJsonPath('reported', true);

    expect(Feedback::count())->toBe(1)->and(Feedback::first()->reason)->toBe('wrong_answer');
});

it('別の子が同じ問題を報告したら、別の1件になる', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    $sister = createFamilyMember($profile);

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'other'])->assertOk();
    $this->withSession(['active_profile_id' => $sister->id])
        ->postJson("/api/questions/{$question->id}/report", ['reason' => 'other'])->assertOk();

    expect(Feedback::count())->toBe(2);
});

it('報告の理由が3つ以外・存在しない問題はエラー', function () {
    createActiveProfile();
    [$question] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'いたずら'])->assertStatus(422);
    $this->postJson('/api/questions/999999/report', ['reason' => 'other'])->assertStatus(404);

    expect(Feedback::count())->toBe(0);
});

it('問題が消えても、報告は残り、問題の番号だけ空になる', function () {
    createActiveProfile();
    [$question] = createQuestionWithChoices();
    $this->postJson("/api/questions/{$question->id}/report", ['reason' => 'other'])->assertOk();

    $question->delete();

    expect(Feedback::firstOrFail()->question_id)->toBeNull();
});
