<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\Stage;
use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\QuestionExplanation;
use App\Support\QuestionMemory;

/*
|--------------------------------------------------------------------------
| 問題の解説(docs/design/2026-10-06-question-explanation-design.md)
|--------------------------------------------------------------------------
|
| 答えたあとのカードに出す、要約・例文・使いどころ・似た語。答える前には、どこにも出さない。
|
*/

const EXPLANATION = [
    'summary' => '室蘭は、北海道の南にある港のまちだよ。',
    'example' => ['text' => 'Thank you very much.', 'translation' => 'どうもありがとうございます。'],
    'usage' => 'お礼を言うとき。',
    'related' => [['term' => 'Thanks.', 'note' => 'くだけた言い方']],
];

// ---- そろえ方 ----

it('解説は、知らないキーを捨て、前後の空白を取り、空の項目を捨てる', function () {
    expect(QuestionExplanation::normalize([
        'summary' => '  ありがとう  ',
        'example' => ['text' => ' Thanks. ', 'translation' => ' ', 'extra' => 'x'],
        'usage' => '',
        'related' => [['term' => ' Thank you. ', 'note' => ''], ['term' => ' ', 'note' => 'だめ'], 'ぶんじ'],
        'unknown' => 'x',
    ]))->toBe([
        'summary' => 'ありがとう',
        'example' => ['text' => 'Thanks.'],
        'related' => [['term' => 'Thank you.']],
    ]);
});

it('解説は、完全な形ならそのまま残す', function () {
    expect(QuestionExplanation::normalize(EXPLANATION))->toBe(EXPLANATION);
});

it('解説は、なにも残らなければ null になる', function () {
    expect(QuestionExplanation::normalize(null))->toBeNull()
        ->and(QuestionExplanation::normalize([]))->toBeNull()
        ->and(QuestionExplanation::normalize(['summary' => '  ', 'example' => ['translation' => 'だけ'], 'related' => []]))->toBeNull()
        ->and(QuestionExplanation::normalize('ぶんじ'))->toBeNull();
});

// ---- 書き込み ----

function explanationPlan(?array $explanation): array
{
    $question = [
        'key' => 'test:q1',
        'type' => 'multiple_choice',
        'prompt' => '「ありがとう」は英語で何と言う？',
        'image' => null,
        'choices' => [
            ['label' => 'Thank you.', 'correct' => true, 'image' => null],
            ['label' => 'Sorry.', 'correct' => false, 'image' => null],
        ],
    ];
    if ($explanation !== null) {
        $question['explanation'] = $explanation;
    }

    return [[
        'name' => '解説コース',
        'order' => 1,
        'levels' => [[
            'difficulty' => '初級',
            'stages' => [['number' => 1, 'boss' => false, 'title_reward' => null, 'questions' => [$question]]],
        ]],
    ]];
}

it('計画に解説があれば、問題に書かれる', function () {
    FlagQuizWriter::write(explanationPlan(EXPLANATION));

    // MySQL の JSON 列は、キーの順を並べ替えて持つので、順番は問わない
    expect(Question::firstOrFail()->explanation)->toEqual(EXPLANATION);
});

it('計画に解説がなければ、解説は null', function () {
    FlagQuizWriter::write(explanationPlan(null));

    expect(Question::firstOrFail()->explanation)->toBeNull();
});

it('書き込みを2回しても問題は増えず、解説は計画のとおりに直る', function () {
    FlagQuizWriter::write(explanationPlan(['summary' => 'はじめの文']));
    FlagQuizWriter::write(explanationPlan(['summary' => 'なおした文']));

    expect(Question::count())->toBe(1)
        ->and(Question::firstOrFail()->explanation)->toEqual(['summary' => 'なおした文']);

    FlagQuizWriter::write(explanationPlan(null));

    expect(Question::firstOrFail()->explanation)->toBeNull();
});

// ---- 答えのAPI ----

it('答えの返事に、解説が入る', function () {
    createActiveProfile();
    [$question, $correct, $wrong] = createQuestionWithChoices();
    $question->update(['explanation' => EXPLANATION]);

    $right = $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('correct', true);
    expect($right->json('explanation'))->toEqual(EXPLANATION);

    $miss = $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])
        ->assertOk()
        ->assertJsonPath('correct', false);
    expect($miss->json('explanation'))->toEqual(EXPLANATION);
});

it('やり直し(練習)の返事にも、解説が入る', function () {
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    $question->update(['explanation' => EXPLANATION]);

    $response = $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    expect($response->json('explanation'))->toEqual(EXPLANATION);
});

it('解説のない問題の返事は、解説が null', function () {
    createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('explanation', null);
});

// ---- 答える前には出さない ----

it('ステージの出題に、解説は出ない', function () {
    createActiveProfile();
    [$question] = createQuestionWithChoices();
    $question->update(['explanation' => EXPLANATION]);
    $category = Category::create(['name' => '解説カテゴリー']);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1, 'question_count' => 1]);
    $stage->questions()->attach([$question->id => ['order' => 1]]);

    $response = $this->getJson("/api/stages/{$stage->id}")->assertOk()->assertJsonPath('questions.0.id', $question->id);

    expect($response->json('questions.0'))->not->toHaveKey('explanation');
    expect($response->getContent())->not->toContain('室蘭');
});

it('問題を丸ごと返しても(列を絞らない口でも)、解説は出ない', function () {
    [$question] = createQuestionWithChoices();
    $question->update(['explanation' => EXPLANATION]);

    $fresh = Question::findOrFail($question->id);

    expect($fresh->toArray())->not->toHaveKey('explanation')
        ->and($fresh->toJson())->not->toContain('室蘭')
        ->and($fresh->explanation)->toEqual(EXPLANATION); // 答えのAPIは、属性を直接読める
});

it('復習の出題に、解説は出ない', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    $question->update(['explanation' => EXPLANATION]);
    QuestionMemory::record($profile, $question->id, false, now('Asia/Tokyo')->subDays(9)->toDateString());

    $response = $this->getJson('/api/review')->assertOk()->assertJsonPath('questions.0.id', $question->id);

    expect($response->json('questions.0'))->not->toHaveKey('explanation');
});
