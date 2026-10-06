<?php

use App\Models\Category;
use App\Models\ProfileQuestionMemory;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Stage;
use App\Support\StageDraw;

/** 言語コースの出し方(docs/design/2026-10-07-language-course-mix-design.md 4章) */

/** 国に結びつかない言語のステージ(出す数10、プール=単語 $words 問＋文章 $sentences 問)。問題の kind は meta に持つ */
function createLanguageStage(string $difficulty, int $number, bool $boss = false, int $words = 40, int $sentences = 20): Stage
{
    $category = Category::firstOrCreate(['name' => '英語を学ぶ'], ['is_language_mode' => true]);
    $quiz = Quiz::firstOrCreate(['title' => "言語{$difficulty}"], ['difficulty' => $difficulty]);
    $stage = Stage::create(['category_id' => $category->id, 'country_id' => null, 'difficulty' => $difficulty, 'stage_number' => $number, 'question_count' => 10, 'is_boss' => $boss, 'is_pool' => true]);
    $order = 0;
    foreach (['word' => $words, 'sentence' => $sentences] as $kind => $count) {
        for ($i = 1; $i <= $count; $i++) {
            $q = Question::firstOrCreate(['quiz_id' => $quiz->id, 'prompt' => "{$kind}{$i}"], ['meta' => ['kind' => $kind]]);
            $stage->questions()->attach($q->id, ['order' => ++$order]);
        }
    }

    return $stage;
}

function kindsOf(array $ids): array
{
    return array_count_values(Question::whereIn('id', $ids)->get()->map(fn ($q) => $q->meta['kind'])->all());
}

function answered($profile, string $prompt, ?string $wrongOn = null): void
{
    $question = Question::where('prompt', $prompt)->firstOrFail();
    ProfileQuestionMemory::create(['user_profile_id' => $profile->id, 'question_id' => $question->id, 'level' => 1, 'last_answered_on' => now()->toDateString(), 'wrong_on' => $wrongOn]);
}

it('文章の割合: 初級のステージ1は1問、4は2問、7は3問、9は3問。ボスは割合なし', function () {
    $profile = createActiveProfile();
    $stages = ['初級' => [1 => 1, 4 => 2, 7 => 3, 9 => 3], '中級' => [1 => 2, 7 => 4], '上級' => [1 => 3, 7 => 5]];

    foreach ($stages as $difficulty => $byNumber) {
        foreach ($byNumber as $number => $sentences) {
            $stage = createLanguageStage($difficulty, $number);
            $kinds = kindsOf(StageDraw::pick($profile, $stage));
            expect($kinds['sentence'] ?? 0)->toBe($sentences, "{$difficulty}ステージ{$number}")->and($kinds['word'] ?? 0)->toBe(10 - $sentences);
        }
    }
});

it('文章の割合の計算(sentencePercent): 直線でつなぎ、ステージ7以降は同じ。ボスは null', function () {
    $make = fn (string $difficulty, int $number, bool $boss = false) => new Stage(['difficulty' => $difficulty, 'stage_number' => $number, 'is_boss' => $boss]);

    expect(StageDraw::sentencePercent($make('初級', 1)))->toBe(10)
        ->and(StageDraw::sentencePercent($make('初級', 4)))->toBe(20)
        ->and(StageDraw::sentencePercent($make('初級', 7)))->toBe(30)
        ->and(StageDraw::sentencePercent($make('初級', 9)))->toBe(30)
        ->and(StageDraw::sentencePercent($make('中級', 1)))->toBe(20)
        ->and(StageDraw::sentencePercent($make('上級', 7)))->toBe(50)
        ->and(StageDraw::sentencePercent($make('初級', 10, true)))->toBeNull();
});

it('ボスは種類の制約なしで10問(重複なし)。先頭5問を含む', function () {
    $profile = createActiveProfile();
    $boss = createLanguageStage('初級', 10, true);
    $anchor = array_slice($boss->questions()->orderBy('stage_questions.order')->pluck('questions.id')->all(), 0, 5);

    $ids = StageDraw::pick($profile, $boss);

    expect($ids)->toHaveCount(10)->and(array_unique($ids))->toHaveCount(10)->and(array_diff($anchor, $ids))->toBe([]);
});

it('答えたことのある単語が優先される(単語9問のうち7問以上)', function () {
    $profile = createActiveProfile();
    $stage = createLanguageStage('初級', 1);
    foreach (range(1, 20) as $i) {
        answered($profile, "word{$i}");
    }

    $learned = Question::whereIn('id', StageDraw::pick($profile, $stage))->get()->filter(fn ($q) => $q->meta['kind'] === 'word' && str_starts_with($q->prompt, 'word') && (int) substr($q->prompt, 4) <= 20)->count();

    expect($learned)->toBeGreaterThanOrEqual(7)->and($learned)->toBeLessThanOrEqual(9);
});

it('答えたことのある単語が少なくても、新しい単語で埋まって10問になる', function () {
    $profile = createActiveProfile();
    $stage = createLanguageStage('初級', 1);
    answered($profile, 'word1');
    answered($profile, 'word2');

    $ids = StageDraw::pick($profile, $stage);

    expect($ids)->toHaveCount(10)->and(kindsOf($ids))->toBe(['word' => 9, 'sentence' => 1]);
});

it('文章が足りないときは、単語で埋まる', function () {
    $profile = createActiveProfile();
    $stage = createLanguageStage('初級', 7, false, 40, 1);

    $ids = StageDraw::pick($profile, $stage);

    expect($ids)->toHaveCount(10)->and(kindsOf($ids))->toBe(['word' => 9, 'sentence' => 1]);
});

it('まちがえた問題は先に入る(最大3問)', function () {
    $profile = createActiveProfile();
    $stage = createLanguageStage('初級', 1);
    foreach (range(30, 36) as $i) {
        answered($profile, "word{$i}", now()->subDays($i - 29)->toDateString());
    }
    $ids = StageDraw::pick($profile, $stage);

    $wrongIn = Question::whereIn('id', $ids)->get()->filter(fn ($q) => str_starts_with($q->prompt, 'word') && (int) substr($q->prompt, 4) >= 30 && (int) substr($q->prompt, 4) <= 36)->count();

    expect($wrongIn)->toBeGreaterThanOrEqual(3);
});

it('国のコース(国旗)の抽選は変わらない(国に結びつくステージは今まで通り)', function () {
    $profile = createActiveProfile();
    $stage = createPoolStage(30, 10, true, false, '国のコース');

    expect(StageDraw::pick($profile, $stage))->toHaveCount(10);
});
