<?php

use App\Models\Category;
use App\Models\ProfileTitle;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\Prefecture\PrefectureCatalog;

/** 県マスター(docs/design/2026-10-06-prefecture-master-design.md 2・4章) */

/** 県の上級ボスを作る。$place が真なら地名コース、そうでなければ一般コース。出す数は $count、プールは $pool 問 */
function createPrefectureBoss(string $prefecture, bool $place, string $difficulty = '上級', int $pool = 6, int $count = 3): Stage
{
    $group = Category::firstOrCreate(['name' => 'テスト地方'], ['is_course_group' => true]);
    $category = Category::firstOrCreate(['name' => $place ? "{$prefecture} 地名" : $prefecture, 'parent_id' => $group->id]);
    $quiz = Quiz::create(['title' => "{$category->name}{$difficulty}", 'difficulty' => $difficulty]);
    $stage = Stage::create([
        'category_id' => $category->id, 'difficulty' => $difficulty, 'stage_number' => 1,
        'question_count' => $count, 'is_boss' => true, 'is_pool' => $place,
        'title_reward' => $place ? null : PrefectureCatalog::title($prefecture),
    ]);
    for ($i = 1; $i <= $pool; $i++) {
        $question = Question::create(['quiz_id' => $quiz->id, 'prompt' => "{$category->name}{$difficulty}{$i}"]);
        $question->choices()->create(['label' => '正', 'is_correct' => true, 'order' => 1]);
        $stage->questions()->attach($question->id, ['order' => $i]);
    }

    return $stage;
}

function titlesOf($profile): array
{
    return ProfileTitle::where('user_profile_id', $profile->id)->pluck('title')->all();
}

it('はかせを持ち、地名の上級ボスを満点でクリアすると、マスターが付く', function () {
    $profile = createActiveProfile();
    $general = createPrefectureBoss('北海道', false, pool: 3);
    $place = createPrefectureBoss('北海道', true);

    $this->postJson("/api/stages/{$general->id}/complete", ['score' => 3])->assertJsonPath('title', '北海道はかせ');
    $response = $this->postJson("/api/stages/{$place->id}/complete", ['score' => 3])->assertOk();

    $response->assertJsonPath('title_granted', true)->assertJsonPath('title', '北海道マスター')->assertJsonPath('title_badge', '/badge/pref/hokkaido.webp');
    expect(titlesOf($profile))->toContain('北海道はかせ', '北海道マスター');
});

it('地名が先でも、あとからはかせを取った時点でマスターも付く。返事はマスター', function () {
    $profile = createActiveProfile();
    $general = createPrefectureBoss('北海道', false, pool: 3);
    $place = createPrefectureBoss('北海道', true);

    $this->postJson("/api/stages/{$place->id}/complete", ['score' => 3])->assertJsonPath('title_granted', false);
    expect(titlesOf($profile))->toBe([]);

    $this->postJson("/api/stages/{$general->id}/complete", ['score' => 3])->assertJsonPath('title_granted', true)->assertJsonPath('title', '北海道マスター');
    expect(titlesOf($profile))->toContain('北海道はかせ', '北海道マスター');
});

it('はかせなしでは、マスターは付かない', function () {
    $profile = createActiveProfile();
    $place = createPrefectureBoss('北海道', true);

    $this->postJson("/api/stages/{$place->id}/complete", ['score' => 3])->assertOk();

    expect(titlesOf($profile))->toBe([]);
});

it('地名の上級ボスが満点でなければ、マスターは付かない', function () {
    $profile = createActiveProfile();
    $general = createPrefectureBoss('北海道', false, pool: 3);
    $place = createPrefectureBoss('北海道', true);

    $this->postJson("/api/stages/{$general->id}/complete", ['score' => 3]);
    $this->postJson("/api/stages/{$place->id}/complete", ['score' => 2]);

    expect(titlesOf($profile))->toBe(['北海道はかせ']);
});

it('マスターは二重に付かない', function () {
    $profile = createActiveProfile();
    $general = createPrefectureBoss('北海道', false, pool: 3);
    $place = createPrefectureBoss('北海道', true);
    $this->postJson("/api/stages/{$general->id}/complete", ['score' => 3]);

    $this->postJson("/api/stages/{$place->id}/complete", ['score' => 3])->assertJsonPath('title_granted', true);
    $this->postJson("/api/stages/{$place->id}/complete", ['score' => 3])->assertJsonPath('title_granted', false);

    expect(collect(titlesOf($profile))->filter(fn ($t) => $t === '北海道マスター'))->toHaveCount(1);
});

it('別の県の地名では付かない。最高難易度のクリアは条件に入らない', function () {
    $profile = createActiveProfile();
    $general = createPrefectureBoss('北海道', false, pool: 3);
    $other = createPrefectureBoss('青森県', true);
    $expert = createPrefectureBoss('北海道', true, '最高難易度');
    $this->postJson("/api/stages/{$general->id}/complete", ['score' => 3]);

    $this->postJson("/api/stages/{$other->id}/complete", ['score' => 3]);
    $this->postJson("/api/stages/{$expert->id}/complete", ['score' => 3]);

    expect(titlesOf($profile))->toBe(['北海道はかせ']);
});

it('マスターの称号でも、その県のバッジの絵が分かる', function () {
    expect(PrefectureCatalog::badgeForTitle('大阪府マスター'))->toBe('/badge/pref/osaka.webp')
        ->and(PrefectureCatalog::badgeForTitle('大阪府はかせ'))->toBe('/badge/pref/osaka.webp')
        ->and(PrefectureCatalog::badgeForTitle('大阪府ふつう'))->toBeNull();
});
