<?php

use App\Models\Category;
use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\Prefecture\PrefectureQuizPlanner;

/*
|--------------------------------------------------------------------------
| 都道府県クイズのデータベースへの書き込み(docs/design/2026-10-05-prefecture-quiz-design.md 3章)
|--------------------------------------------------------------------------
*/

const PREFECTURE_ROOT = '都道府県クイズ';

function writePrefectureTestPlan(): array
{
    $plan = PrefectureQuizPlanner::plan(prefectureTestCatalog());

    return [$plan, FlagQuizWriter::writeTree(PREFECTURE_ROOT, $plan)];
}

it('大もと→地方(目印つき)→県のコース、の入れ子で、カテゴリー・ステージ・問題を作る', function () {
    [$plan, $result] = writePrefectureTestPlan();

    $root = Category::where('name', PREFECTURE_ROOT)->whereNull('parent_id')->firstOrFail();
    expect($root->is_course_group)->toBeTrue();
    expect($root->children()->orderBy('order')->pluck('name')->all())->toBe(['関東', '近畿']);

    $kinki = Category::where('name', '近畿')->where('parent_id', $root->id)->firstOrFail();
    expect($kinki->is_course_group)->toBeTrue();
    expect($kinki->order)->toBe(4);
    expect($kinki->children()->orderBy('order')->pluck('name')->all())->toBe(['甲県', '乙県', '丙府', '丁県', '己県']);

    $a = Category::where('name', '甲県')->where('parent_id', $kinki->id)->firstOrFail();
    expect($a->is_course_group)->toBeFalse();
    expect(Stage::where('category_id', $a->id)->count())->toBe(3);

    $kanto = Category::where('name', '関東')->where('parent_id', $root->id)->firstOrFail();
    $all = Category::where('name', '関東まるごと')->where('parent_id', $kanto->id)->firstOrFail();
    expect(Stage::where('category_id', $all->id)->count())->toBe(3);

    // 県のコースが 近畿5 + 関東4、まるごとが 関東1 = 10コース、ステージは3つずつ
    expect($result['courses'])->toBe(10);
    expect($result['stages'])->toBe(30);
    expect($result['questions'])->toBe(Question::count());
    expect(Question::count())->toBe(300);
});

it('各級は1ステージのボス。称号は上級だけに付く(県は「県名はかせ」、まるごとは「地方名はかせ」)', function () {
    writePrefectureTestPlan();

    $a = Category::where('name', '甲県')->firstOrFail();
    $stages = Stage::where('category_id', $a->id)->orderBy('stage_number')->get()->keyBy('difficulty');

    expect($stages->keys()->sort()->values()->all())->toBe(['上級', '中級', '初級']);
    foreach ($stages as $stage) {
        expect([$stage->stage_number, $stage->is_boss, $stage->country_id, $stage->question_count])->toBe([1, true, null, 10]);
        expect($stage->questions()->count())->toBe(10);
    }
    expect($stages['初級']->title_reward)->toBeNull();
    expect($stages['中級']->title_reward)->toBeNull();
    expect($stages['上級']->title_reward)->toBe('甲県はかせ');

    $all = Category::where('name', '関東まるごと')->firstOrFail();
    expect(Stage::where('category_id', $all->id)->where('difficulty', '上級')->first()->title_reward)->toBe('関東はかせ');
});

