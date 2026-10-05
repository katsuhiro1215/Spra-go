<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\FlagQuiz\FlagCatalog;
use App\Support\FlagQuiz\FlagQuizPlanner;
use App\Support\FlagQuiz\FlagQuizWriter;
use Database\Seeders\FlagQuizSeeder;

/*
|--------------------------------------------------------------------------
| 国旗クイズのデータベースへの書き込み(docs/design/2026-10-05-flag-quiz-design.md 6-2)
|--------------------------------------------------------------------------
*/

it('「国旗クイズ」の大もと(目印つき)と、コースのカテゴリー・ステージ・問題を作る', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    $result = FlagQuizWriter::write($plan);

    $root = Category::where('name', '国旗クイズ')->whereNull('parent_id')->firstOrFail();
    expect($root->is_course_group)->toBeTrue();
    expect($root->children()->pluck('name')->all())->toBe(['アジア', 'ヨーロッパ', '世界ぜんぶ']);

    $asia = Category::where('name', 'アジア')->where('parent_id', $root->id)->firstOrFail();
    expect($asia->is_course_group)->toBeFalse();
    expect(Stage::where('category_id', $asia->id)->count())->toBe(2 + 3 + 3); // 初級(1+ボス)・中級(2+ボス)・上級(2+ボス)

    $stage = Stage::where('category_id', $asia->id)->where('difficulty', '初級')->where('stage_number', 1)->firstOrFail();
    expect([$stage->country_id, $stage->question_count, $stage->is_boss])->toBe([null, 10, false]);
    expect($stage->questions()->count())->toBe(10);

    $boss = Stage::where('category_id', $asia->id)->where('difficulty', '上級')->where('is_boss', true)->firstOrFail();
    expect($boss->title_reward)->toBe('アジアの国旗はかせ');

    expect($result['questions'])->toBe(Question::count());
    expect($result['courses'])->toBe(3);
});

it('国旗→国名の問題は問題に国旗の絵、国名→国旗は選択肢に国旗の絵、はめ込みはmatchingで作る', function () {
    FlagQuizWriter::write(FlagQuizPlanner::plan(flagTestCatalog()));

    $flagToName = Question::where('meta->flag_key', 'flag:asia:beginner:1:q1')->firstOrFail();
    expect($flagToName->type)->toBe('multiple_choice');
    expect($flagToName->meta['image'])->toStartWith('/flag/A');
    expect($flagToName->choices->where('is_correct', true))->toHaveCount(1);
    expect($flagToName->choices->pluck('meta')->filter()->all())->toBe([]);
    expect($flagToName->country_id)->toBeNull();

    $nameToFlag = Question::where('meta->flag_key', 'flag:asia:intermediate:1:q1')->firstOrFail();
    expect($nameToFlag->meta)->not->toHaveKey('image');
    expect($nameToFlag->choices->every(fn (QuestionChoice $choice) => str_starts_with($choice->meta['image'] ?? '', '/flag/')))->toBeTrue();

    $fit = Question::where('meta->flag_key', 'flag:asia:intermediate:1:q3')->firstOrFail();
    expect($fit->type)->toBe('matching');
    expect($fit->meta['layout'])->toBe('slots');
    expect($fit->meta['items'])->toHaveCount(4);
    expect($fit->choices)->toHaveCount(4);
    foreach ($fit->choices as $choice) {
        expect(collect($fit->meta['items'])->pluck('id'))->toContain($choice->meta['item_id']);
        expect($choice->is_correct)->toBeTrue();
    }
});

it('何度書いても、ステージ・問題・選択肢が増えず、番号も変わらない', function () {
    $plan = FlagQuizPlanner::plan(flagTestCatalog());
    FlagQuizWriter::write($plan);

    $counts = [Category::count(), Stage::count(), Question::count(), QuestionChoice::count(), Quiz::count()];
    $ids = Question::orderBy('id')->pluck('id')->all();
    $choiceIds = QuestionChoice::orderBy('id')->pluck('id')->all();

    FlagQuizWriter::write($plan);

    expect([Category::count(), Stage::count(), Question::count(), QuestionChoice::count(), Quiz::count()])->toBe($counts);
    expect(Question::orderBy('id')->pluck('id')->all())->toBe($ids);
    expect(QuestionChoice::orderBy('id')->pluck('id')->all())->toBe($choiceIds); // 中身が同じなら、選択肢も作り直さない
});

it('一覧の国名を直して書き直すと、問題と選択肢の文が直り、ステージ・問題の番号は保たれる', function () {
    FlagQuizWriter::write(FlagQuizPlanner::plan(flagTestCatalog()));
    $stageIds = Stage::orderBy('id')->pluck('id')->all();
    $questionIds = Question::orderBy('id')->pluck('id')->all();

    $catalog = flagTestCatalog();
    $catalog['A1']['name'] = 'なおした国';
    FlagQuizWriter::write(FlagQuizPlanner::plan($catalog));

    expect(Stage::orderBy('id')->pluck('id')->all())->toBe($stageIds);
    expect(Question::orderBy('id')->pluck('id')->all())->toBe($questionIds);
    expect(QuestionChoice::where('label', 'なおした国')->exists())->toBeTrue();
    expect(QuestionChoice::where('label', 'あじあ1')->exists())->toBeFalse();
});

it('今ある「国旗」のカテゴリー(国ごとの学習用)は、触らない', function () {
    $existing = Category::create(['name' => '国旗']);
    $child = Category::create(['name' => '日本', 'parent_id' => $existing->id]);

    FlagQuizWriter::write(FlagQuizPlanner::plan(flagTestCatalog()));

    expect($existing->fresh()->is_course_group)->toBeFalse();
    expect(Category::where('parent_id', $existing->id)->pluck('id')->all())->toBe([$child->id]);
});

it('本物の一覧を、Seederで書ける(何度でも)', function () {
    $this->seed(FlagQuizSeeder::class);
    $first = [Stage::count(), Question::count()];

    $this->seed(FlagQuizSeeder::class);

    expect([Stage::count(), Question::count()])->toBe($first);
    expect(Category::where('name', '国旗クイズ')->count())->toBe(1);
    expect(Category::where('name', '国旗クイズ')->first()->children()->count())->toBe(count(FlagCatalog::COURSES));
    expect(Stage::whereHas('questions')->count())->toBe(Stage::count());
});
