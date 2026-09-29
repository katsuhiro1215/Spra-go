<?php

use App\Models\Category;
use App\Models\ProfileGamePlay;
use App\Models\User;
use App\Support\QuestionMemory;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スプルキャッチを始める(docs/design/2026-09-29-spru-catch-design.md 4章・6-3)
|--------------------------------------------------------------------------
|
| 「英語を学ぶ」の、選んだ難しさ・鍵のない国・4択・選択肢が短い問題を、
| 最近まちがえた問題と出す日が来た問題(あわせて6問まで)を先にして10問出す。
|
*/

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-09-29 03:00:00', 'UTC')); // 日本時間 9/29 12:00
});

it('難しさごとの列の数・使える問題の数・自己ベストと、今日のごほうびの残りを返す', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 2);
    $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-09-29', 'score' => 50]);
    $profile->gamePlays()->create(['game' => 'catch', 'difficulty' => '初級', 'question_ids' => [], 'finished_at' => now(), 'played_on' => '2026-09-28', 'score' => 80]);

    $this->getJson('/api/games/catch')
        ->assertOk()
        ->assertJsonPath('category_id', Category::query()->where('name', '英語を学ぶ')->value('id'))
        ->assertJsonPath('difficulties.0', ['difficulty' => '初級', 'lanes' => 2, 'available' => 2, 'best_score' => 80])
        ->assertJsonPath('difficulties.1', ['difficulty' => '中級', 'lanes' => 3, 'available' => 0, 'best_score' => null])
        ->assertJsonPath('difficulties.2.lanes', 4)
        ->assertJsonPath('rewarded_plays_left', 2);
});

it('どの国にも着いていないと使える問題は0問で、始めると「アメリカかイギリスに着くと遊べるよ」', function () {
    createActiveProfile();
    createCatchQuestion(createCatchStage(createTravelCountry('us', 'アメリカ')));

    $this->getJson('/api/games/catch')->assertJsonPath('difficulties.0.available', 0);
    $this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'アメリカかイギリスに着くと遊べるよ');

    expect(ProfileGamePlay::query()->count())->toBe(0);
});

it('着いた国に、その難しさの問題がなければ「この難しさの問題はまだないよ」', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 1, '初級');

    $this->postJson('/api/games/catch/plays', ['difficulty' => '上級'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'この難しさの問題はまだないよ');
});

it('選んだ難しさ・鍵のない国・4択・選択肢が短い・まちがいの選択肢が足りる問題だけを出す', function () {
    $profile = createActiveProfile();
    $us = createTravelCountry('us', 'アメリカ');
    $gb = createTravelCountry('gb', 'イギリス');
    $profile->trips()->create(['destination' => 'us', 'arrived_at' => now()]);
    $stage = createCatchStage($us, '上級');
    $ok = createCatchQuestion($stage, ['who', 'which', 'whose', 'where']);
    createCatchQuestion(createCatchStage($us, '中級'));                                // ほかの難しさ
    createCatchQuestion(createCatchStage($gb, '上級'));                                // 鍵の国(イギリスにはまだ着いていない)
    createCatchQuestion($stage, ['A', 'B', 'C', 'D'], 'matching');                     // 4択でない
    createCatchQuestion($stage, ['几帳面な', '怠惰な', '気前の良い', '無関心な人たち']);       // 全角7文字は上級(6文字まで)に入らない
    createCatchQuestion($stage, ['who', 'which', 'whose']);                           // まちがいが2つで、4列に足りない

    $response = $this->postJson('/api/games/catch/plays', ['difficulty' => '上級'])->assertOk();

    expect(array_column($response->json('questions'), 'id'))->toBe([$ok->id]);
    $this->getJson('/api/games/catch')->assertJsonPath('difficulties.2.available', 1);
});

it('選択肢は列の数だけで、正解が1つ入り、correct_choice_id がその正解', function () {
    $profile = createActiveProfile();
    [$question] = prepareCatchQuestions($profile, 1, '中級');
    $correctId = $question->choices()->where('is_correct', true)->value('id');

    $response = $this->postJson('/api/games/catch/plays', ['difficulty' => '中級'])
        ->assertOk()
        ->assertJsonPath('difficulty', '中級')
        ->assertJsonPath('lanes', 3)
        ->assertJsonPath('fall_ms', 6000);

    $dealt = $response->json('questions.0');
    expect($dealt['prompt'])->toBe('「tired」の意味は？')
        ->and($dealt['correct_choice_id'])->toBe($correctId)
        ->and($dealt['choices'])->toHaveCount(3)
        ->and(array_column($dealt['choices'], 'id'))->toContain($correctId)
        ->and(array_keys($dealt['choices'][0]))->toBe(['id', 'label']);
});

it('始めると遊んだ回が1行でき、出した問題の順と同じ番号が残る', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 5);

    $response = $this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->assertOk();

    $play = ProfileGamePlay::query()->sole();
    expect($response->json('play_id'))->toBe($play->id)
        ->and([$play->user_profile_id, $play->game, $play->difficulty])->toBe([$profile->id, 'catch', '初級'])
        ->and($play->question_ids)->toBe(array_column($response->json('questions'), 'id'))
        ->and($play->finished_at)->toBeNull()
        ->and($play->played_on)->toBeNull();
});

it('1回は10問まで', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 12);

    expect($this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->json('questions'))->toHaveCount(10);
});

it('使える問題が10問より少なければ、ある分だけ出す', function () {
    $profile = createActiveProfile();
    prepareCatchQuestions($profile, 3);

    expect($this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->json('questions'))->toHaveCount(3);
});

it('最近まちがえた問題(新しい順)と出す日が来た問題(古い順)を、あわせて6問まで先に入れる', function () {
    $profile = createActiveProfile();
    $questions = prepareCatchQuestions($profile, 18);
    $wrong = array_slice($questions, 0, 5);
    $due = array_slice($questions, 5, 3);
    $fresh = array_slice($questions, 8);
    foreach ($wrong as $index => $question) {
        QuestionMemory::record($profile, $question->id, false, '2026-09-2'.(5 + $index)); // 9/25〜9/29 にまちがえた
    }
    foreach ($due as $index => $question) {
        // 9/18〜20 にまちがえ、次の日に正解 → 段階2・出す日 9/22〜24(来ている)。最後の答えは正解
        QuestionMemory::record($profile, $question->id, false, '2026-09-'.(18 + $index));
        QuestionMemory::record($profile, $question->id, true, '2026-09-'.(19 + $index));
    }
    $idsOf = fn (array $list) => array_map(fn ($question) => $question->id, $list);

    $ids = array_column($this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->json('questions'), 'id');

    expect($ids)->toHaveCount(10)
        ->and(array_intersect($idsOf($wrong), $ids))->toHaveCount(5)
        ->and(array_values(array_intersect($idsOf($due), $ids)))->toBe([$due[0]->id])
        ->and(array_intersect($idsOf($fresh), $ids))->toHaveCount(4);
});

it('遊んでいるプロフィールがなければ422、難しさが正しくなければ422', function () {
    $this->actingAs(User::factory()->create())->withHeader('Referer', 'http://localhost');
    $this->getJson('/api/games/catch')->assertStatus(422);
    $this->postJson('/api/games/catch/plays', ['difficulty' => '初級'])->assertStatus(422);

    createActiveProfile();
    $this->postJson('/api/games/catch/plays', ['difficulty' => '超級'])->assertStatus(422)->assertJsonValidationErrors('difficulty');
});