it('難読地名には plain が入り、文字のはめ込みは項目に text が入って image は入らない', function () {
    writePrefectureTestPlan();

    $hard = Question::where('meta->flag_key', 'pref:kinki:a:advanced:1:q1')->firstOrFail();
    expect($hard->type)->toBe('multiple_choice');
    expect($hard->meta['plain'])->toBe(['a難1']);
    expect($hard->choices->where('is_correct', true))->toHaveCount(1);
    expect($hard->choices->pluck('meta')->filter()->all())->toBe([]);

    $plain = Question::where('meta->flag_key', 'pref:kinki:a:advanced:1:q2')->firstOrFail();
    expect($plain->meta)->not->toHaveKey('plain');

    $fit = Question::where('meta->flag_key', 'pref:kinki:a:intermediate:1:q3')->firstOrFail();
    expect($fit->type)->toBe('matching');
    expect($fit->meta['layout'])->toBe('slots');
    expect($fit->meta['items'])->toHaveCount(4);
    foreach ($fit->meta['items'] as $item) {
        expect($item)->toHaveKeys(['id', 'text']);
        expect($item)->not->toHaveKey('image');
        expect($item)->not->toHaveKey('label'); // 県名(枠の名前)は選択肢のほうにあり、項目からは組が分からない
    }
    expect($fit->choices)->toHaveCount(4);
    foreach ($fit->choices as $choice) {
        expect(collect($fit->meta['items'])->pluck('id'))->toContain($choice->meta['item_id']);
        expect($choice->is_correct)->toBeTrue();
    }
});

it('何度書いても、カテゴリー・ステージ・問題・選択肢が増えず、番号も変わらない', function () {
    [$plan] = writePrefectureTestPlan();

    $counts = [Category::count(), Stage::count(), Question::count(), QuestionChoice::count(), Quiz::count()];
    $ids = Question::orderBy('id')->pluck('id')->all();
    $choiceIds = QuestionChoice::orderBy('id')->pluck('id')->all();

    FlagQuizWriter::writeTree(PREFECTURE_ROOT, $plan);

    expect([Category::count(), Stage::count(), Question::count(), QuestionChoice::count(), Quiz::count()])->toBe($counts);
    expect(Question::orderBy('id')->pluck('id')->all())->toBe($ids);
    expect(QuestionChoice::orderBy('id')->pluck('id')->all())->toBe($choiceIds);
});

it('文字のはめ込みで、問題を出すときの返事から、正しい組が読み取れない(項目はidと文字だけ、選択肢はis_correctとmetaが隠れる)', function () {
    createActiveProfile();
    writePrefectureTestPlan();
    $course = Category::where('name', '甲県')->firstOrFail();
    $stage = Stage::where('category_id', $course->id)->where('difficulty', '中級')->firstOrFail();

    $questions = $this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions');
    $fit = collect($questions)->firstWhere('type', 'matching');

    expect($fit)->not->toBeNull();
    foreach ($fit['meta']['items'] as $item) {
        expect(array_keys($item))->toBe(['id', 'text']);
    }
    foreach ($fit['choices'] as $choice) {
        expect($choice)->not->toHaveKey('is_correct');
        expect($choice)->not->toHaveKey('meta'); // item_id が漏れると、正しい組が分かる
    }
});

/*
|--------------------------------------------------------------------------
| 全国(docs/design/2026-10-06-prefecture-quiz-national-design.md)
|--------------------------------------------------------------------------
*/

function writePrefectureNationalPlan(): array
{
    $plan = PrefectureQuizPlanner::plan(prefectureNationalTestCatalog());

    return [$plan, FlagQuizWriter::writeTree(PREFECTURE_ROOT, $plan)];
}

it('全国は、大もとの直下のコース(地方ではない)として書かれ、ステージは 初級3・中級4・上級4。称号は3級のボスだけ', function () {
    writePrefectureNationalPlan();

    $root = Category::where('name', PREFECTURE_ROOT)->firstOrFail();
    $national = Category::where('name', '全国')->where('parent_id', $root->id)->firstOrFail();
    expect($national->is_course_group)->toBeFalse();
    expect($national->order)->toBe(7);

    $stages = Stage::where('category_id', $national->id)->orderBy('difficulty')->orderBy('stage_number')->get()->groupBy('difficulty');
    expect($stages['初級'])->toHaveCount(3);
    expect($stages['中級'])->toHaveCount(4);
    expect($stages['上級'])->toHaveCount(4);
    expect($stages['初級']->pluck('title_reward')->all())->toBe([null, null, '全国みならい']);
    expect($stages['中級']->pluck('title_reward')->all())->toBe([null, null, null, '全国めいじん']);
    expect($stages['上級']->pluck('title_reward')->all())->toBe([null, null, null, '全国はかせ']);
    expect($stages['上級']->pluck('is_boss')->all())->toBe([false, false, false, true]);
    foreach ($stages->flatten() as $stage) {
        expect($stage->questions()->count())->toBe(10);
    }
});

