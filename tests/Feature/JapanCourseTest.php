<?php

use App\Models\Category;
use App\Models\Country;
use App\Models\ProfileStageDraw;
use App\Models\ProfileStageProgress;
use App\Models\Question;
use App\Models\QuestionTheme;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\CoursePoolBuilder;
use App\Support\StageDraw;

// docs/design/2026-10-21-japan-themed-course-design.md（日本のコースを、分野ごとのステージにする）

/** 取り込みを済ませた形(分野1〜8 = ステージ21〜28 と、地図=11・祝日行事=12)の日本のコースを作る。分野ごとに、難しさ1〜3の問題を3つ */
function createImportedJapan(array $levels = ['初級']): Country
{
    $country = Country::create(['code' => 'jp', 'three_code' => 'JPN', 'name' => '日本', 'name_en' => 'Japan', 'country_code' => 392]);
    $root = Category::firstOrCreate(['name' => '国旗', 'parent_id' => null]);
    $category = Category::create(['name' => '日本', 'parent_id' => $root->id]);
    foreach ($levels as $level) {
        $quiz = Quiz::create(['title' => "日本{$level}", 'difficulty' => $level, 'country_id' => $country->id]);
        foreach ([21, 22, 23, 24, 25, 26, 27, 28, 11, 12] as $number) {
            $stage = Stage::create(['category_id' => $category->id, 'country_id' => $country->id, 'difficulty' => $level, 'stage_number' => $number, 'question_count' => 3]);
            foreach ([1, 2, 3] as $grade) {
                $question = Question::create(['quiz_id' => $quiz->id, 'country_id' => $country->id, 'prompt' => "{$level}-{$number}-{$grade}", 'meta' => $number >= 21 ? ['grade' => $grade, 'key' => "K{$level}{$number}{$grade}"] : null]);
                $stage->questions()->attach($question->id, ['order' => $grade]);
            }
        }
    }

    return $country;
}

function japanStages(Country $country, string $level)
{
    return Stage::where('country_id', $country->id)->where('difficulty', $level)->orderBy('stage_number')->get();
}

it('日本の級を、8つの分野のステージ＋ボスの9ステージに並べ直す。テーマの名前が付く', function () {
    $country = createImportedJapan();

    CoursePoolBuilder::buildCountry($country);

    $stages = japanStages($country, '初級');
    expect($stages->pluck('stage_number')->all())->toBe(range(1, 9))
        ->and($stages->take(8)->pluck('theme_name')->all())->toBe(array_values(config('japan_course.fields')))
        ->and($stages->last()->is_boss)->toBeTrue()->and($stages->last()->theme_name)->toBe('日本のまとめ')
        ->and($stages->last()->title_reward)->toBe('日本はかせ');
    foreach ($stages->take(8) as $stage) {
        expect($stage->is_boss)->toBeFalse()->and($stage->is_pool)->toBeTrue()->and($stage->question_count)->toBe(10);
    }
    expect($stages->last()->question_count)->toBe(15);
});

it('分野のステージには、その分野の問題だけが入り、やさしい順に並ぶ。ボスは全分野', function () {
    $country = createImportedJapan();

    CoursePoolBuilder::buildCountry($country);

    $stages = japanStages($country, '初級');
    $first = $stages->first()->questions()->get();
    expect($first->pluck('prompt')->all())->toBe(['初級-21-1', '初級-21-2', '初級-21-3']);
    // 地図(ステージ11)は分野3、祝日行事(ステージ12)は分野6に入る
    expect($stages[2]->questions()->pluck('prompt')->all())->toContain('初級-23-1', '初級-11-1')
        ->and($stages[5]->questions()->pluck('prompt')->all())->toContain('初級-26-1', '初級-12-1')
        ->and($stages->last()->questions()->count())->toBe(8 * 3 + 6);
});

it('難しさのない前からの問題には、級に合う印（初級2・中級3・上級4）を書く', function () {
    $country = createImportedJapan(['初級', '上級']);

    CoursePoolBuilder::buildCountry($country);

    expect(Question::where('prompt', '初級-11-1')->first()->meta['grade'])->toBe(2)
        ->and(Question::where('prompt', '上級-12-3')->first()->meta['grade'])->toBe(4)
        ->and(Question::where('prompt', '初級-21-3')->first()->meta['grade'])->toBe(3);
});

