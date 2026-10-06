<?php

use App\Models\Category;
use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\StageDraw;
use Illuminate\Support\Facades\DB;

/** 英語コースのレベルの階段(docs/design/2026-10-07-english-levels-design.md 4-3・4-4) */

/**
 * 初級(レベル1〜60)の10ステージと、プールを作る。レベルごとに単語4語(レベル11以上は英→日と日→英の2問ずつ)、
 * レベル11以上は文章2問。問題の meta は english:import と同じ形
 *
 * @return array<int, Stage> ステージ番号 => ステージ
 */
function createLeveledCourse(string $difficulty = '初級', int $from = 1, int $to = 60): array
{
    $category = Category::firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);
    $quiz = Quiz::firstOrCreate(['title' => "英語を学ぶ {$difficulty}"], ['difficulty' => $difficulty]);
    $ids = [];
    $order = 0;

    $make = function (string $prompt, array $meta) use ($quiz, &$ids, &$order) {
        $id = DB::table('questions')->insertGetId(['quiz_id' => $quiz->id, 'type' => 'multiple_choice', 'prompt' => $prompt, 'order' => ++$order, 'meta' => json_encode($meta), 'created_at' => now(), 'updated_at' => now()]);
        $ids[] = $id;
    };

    for ($level = $from; $level <= $to; $level++) {
        foreach (range(1, 4) as $n) {
            $word = "w{$level}_{$n}";
            $make("「{$word}」の意味は？", ['kind' => 'word', 'level' => $level, 'direction' => 'en_ja', 'word' => $word]);
            if ($level > 10) {
                $make("「{$word}」を表す英単語は？", ['kind' => 'word', 'level' => $level, 'direction' => 'ja_en', 'word' => $word]);
            }
        }
        if ($level > 10) {
            foreach ([1, 2] as $n) {
                $make("s{$level}_{$n}", ['kind' => 'sentence', 'level' => $level]);
            }
        }
    }

    $stages = [];
    foreach (range(1, 10) as $number) {
        $stage = Stage::create(['category_id' => $category->id, 'country_id' => null, 'difficulty' => $difficulty, 'stage_number' => $number, 'question_count' => $number === 10 ? 15 : 10, 'is_boss' => $number === 10, 'is_pool' => true]);
        $stage->questions()->attach(collect($ids)->mapWithKeys(fn ($id, $i) => [$id => ['order' => $i + 1]])->all());
        $stages[$number] = $stage;
    }

    return $stages;
}

function drawn(array $ids)
{
    return Question::whereIn('id', $ids)->get();
}

it('ステージの受け持つレベル: 級のレベルを9つに分ける(余りは前のステージから1つずつ)。ボスは範囲なし', function () {
    $make = fn (string $difficulty, int $number) => new Stage(['difficulty' => $difficulty, 'stage_number' => $number, 'is_boss' => $number === 10]);

    expect(StageDraw::levelRange($make('初級', 1)))->toBe([1, 7])
        ->and(StageDraw::levelRange($make('初級', 6)))->toBe([36, 42])
        ->and(StageDraw::levelRange($make('初級', 7)))->toBe([43, 48])
        ->and(StageDraw::levelRange($make('初級', 9)))->toBe([55, 60])
        ->and(StageDraw::levelRange($make('中級', 1)))->toBe([61, 65])
        ->and(StageDraw::levelRange($make('中級', 4)))->toBe([76, 80])
        ->and(StageDraw::levelRange($make('中級', 5)))->toBe([81, 84])
        ->and(StageDraw::levelRange($make('中級', 9)))->toBe([97, 100])
        ->and(StageDraw::levelRange($make('上級', 1)))->toBe([101, 106])
        ->and(StageDraw::levelRange($make('上級', 6)))->toBe([131, 135])
        ->and(StageDraw::levelRange($make('上級', 9)))->toBe([146, 150])
        ->and(StageDraw::levelRange($make('初級', 10)))->toBeNull();
});

