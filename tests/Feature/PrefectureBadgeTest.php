<?php

use App\Models\Category;
use App\Models\ProfileTitle;
use App\Models\Stage;
use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\Prefecture\PrefectureQuizPlanner;

/*
|--------------------------------------------------------------------------
| 県の称号とバッジ(docs/design/2026-10-05-prefecture-quiz-design.md 2章・7-2)
|--------------------------------------------------------------------------
*/

function prefectureBossStage(string $title = '大阪府はかせ', ?string $reward = '大阪府はかせ'): Stage
{
    $category = Category::create(['name' => '大阪府'.random_int(1, 99999)]);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '上級', 'stage_number' => 1, 'question_count' => 2, 'is_boss' => true, 'title_reward' => $reward]);
    [$q1] = createQuestionWithChoices();
    [$q2] = createQuestionWithChoices();
    $stage->questions()->attach([$q1->id => ['order' => 1], $q2->id => ['order' => 2]]);

    return $stage;
}

it('県の上級のボスを全問正解すると、称号が付き、完了の返事に県のバッジの絵が付く。もう一度やっても称号は1度だけ', function () {
    createActiveProfile();
    $stage = prefectureBossStage();

    $first = $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 2])->assertOk();
    expect($first->json('title_granted'))->toBeTrue();
    expect($first->json('title'))->toBe('大阪府はかせ');
    expect($first->json('title_badge'))->toBe('/badge/pref/osaka.webp');

    $second = $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 2])->assertOk();
    expect($second->json('title_granted'))->toBeFalse();
    expect($second->json('title_badge'))->toBe('/badge/pref/osaka.webp');
    expect(ProfileTitle::where('title', '大阪府はかせ')->count())->toBe(1);
});

it('上級のボスで1問まちがえると、称号は付かない', function () {
    createActiveProfile();
    $stage = prefectureBossStage();

    $response = $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 1])->assertOk();

    expect($response->json('title_granted'))->toBeFalse();
    expect(ProfileTitle::where('title', '大阪府はかせ')->count())->toBe(0);
});

it('県の称号でないもの(地方まるごと・国旗・称号のないボス)には、バッジの絵が付かない', function () {
    createActiveProfile();

    $region = prefectureBossStage('近畿はかせ', '近畿はかせ');
    $flag = prefectureBossStage('アジアの国旗はかせ', 'アジアの国旗はかせ');
    $none = prefectureBossStage('なし', null);

    foreach ([$region, $flag, $none] as $stage) {
        $response = $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 2])->assertOk();
        expect($response->json('title_badge'))->toBeNull();
    }
});

it('書き込んだ計画では、初級・中級のボスは全問正解でも称号が付かず、上級だけ付く', function () {
    createActiveProfile();
    FlagQuizWriter::writeTree('都道府県クイズ', PrefectureQuizPlanner::plan(prefectureTestCatalog()));
    $course = Category::where('name', '甲県')->firstOrFail();

    foreach (['初級', '中級'] as $difficulty) {
        $stage = Stage::where('category_id', $course->id)->where('difficulty', $difficulty)->firstOrFail();
        $response = $this->postJson("/api/stages/{$stage->id}/complete", ['score' => 10])->assertOk();
        expect($response->json('title_granted'))->toBeFalse();
        expect($response->json('title'))->toBeNull();
    }

    $advanced = Stage::where('category_id', $course->id)->where('difficulty', '上級')->firstOrFail();
    $response = $this->postJson("/api/stages/{$advanced->id}/complete", ['score' => 10])->assertOk();
    expect($response->json('title_granted'))->toBeTrue();
    expect($response->json('title'))->toBe('甲県はかせ');
    expect($response->json('title_badge'))->toBeNull(); // テスト用の県名は、本物の県ではない
});
