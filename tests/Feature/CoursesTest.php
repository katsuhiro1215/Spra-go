<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
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
        ['id' => $first->id, 'name' => 'アジア', 'cleared' => 1, 'total' => 3],
        ['id' => $second->id, 'name' => 'ヨーロッパ', 'cleared' => 0, 'total' => 2],
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