it('英語→日本語の割合(%): レベルの区分ごと', function () {
    $share = fn (int $level) => StageDraw::directionShare($level);

    expect([$share(1), $share(10)])->toBe([100, 100])
        ->and([$share(11), $share(20)])->toBe([80, 80])
        ->and([$share(21), $share(30)])->toBe([60, 60])
        ->and([$share(31), $share(100)])->toBe([50, 50])
        ->and([$share(101), $share(150)])->toBe([40, 40]);
});

it('ステージ1は、レベル1〜7の問題だけ(まだ文章のないレベルなので、すべて単語)', function () {
    $profile = createActiveProfile();
    $stages = createLeveledCourse();

    $questions = drawn(StageDraw::pick($profile, $stages[1]));

    expect($questions)->toHaveCount(10)
        ->and($questions->every(fn ($q) => $q->meta['level'] >= 1 && $q->meta['level'] <= 7))->toBeTrue()
        ->and($questions->every(fn ($q) => $q->meta['kind'] === 'word'))->toBeTrue();
});

it('同じ語は、1回のステージに1度だけ(英→日と日→英の両方が出ない)', function () {
    $profile = createActiveProfile();
    $stages = createLeveledCourse();

    foreach ([4, 6, 8] as $number) {
        foreach (range(1, 5) as $_) {
            $words = drawn(StageDraw::pick($profile, $stages[$number]))->pluck('meta.word')->filter();
            expect($words->unique()->count())->toBe($words->count());
        }
    }
});

it('ステージ3(レベル15〜21)は、前の範囲(レベル14以下)の復習が3問まで。範囲より後のレベルは出ない', function () {
    $profile = createActiveProfile();
    $stages = createLeveledCourse();

    foreach (range(1, 10) as $_) {
        $questions = drawn(StageDraw::pick($profile, $stages[3]));
        $levels = $questions->pluck('meta.level');

        expect($questions)->toHaveCount(10)->and($levels->max())->toBeLessThanOrEqual(21)
            ->and($levels->filter(fn ($l) => $l < 15)->count())->toBeLessThanOrEqual(3)
            ->and($levels->filter(fn ($l) => $l >= 15)->count())->toBeGreaterThanOrEqual(7);
    }
});

it('ボスは、級全体(どのレベルからも)から出す', function () {
    $profile = createActiveProfile();
    $stages = createLeveledCourse();

    $questions = drawn(StageDraw::pick($profile, $stages[10]));

    expect($questions)->toHaveCount(15)->and($questions->pluck('meta.level')->max())->toBeGreaterThan(30);
});

it('ステージ4(レベル22〜28)の単語は、英語→日本語が約6割(60%)', function () {
    $profile = createActiveProfile();
    $stages = createLeveledCourse();
    $enJa = 0;
    $total = 0;

    foreach (range(1, 60) as $_) {
        $words = drawn(StageDraw::pick($profile, $stages[4]))->filter(fn ($q) => $q->meta['kind'] === 'word' && $q->meta['level'] >= 22);
        $total += $words->count();
        $enJa += $words->where('meta.direction', 'en_ja')->count();
    }

    expect($enJa / $total)->toBeGreaterThan(0.5)->and($enJa / $total)->toBeLessThan(0.7);
});

it('答えたことのある単語が優先される(範囲の中でも、9問のうち7問以上)', function () {
    $profile = createActiveProfile();
    $stages = createLeveledCourse();
    $answered = Question::where('meta->kind', 'word')->where('meta->level', '<=', 7)->orderBy('id')->limit(20)->pluck('id');
    foreach ($answered as $id) {
        ProfileQuestionMemory::create(['user_profile_id' => $profile->id, 'question_id' => $id, 'level' => 1, 'last_answered_on' => now()->toDateString()]);
    }

    $ids = StageDraw::pick($profile, $stages[1]);

    expect(count(array_intersect($ids, $answered->all())))->toBeGreaterThanOrEqual(7);
});

it('文章の割合が、範囲の中でも保たれる(初級ステージ5は文章2問)', function () {
    $profile = createActiveProfile();
    $stages = createLeveledCourse();

    foreach (range(1, 10) as $_) {
        $kinds = drawn(StageDraw::pick($profile, $stages[5]))->pluck('meta.kind')->countBy();
        expect($kinds['sentence'] ?? 0)->toBe(2)->and($kinds['word'] ?? 0)->toBe(8);
    }
});
