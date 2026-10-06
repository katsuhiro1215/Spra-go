<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Question;
use App\Models\Stage;
use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\Prefecture\PlaceNameQuizPlanner;
use App\Support\Prefecture\PrefectureCatalog;
use Database\Seeders\PrefectureQuizSeeder;

/** 地名コースの取り込みと、最高難易度の鍵(docs/design/2026-10-06-prefecture-master-design.md 2・4章) */

/** 北海道と青森だけの元原稿で、地名コースを書く(全県を書くと遅いので) */
function writeSmallPlaceNamePlan(): array
{
    $dir = sys_get_temp_dir().'/place-names-test-'.uniqid();
    mkdir($dir);
    foreach (['01-hokkaido', '02-aomori'] as $name) {
        copy(database_path("data/place-names/{$name}.csv"), "{$dir}/{$name}.csv");
    }

    return FlagQuizWriter::writeTree(PrefectureQuizSeeder::ROOT_NAME, PlaceNameQuizPlanner::plan(PrefectureCatalog::all(), $dir));
}

it('地名コースは、同じ地方の下に作られ、何度書いても増えない', function () {
    $first = writeSmallPlaceNamePlan();
    $second = writeSmallPlaceNamePlan();

    expect($first)->toBe(['courses' => 2, 'stages' => 8, 'questions' => 110])->and($second)->toBe($first);
    $group = Category::where('name', '北海道・東北')->firstOrFail();
    expect($group->children()->orderBy('order')->pluck('name')->all())->toBe(['北海道 地名', '青森県 地名'])
        ->and(Question::count())->toBe(110)
        ->and(Stage::where('is_pool', true)->count())->toBe(8);
});

it('最高難易度は、上級のボスをクリアするまで鍵がかかる。4つ目の級として出る', function () {
    $profile = createActiveProfile();
    writeSmallPlaceNamePlan();
    $course = Category::where('name', '北海道 地名')->firstOrFail();

    $levels = collect($this->getJson("/api/categories/{$course->id}/stages")->assertOk()->json())->keyBy('difficulty');
    expect($levels->keys()->all())->toBe(['初級', '中級', '上級', '最高難易度'])
        ->and($levels['最高難易度']['locked'])->toBeTrue();

    $advanced = Stage::where('category_id', $course->id)->where('difficulty', '上級')->firstOrFail();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $advanced->id, 'best_score' => 10, 'cleared_at' => now(), 'attempts' => 1]);

    $levels = collect($this->getJson("/api/categories/{$course->id}/stages")->assertOk()->json())->keyBy('difficulty');
    expect($levels['最高難易度']['locked'])->toBeFalse();
});

it('最高難易度のステージがないカテゴリーは、今まで通り3級だけを返す', function () {
    createActiveProfile();
    $stage = createPoolStage(3, 3, false, true, '普通のカテゴリー');

    $levels = $this->getJson("/api/categories/{$stage->category_id}/stages")->assertOk()->json();

    expect(collect($levels)->pluck('difficulty')->all())->toBe(['初級', '中級', '上級']);
});

it('地方のコース一覧に、地名コースが県のコースと並んで出る(称号・バッジはなし)', function () {
    createActiveProfile();
    writeSmallPlaceNamePlan();
    $group = Category::where('name', '北海道・東北')->firstOrFail();

    $courses = collect($this->getJson("/api/categories/{$group->id}/courses")->assertOk()->json())->keyBy('name');

    expect($courses->keys()->all())->toBe(['北海道 地名', '青森県 地名']);
    expect($courses['北海道 地名']['title'] ?? null)->toBeNull()
        ->and($courses['北海道 地名']['earned'] ?? false)->toBeFalse();
});

it('問題ごとの読み(readings)が、問題の meta に書かれ、問題の取得で返る', function () {
    createActiveProfile();
    writeSmallPlaceNamePlan();

    $question = Question::where('prompt', '北海道の『旭川』は、なんて よむ？')->firstOrFail();
    expect($question->meta['readings']['上川'])->toBe('かみかわ')
        ->and($question->meta['plain'])->toBe(['旭川']);

    $stage = Stage::where('is_pool', true)->whereHas('category', fn ($q) => $q->where('name', '北海道 地名'))->where('difficulty', '初級')->firstOrFail();
    $questions = collect($this->getJson("/api/stages/{$stage->id}")->assertOk()->json('questions'));
    expect($questions->contains(fn ($q) => isset($q['meta']['readings'])))->toBeTrue();
});
