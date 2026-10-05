<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\ProfileTitle;
use App\Models\Stage;

/*
|--------------------------------------------------------------------------
| コースの一覧(docs/design/2026-10-05-flag-quiz-design.md 7-3)
|--------------------------------------------------------------------------
*/

it('コース親の子を、order順に、クリアしたステージの数と全部の数つきで返す', function () {
    $profile = createActiveProfile();
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);
    $second = miniQuizCategory('ヨーロッパ', 2, ['parent' => $group->id, 'order' => 2]);
    $first = miniQuizCategory('アジア', 3, ['parent' => $group->id, 'order' => 1]);

    $cleared = Stage::where('category_id', $first->id)->orderBy('stage_number')->first();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $cleared->id, 'cleared_at' => now(), 'best_score' => 10, 'attempts' => 1]);

    $this->getJson("/api/categories/{$group->id}/courses")->assertOk()->assertExactJson([
        ['id' => $first->id, 'name' => 'アジア', 'cleared' => 1, 'total' => 3, 'group' => false, 'badge' => null, 'title' => null, 'earned' => false],
        ['id' => $second->id, 'name' => 'ヨーロッパ', 'cleared' => 0, 'total' => 2, 'group' => false, 'badge' => null, 'title' => null, 'earned' => false],
    ]);
});

it('問題のあるステージが無いコースは出さない', function () {
    createActiveProfile();
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);
    miniQuizCategory('からっぽ', 3, ['parent' => $group->id, 'questions' => false]);

    $this->getJson("/api/categories/{$group->id}/courses")->assertOk()->assertExactJson([]);
});

it('別のプレイヤーのクリアは数えない', function () {
    $profile = createActiveProfile();
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);
    $course = miniQuizCategory('アジア', 1, ['parent' => $group->id]);
    $other = createFamilyMember($profile);
    $stage = Stage::where('category_id', $course->id)->first();
    ProfileStageProgress::create(['user_profile_id' => $other->id, 'stage_id' => $stage->id, 'cleared_at' => now(), 'best_score' => 10, 'attempts' => 1]);

    $this->getJson("/api/categories/{$group->id}/courses")->assertOk()->assertJsonPath('0.cleared', 0);
});

it('コース親でないカテゴリーは404', function () {
    createActiveProfile();
    $plain = Category::create(['name' => '国旗']);

    $this->getJson("/api/categories/{$plain->id}/courses")->assertStatus(404);
});

it('ログインしていないと401', function () {
    $group = Category::create(['name' => '国旗クイズ', 'is_course_group' => true]);

    $this->getJson("/api/categories/{$group->id}/courses")->assertStatus(401);
});

/** 大もと → 地方(コース親) → 県のコース(上級のボスに称号つき) を、本物と同じ形で作る */
function prefectureNesting(): array
{
    $root = Category::create(['name' => '都道府県クイズ', 'is_course_group' => true]);
    $region = Category::create(['name' => '近畿', 'parent_id' => $root->id, 'order' => 1, 'is_course_group' => true]);
    $course = Category::create(['name' => '大阪府', 'parent_id' => $region->id, 'order' => 1]);
    $all = Category::create(['name' => '近畿まるごと', 'parent_id' => $region->id, 'order' => 2]);

    foreach ([$course->id => '大阪府はかせ', $all->id => '近畿はかせ'] as $categoryId => $title) {
        foreach (['初級' => null, '中級' => null, '上級' => $title] as $difficulty => $reward) {
            $stage = Stage::create(['category_id' => $categoryId, 'difficulty' => $difficulty, 'stage_number' => 1, 'is_boss' => true, 'title_reward' => $reward, 'question_count' => 1]);
            [$question] = createQuestionWithChoices();
            $stage->questions()->attach($question->id, ['order' => 1]);
        }
    }

    return [$root, $region, $course, $all];
}

it('コース親の子が、さらにコース親(地方)のとき、group が真で、クリア数・全部の数は、その下のステージの合計', function () {
    $profile = createActiveProfile();
    [$root, $region, $course] = prefectureNesting();
    $stage = Stage::where('category_id', $course->id)->where('difficulty', '初級')->first();
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stage->id, 'cleared_at' => now(), 'best_score' => 1, 'attempts' => 1]);

    $this->getJson("/api/categories/{$root->id}/courses")->assertOk()->assertExactJson([
        ['id' => $region->id, 'name' => '近畿', 'cleared' => 1, 'total' => 6, 'group' => true, 'badge' => null, 'title' => null, 'earned' => false],
    ]);
});

it('県のコースには、県のバッジ・上級のボスの称号・もらったかが付く。まるごとには、バッジがない', function () {
    $profile = createActiveProfile();
    [, $region, , $all] = prefectureNesting();

    $response = $this->getJson("/api/categories/{$region->id}/courses")->assertOk();
    $response->assertJsonPath('0.name', '大阪府')
        ->assertJsonPath('0.badge', '/badge/pref/osaka.webp')
        ->assertJsonPath('0.title', '大阪府はかせ')
        ->assertJsonPath('0.earned', false)
        ->assertJsonPath('0.group', false)
        ->assertJsonPath('1.id', $all->id)
        ->assertJsonPath('1.badge', null)
        ->assertJsonPath('1.title', '近畿はかせ')
        ->assertJsonPath('1.earned', false);

    ProfileTitle::create(['user_profile_id' => $profile->id, 'title' => '大阪府はかせ', 'unlocked_at' => now()]);

    $this->getJson("/api/categories/{$region->id}/courses")->assertOk()
        ->assertJsonPath('0.earned', true)
        ->assertJsonPath('1.earned', false);
});

it('称号は、プロフィールごと。別のプレイヤーがもらった称号は、もらったことにならない', function () {
    $profile = createActiveProfile();
    [, $region] = prefectureNesting();
    $other = createFamilyMember($profile);
    ProfileTitle::create(['user_profile_id' => $other->id, 'title' => '大阪府はかせ', 'unlocked_at' => now()]);

    $this->getJson("/api/categories/{$region->id}/courses")->assertOk()->assertJsonPath('0.earned', false);
});