it('絵・地図のない問題には、国旗を出さない印（no_flag）を書く。絵のある問題・地図の問題には書かない', function () {
    $country = createImportedJapan();
    Question::where('prompt', '初級-21-1')->update(['meta' => ['grade' => 1, 'image' => '/quiz/jp/x.webp']]);
    Question::where('prompt', '初級-11-1')->update(['meta' => ['map' => ['view' => 'japan', 'highlight' => 'tokyo']]]);

    CoursePoolBuilder::buildCountry($country);

    expect(Question::where('prompt', '初級-21-2')->first()->meta['no_flag'])->toBeTrue()
        ->and(Question::where('prompt', '初級-12-1')->first()->meta['no_flag'])->toBeTrue()
        ->and(Question::where('prompt', '初級-21-1')->first()->meta)->not->toHaveKey('no_flag')
        ->and(Question::where('prompt', '初級-11-1')->first()->meta)->not->toHaveKey('no_flag');
});

it('ボスの先頭5問(固定)は、いろいろな分野の難しい問題になる', function () {
    $country = createImportedJapan();

    CoursePoolBuilder::buildCountry($country);

    $boss = japanStages($country, '初級')->last();
    $first = $boss->questions()->limit(5)->get();
    expect($first->pluck('prompt')->map(fn (string $p) => explode('-', $p)[1])->unique()->count())->toBe(5)
        ->and($first->every(fn (Question $q) => $q->meta['grade'] === 3 || $q->meta['grade'] === 4))->toBeTrue();
});

it('原稿を取り込んでいない級は、いまのまま。ステージの番号が余らない', function () {
    $country = createImportedJapan(['初級']);
    $category = Category::where('name', '日本')->first();
    $old = Stage::create(['category_id' => $category->id, 'country_id' => $country->id, 'difficulty' => '中級', 'stage_number' => 3, 'question_count' => 5]);

    CoursePoolBuilder::buildCountry($country);

    expect($old->fresh())->not->toBeNull()->and($old->fresh()->theme_name)->toBeNull()
        ->and(japanStages($country, '初級')->pluck('stage_number')->max())->toBe(9);
});

it('もう一度並べ直しても同じ。クリアの記録は残る。ステージの意味が変わった最初の1回だけ、前の記録を消す', function () {
    $country = createImportedJapan();
    $category = Category::where('name', '日本')->first();
    // 前の道(テーマの名前がない)のステージ1に、クリアの記録がある
    $profile = createActiveProfile();
    $oldStage = Stage::create(['category_id' => $category->id, 'country_id' => $country->id, 'difficulty' => '初級', 'stage_number' => 1, 'question_count' => 10]);
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $oldStage->id, 'cleared_at' => now(), 'best_score' => 8, 'attempts' => 1]);
    ProfileStageDraw::create(['user_profile_id' => $profile->id, 'stage_id' => $oldStage->id, 'question_ids' => [1, 2]]);

    CoursePoolBuilder::buildCountry($country);

    $stage = japanStages($country, '初級')->first();
    expect($stage->id)->toBe($oldStage->id)
        ->and(ProfileStageProgress::where('stage_id', $stage->id)->count())->toBe(0)
        ->and(ProfileStageDraw::where('stage_id', $stage->id)->count())->toBe(0);

    // 新しいステージのクリアは、もう一度並べ直しても残る(取り込みのステージを作り直して、本番の流れをまねる)
    ProfileStageProgress::create(['user_profile_id' => $profile->id, 'stage_id' => $stage->id, 'cleared_at' => now(), 'best_score' => 9, 'attempts' => 1]);
    $imported = Stage::create(['category_id' => $category->id, 'country_id' => $country->id, 'difficulty' => '初級', 'stage_number' => 21, 'question_count' => 3]);
    $imported->questions()->attach(Question::where('prompt', '初級-21-1')->first()->id, ['order' => 1]);

    CoursePoolBuilder::buildCountry($country);
    CoursePoolBuilder::buildCountry($country);

    expect(ProfileStageProgress::where('stage_id', $stage->id)->count())->toBe(1)
        ->and(japanStages($country, '初級')->pluck('stage_number')->all())->toBe(range(1, 9));
});

