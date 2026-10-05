<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\FlagQuiz\FlagCatchPlanner;
use App\Support\FlagQuiz\FlagQuizPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;

/*
|--------------------------------------------------------------------------
| 国旗キャッチの問題の書き込み(docs/design/2026-10-05-flag-catch-design.md 4-2)
|--------------------------------------------------------------------------
*/

it('難しさごとにクイズを作り、問題(国旗の絵つきの選択肢)を書く。ステージ・カテゴリーは作らない', function () {
    $result = FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));

    expect($result)->toBe(['quizzes' => 3, 'questions' => 44]);
    expect(Quiz::pluck('title')->sort()->values()->all())->toBe(['国旗キャッチ 上級', '国旗キャッチ 中級', '国旗キャッチ 初級']);
    expect(Question::count())->toBe(44);
    expect(Stage::count())->toBe(0);
    expect(Category::count())->toBe(0);

    $question = Question::where('meta->flag_key', 'catch:beginner:A1')->firstOrFail();
    expect($question->type)->toBe('multiple_choice');
    expect($question->prompt)->toBe('「あじあ1」の国旗は？');
    expect($question->meta)->toBe(['flag_key' => 'catch:beginner:A1', 'catch_only' => true]);
    expect($question->country_id)->toBeNull();
    expect($question->choices->where('is_correct', true))->toHaveCount(1);
    expect($question->choices->every(fn (QuestionChoice $choice) => str_starts_with($choice->meta['image'] ?? '', '/flag/')))->toBeTrue();
    expect($question->quiz->title)->toBe('国旗キャッチ 初級');
});

it('何度書いても、クイズ・問題・選択肢が増えず、番号も変わらない', function () {
    $plan = FlagCatchPlanner::plan(flagTestCatalog());
    FlagQuizWriter::writeCatch($plan);

    $counts = [Quiz::count(), Question::count(), QuestionChoice::count()];
    $ids = Question::orderBy('id')->pluck('id')->all();
    $choiceIds = QuestionChoice::orderBy('id')->pluck('id')->all();

    FlagQuizWriter::writeCatch($plan);

    expect([Quiz::count(), Question::count(), QuestionChoice::count()])->toBe($counts);
    expect(Question::orderBy('id')->pluck('id')->all())->toBe($ids);
    expect(QuestionChoice::orderBy('id')->pluck('id')->all())->toBe($choiceIds);
});

it('国名を直して書き直すと、問題の文と選択肢が直り、問題の番号は保たれる', function () {
    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));
    $questionIds = Question::orderBy('id')->pluck('id')->all();

    $catalog = flagTestCatalog();
    $catalog['A1']['name'] = 'なおした国';
    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan($catalog));

    expect(Question::orderBy('id')->pluck('id')->all())->toBe($questionIds);
    expect(Question::where('meta->flag_key', 'catch:beginner:A1')->first()->prompt)->toBe('「なおした国」の国旗は？');
    expect(QuestionChoice::where('label', 'あじあ1')->exists())->toBeFalse();
});

it('国旗クイズ(ステージの問題)と一緒に書いても、お互いに触らない', function () {
    FlagQuizWriter::write(FlagQuizPlanner::plan(flagTestCatalog()));
    $quizQuestions = Question::whereNotNull('meta->flag_key')->count();
    $stages = Stage::count();

    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));

    expect(Question::whereNull('meta->catch_only')->count())->toBe($quizQuestions);
    expect(Question::where('meta->catch_only', true)->count())->toBe(44);
    expect(Stage::count())->toBe($stages);
});
