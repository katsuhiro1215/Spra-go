<?php

use App\Models\Feedback;
use App\Models\Owner;
use App\Models\User;

/*
|--------------------------------------------------------------------------
| Ownerのご意見の一覧(docs/design/2026-10-03-closed-beta-design.md 5-2)
|--------------------------------------------------------------------------
*/

function makeFeedback(array $overrides = []): Feedback
{
    return Feedback::create(array_merge([
        'user_id' => User::factory()->create(['name' => '保護者さん'])->id,
        'kind' => 'request',
        'body' => 'こうしてほしい',
    ], $overrides));
}

it('Owner以外は一覧も状態変更もできない', function () {
    $feedback = makeFeedback();

    $this->getJson('/api/owner/feedbacks')->assertStatus(401);
    $this->patchJson("/api/owner/feedbacks/{$feedback->id}", ['status' => 'read'])->assertStatus(401);
});

it('一覧は新しい順で、アカウント名と問題の本文を出し、メールアドレスは出さない', function () {
    $owner = Owner::factory()->create();
    [$question] = createQuestionWithChoices();
    makeFeedback(['body' => '古い']);
    makeFeedback(['kind' => 'question_report', 'reason' => 'wrong_answer', 'body' => '答えがまちがっているみたい', 'question_id' => $question->id]);

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/feedbacks')->assertOk();

    expect($response->json('data.0.kind'))->toBe('question_report')
        ->and($response->json('data.0.question_prompt'))->toBe('テスト問題')
        ->and($response->json('data.0.user_name'))->toBe('保護者さん')
        ->and($response->json('data.1.body'))->toBe('古い')
        ->and($response->getContent())->not->toContain('@');
});

it('種類と状態で絞り込める', function () {
    $owner = Owner::factory()->create();
    makeFeedback(['kind' => 'bug']);
    makeFeedback(['kind' => 'request', 'status' => 'done']);

    $this->actingAs($owner, 'owner')->getJson('/api/owner/feedbacks?kind=bug')
        ->assertOk()->assertJsonCount(1, 'data');
    $this->actingAs($owner, 'owner')->getJson('/api/owner/feedbacks?status=done')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.kind', 'request');
});

it('1ページ30件でページ分けされる', function () {
    $owner = Owner::factory()->create();
    $userId = User::factory()->create()->id;
    foreach (range(1, 31) as $i) {
        Feedback::create(['user_id' => $userId, 'kind' => 'other', 'body' => "意見{$i}"]);
    }

    $this->actingAs($owner, 'owner')->getJson('/api/owner/feedbacks')
        ->assertOk()->assertJsonCount(30, 'data')->assertJsonPath('last_page', 2);
});

it('状態を変えられる。3つ以外は422', function () {
    $owner = Owner::factory()->create();
    $feedback = makeFeedback();

    $this->actingAs($owner, 'owner')->patchJson("/api/owner/feedbacks/{$feedback->id}", ['status' => 'read'])
        ->assertOk()->assertJsonPath('status', 'read');
    expect($feedback->fresh()->status)->toBe('read');

    $this->actingAs($owner, 'owner')->patchJson("/api/owner/feedbacks/{$feedback->id}", ['status' => 'まんぞく'])
        ->assertStatus(422);
});
