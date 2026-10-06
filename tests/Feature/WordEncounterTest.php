<?php

use App\Models\ProfileWord;
use App\Support\QuestionMemory;
use App\Support\Words;

/** 単語との出会い(docs/design/2026-10-07-word-book-design.md 5章・計画 タスク4) */

/** 語 reason と、それを問う問題(meta.word_id つき)を作る */
function createWordQuestion(string $word = 'reason'): array
{
    [$question, $correct, $wrong] = createQuestionWithChoices();
    $model = makeWord($word);
    $question->update(['meta' => ['kind' => 'word', 'level' => 61, 'direction' => 'en_ja', 'word' => $word, 'word_id' => $model->id]]);

    return [$question, $correct, $wrong, $model];
}

it('答えると、その語に出会ったことになる(正解でもまちがいでも)。2度答えても、最初の日時のまま', function () {
    $profile = createActiveProfile();
    [$question, $correct, $wrong, $word] = createWordQuestion();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])->assertOk();
    $first = ProfileWord::where(['user_profile_id' => $profile->id, 'word_id' => $word->id])->firstOrFail();
    expect($first->seen_at)->not->toBeNull()->and($first->status)->toBeNull();

    $this->travel(1)->hours();
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();

    expect(ProfileWord::count())->toBe(1)->and(ProfileWord::first()->seen_at->equalTo($first->seen_at))->toBeTrue();
});

it('答えのAPIが、記録するときは word_id を返す。語のない問題・やり直し(practice)では返さない', function () {
    createActiveProfile();
    [$question, $correct, , $word] = createWordQuestion();
    [$plain, $plainCorrect] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])
        ->assertOk()->assertJsonMissingPath('word_id');
    expect(ProfileWord::count())->toBe(0);

    $this->postJson("/api/questions/{$plain->id}/answer", ['choice_id' => $plainCorrect->id])
        ->assertOk()->assertJsonPath('word_id', null);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()->assertJsonPath('word_id', $word->id);
});

it('語のない問題に答えても、何も作らない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();

    expect(ProfileWord::count())->toBe(0)->and($profile->fresh()->level)->toBeGreaterThanOrEqual(1);
});

it('答えを記録する1か所(QuestionMemory::record。ミニゲーム・おさらいも通る)から、語に出会う', function () {
    $profile = createActiveProfile();
    [$question, , , $word] = createWordQuestion();

    QuestionMemory::record($profile, $question->id, true);

    expect(ProfileWord::where(['user_profile_id' => $profile->id, 'word_id' => $word->id])->whereNotNull('seen_at')->exists())->toBeTrue();
});

it('単語帳に保存だけした語に答えても、保存と苦手のマークは変わらず、出会った日時が入る', function () {
    $profile = createActiveProfile();
    [$question, , , $word] = createWordQuestion();
    ProfileWord::create(['user_profile_id' => $profile->id, 'word_id' => $word->id, 'saved_at' => now(), 'status' => 'weak']);

    Words::encounter($profile->id, $question->id);

    $record = ProfileWord::first();
    expect($record->seen_at)->not->toBeNull()->and($record->saved_at)->not->toBeNull()->and($record->status)->toBe('weak')->and(ProfileWord::count())->toBe(1);
});