it('全国も、何度書いても増えない', function () {
    [$plan] = writePrefectureNationalPlan();
    $counts = [Category::count(), Stage::count(), Question::count(), QuestionChoice::count(), Quiz::count()];

    FlagQuizWriter::writeTree(PREFECTURE_ROOT, $plan);

    expect([Category::count(), Stage::count(), Question::count(), QuestionChoice::count(), Quiz::count()])->toBe($counts);
});

it('コースの窓口: 全国は group が偽で、title は「全国はかせ」。県のバッジはない', function () {
    createActiveProfile();
    writePrefectureNationalPlan();
    $root = Category::where('name', PREFECTURE_ROOT)->firstOrFail();

    $courses = collect($this->getJson("/api/categories/{$root->id}/courses")->assertOk()->json());
    $national = $courses->firstWhere('name', '全国');

    expect($national['group'])->toBeFalse();
    expect($national['badge'])->toBeNull();
    expect($national['title'])->toBe('全国はかせ');
    expect($national['earned'])->toBeFalse();
    expect($national['total'])->toBe(11);
    expect($courses->last()['name'])->toBe('全国'); // 地方のあと、最後
});

it('全国のボスを全問正解すると称号が付くが、県のバッジの絵(title_badge)は付かない', function () {
    createActiveProfile();
    writePrefectureNationalPlan();
    $national = Category::where('name', '全国')->firstOrFail();
    $boss = Stage::where('category_id', $national->id)->where('difficulty', '上級')->where('is_boss', true)->firstOrFail();

    $response = $this->postJson("/api/stages/{$boss->id}/complete", ['score' => 10])->assertOk();

    expect($response->json('title_granted'))->toBeTrue();
    expect($response->json('title'))->toBe('全国はかせ');
    expect($response->json('title_badge'))->toBeNull();
});

function poolPlan(?int $draw): array
{
    $questions = array_map(fn (int $i) => [
        'key' => "test:pool:{$i}", 'type' => 'multiple_choice', 'prompt' => "問題{$i}",
        'choices' => [
            ['label' => '正', 'correct' => true, 'image' => null],
            ['label' => '誤1', 'correct' => false, 'image' => null],
            ['label' => '誤2', 'correct' => false, 'image' => null],
            ['label' => '誤3', 'correct' => false, 'image' => null],
        ],
    ], range(1, 20));

    return [['key' => 'pool', 'name' => 'プールコース', 'order' => 1, 'levels' => [[
        'code' => 'beginner', 'difficulty' => '初級',
        'stages' => [['number' => 1, 'boss' => true, 'title_reward' => null, 'questions' => $questions]
            + ($draw ? ['draw' => $draw, 'reward_percent' => 50] : [])],
    ]]]];
}

it('計画の draw は、出す数(question_count)・プールの印・報酬の割合として書く', function () {
    FlagQuizWriter::writeTree('テスト大もと', poolPlan(10));
    FlagQuizWriter::writeTree('テスト大もと', poolPlan(10));

    $stage = Stage::firstOrFail();
    expect($stage->question_count)->toBe(10)
        ->and($stage->is_pool)->toBeTrue()
        ->and($stage->reward_percent)->toBe(50)
        ->and($stage->questions()->count())->toBe(20)
        ->and(Question::count())->toBe(20);
});

it('draw のない計画は、今まで通り(問題の数・プールでない・報酬100)', function () {
    FlagQuizWriter::writeTree('テスト大もと', poolPlan(null));

    $stage = Stage::firstOrFail();
    expect($stage->question_count)->toBe(20)
        ->and($stage->is_pool)->toBeFalse()
        ->and($stage->reward_percent)->toBe(100);
});
