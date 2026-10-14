<?php

use App\Models\Question;
use App\Models\Stage;

// docs/design/2026-10-15-question-variety-design.md 3-1（国旗の問題の整理）

function retiredFile(array $entries): void
{
    $path = tempnam(sys_get_temp_dir(), 'sprago_retired_').'.json';
    file_put_contents($path, json_encode($entries, JSON_UNESCAPED_UNICODE));
    config(['content.retired_file' => $path]);
}

it('取り込みは、外す問題の一覧にある問題を、ステージに入れない', function () {
    seedThemesAndCountry();
    retiredFile(['zz' => ['初級' => ['この国旗はどこの国？']]]);

    $this->artisan('content:import', ['file' => fixturePath()])->assertExitCode(0);

    $prompts = Question::query()->pluck('prompt')->all();
    expect($prompts)->not->toContain('この国旗はどこの国？')->toContain('テスト国の国旗の色は？');
});

it('一覧にない級・国の問題は、そのまま取り込む', function () {
    seedThemesAndCountry();
    retiredFile(['zz' => ['中級' => ['この国旗はどこの国？']], 'jp' => ['初級' => ['この国旗はどこの国？']]]);

    $this->artisan('content:import', ['file' => fixturePath()])->assertExitCode(0);

    expect(Question::query()->pluck('prompt')->all())->toContain('この国旗はどこの国？');
});

it('content:retire は、すでに入っている問題をステージから外す。問題そのものは消さない。何度流しても同じ', function () {
    seedThemesAndCountry();
    retiredFile([]);
    $this->artisan('content:import', ['file' => fixturePath()])->assertExitCode(0);
    $flag = Question::query()->where('prompt', 'この国旗はどこの国？')->firstOrFail();
    expect($flag->stages()->count())->toBe(1);

    retiredFile(['zz' => ['初級' => ['この国旗はどこの国？']]]);
    $this->artisan('content:retire')->assertExitCode(0);
    $this->artisan('content:retire')->assertExitCode(0);

    expect($flag->fresh())->not->toBeNull()
        ->and($flag->stages()->count())->toBe(0)
        ->and(Stage::query()->count())->toBe(2)
        ->and(Question::query()->where('prompt', 'テスト国の国旗の色は？')->firstOrFail()->stages()->count())->toBe(1);
});

it('外す問題の一覧の実物は、国・級・問題文の形で、問題文が空でない', function () {
    $file = json_decode(file_get_contents(base_path('docs/content/retired-questions.json')), true);
    $count = 0;
    foreach ($file as $code => $levels) {
        if (str_starts_with($code, '_')) {
            continue;
        }
        expect($code)->toBe(strtolower($code));
        foreach ($levels as $difficulty => $prompts) {
            expect(config('quiz.difficulties'))->toContain($difficulty);
            foreach ($prompts as $prompt) {
                expect($prompt)->toBeString()->not->toBe('');
                $count++;
            }
        }
    }
    expect($count)->toBeGreaterThan(200);
});

it('国ごとのコースの大きさは、ステージ3〜10・出す数が正の数で、ボスは通常より多く出す', function () {
    $courses = require database_path('data/country-courses.php');

    expect($courses)->not->toBeEmpty();
    foreach ($courses as $code => $levels) {
        foreach ($levels as $difficulty => $level) {
            expect(config('quiz.difficulties'))->toContain($difficulty);
            expect($level['stages'])->toBeGreaterThanOrEqual(3)->toBeLessThanOrEqual(10);
            expect($level['draw'])->toBeGreaterThan(0)->and($level['boss'])->toBeGreaterThan($level['draw']);
        }
    }
});

it('日本に足した原稿(地図の問題・祝日・行事)は、取り込め、地図の問題には光らせる県が付く', function () {
    seedThemesAndCountry();
    foreach (['geography', 'heritage'] as $key) {
        App\Models\QuestionTheme::query()->firstOrCreate(['key' => $key], ['label' => $key]);
    }
    App\Models\Country::query()->create(['code' => 'JP', 'three_code' => 'JPN', 'name' => '日本', 'name_en' => 'Japan', 'country_code' => 81]);
    retiredFile([]);

    foreach (['beginner', 'intermediate', 'advanced'] as $level) {
        $this->artisan('content:import', ['file' => base_path("docs/content/drafts/jp_extra_{$level}.json")])->assertExitCode(0);
    }

    // もう一度取り込んでも、増えない(地図の問題は、問題文が同じなので、光らせる県で見分ける)
    $this->artisan('content:import', ['file' => base_path('docs/content/drafts/jp_extra_beginner.json')])->assertExitCode(0);

    $maps = Question::query()->where('meta', 'like', '%"map"%')->get();
    expect($maps)->toHaveCount(47);
    $maps->each(fn (Question $q) => expect($q->meta['map']['view'])->toBe('japan')->and($q->meta['map']['highlight'])->toBeString());
    // 正解の県の名前が、選択肢に1つだけある
    expect($maps->every(fn (Question $q) => $q->choices()->where('is_correct', true)->count() === 1 && $q->choices()->count() === 4))->toBeTrue();
    expect(Question::query()->where('prompt', '3月3日の行事は？')->exists())->toBeTrue();
});