it('取り込みは、問題の番号(key)で見分け、同じ問題文の別の問題も取り込む。難しさ・解説・画像も入り、もう一度取り込んでも増えない', function () {
    Country::create(['code' => 'JP', 'three_code' => 'JPN', 'name' => '日本', 'name_en' => 'Japan', 'country_code' => 392]);
    QuestionTheme::create(['key' => 'geography', 'label' => 'geography']);
    $question = fn (string $key, int $grade, string $right) => [
        'key' => $key, 'type' => 'multiple_choice', 'prompt' => '県と県庁所在地の正しい組み合わせは？', 'grade' => $grade, 'explanation' => "{$right}だよ。", 'image' => '/quiz/jp/x.webp',
        'choices' => [['label' => $right, 'is_correct' => true], ['label' => 'あ', 'is_correct' => false], ['label' => 'い', 'is_correct' => false], ['label' => 'う', 'is_correct' => false]],
    ];
    $data = ['country_name' => '日本', 'country_code' => 'JP', 'difficulty' => '初級', 'stages' => [
        ['stage_number' => 24, 'theme_key' => 'geography', 'theme_name' => '県庁所在地', 'is_boss' => false, 'questions' => [$question('JP04-B-001', 1, '岩手県―盛岡市'), $question('JP04-B-002', 2, '群馬県―前橋市'), [...$question('JP04-T', 1, 'x'), 'type' => 'true_false', 'choices' => [['label' => 'ただしい', 'is_correct' => true], ['label' => 'まちがい', 'is_correct' => false]]]]],
    ]];
    $path = tempnam(sys_get_temp_dir(), 'jp_fields_').'.json';
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE));

    $this->artisan('content:import', ['file' => $path])->assertSuccessful();
    $this->artisan('content:import', ['file' => $path])->assertSuccessful();

    expect(Question::count())->toBe(3);
    $first = Question::where('meta->key', 'JP04-B-001')->first();
    expect($first->meta['grade'])->toBe(1)->and($first->meta['image'])->toBe('/quiz/jp/x.webp')
        ->and($first->explanation)->toBe(['summary' => '岩手県―盛岡市だよ。'])
        ->and(Question::where('meta->key', 'JP04-T')->first()->type)->toBe('true_false')
        ->and(Stage::first()->theme_name)->toBe('県庁所在地');

    // 難しさ・解説が変わったら、書き換わる
    $data['stages'][0]['questions'][0]['grade'] = 4;
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE));
    $this->artisan('content:import', ['file' => $path])->assertSuccessful();
    expect($first->fresh()->meta['grade'])->toBe(4)->and(Question::count())->toBe(3);
});

it('抽選したステージの問題は、やさしい順（難しさの印の昇順）に並ぶ', function () {
    $category = Category::create(['name' => '並び']);
    $quiz = Quiz::create(['title' => '並びクイズ', 'difficulty' => '初級']);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => '初級', 'stage_number' => 1, 'question_count' => 5, 'is_boss' => false, 'is_pool' => true]);
    foreach ([[1, 'a'], [5, 'b'], [3, 'c'], [2, 'd'], [4, 'e'], [3, 'f']] as $i => [$grade, $prompt]) {
        $question = Question::create(['quiz_id' => $quiz->id, 'prompt' => $prompt, 'meta' => ['grade' => $grade]]);
        $stage->questions()->attach($question->id, ['order' => $i + 1]);
    }
    $profile = createActiveProfile();

    $ids = StageDraw::pick($profile, $stage->fresh());

    $grades = Question::whereIn('id', $ids)->get()->keyBy('id')->map(fn ($q) => $q->meta['grade']);
    $ordered = collect($ids)->map(fn ($id) => $grades[$id])->all();
    expect($ordered)->toHaveCount(5);
    // 少しゆらすだけ(1未満)なので、違う難しさの順番は、かならず守られる
    $sorted = $ordered;
    sort($sorted);
    expect($ordered)->toBe($sorted);
});

it('ステージを遊ぶAPIは、テーマの名前を返し、やさしい順を保つ', function () {
    $country = createImportedJapan();
    CoursePoolBuilder::buildCountry($country);
    createActiveProfile();
    $stage = japanStages($country, '初級')->first();

    $response = $this->getJson("/api/stages/{$stage->id}")->assertOk()->assertJsonPath('theme_name', '日本のことばとマナー');

    $prompts = collect($response->json('questions'))->pluck('prompt')->all();
    expect($prompts)->toBe(['初級-21-1', '初級-21-2', '初級-21-3']);
});
