<?php

use App\Support\Prefecture\PlaceNameQuizPlanner;
use App\Support\Prefecture\PrefectureCatalog;

/** 地名コースの計画(docs/design/2026-10-06-prefecture-master-design.md 2・4章) */

function placeNamePlan(): array
{
    return PlaceNameQuizPlanner::plan(PrefectureCatalog::all());
}

function placeNameCourse(array $plan, string $prefectureKey): array
{
    foreach ($plan as $region) {
        foreach ($region['courses'] as $course) {
            if ($course['key'] === "{$prefectureKey}-place") {
                return $course;
            }
        }
    }
    throw new RuntimeException("地名コースがない: {$prefectureKey}");
}

it('北海道は4級(初級30・中級20・上級10・最高難易度5)で、各級は1ステージ', function () {
    $course = placeNameCourse(placeNamePlan(), 'hokkaido');

    expect($course['name'])->toBe('北海道 地名');
    $counts = collect($course['levels'])->mapWithKeys(fn ($level) => [$level['difficulty'] => count($level['stages'][0]['questions'])])->all();
    expect($counts)->toBe(['初級' => 30, '中級' => 20, '上級' => 10, '最高難易度' => 5]);
    foreach ($course['levels'] as $level) {
        expect($level['stages'])->toHaveCount(1);
        $stage = $level['stages'][0];
        expect($stage['boss'])->toBeTrue()
            ->and($stage['title_reward'])->toBeNull()
            ->and($stage['draw'])->toBe($level['difficulty'] === '最高難易度' ? 5 : 10)
            ->and($stage['reward_percent'])->toBe(50);
    }
});

it('青森は 初級20・中級10・上級10・最高難易度5', function () {
    $course = placeNameCourse(placeNamePlan(), 'aomori');

    $counts = collect($course['levels'])->mapWithKeys(fn ($level) => [$level['difficulty'] => count($level['stages'][0]['questions'])])->all();
    expect($counts)->toBe(['初級' => 20, '中級' => 10, '上級' => 10, '最高難易度' => 5]);
});

it('47県すべてにコースがあり、合計2,125問。問題は4択で、キーが重ならない', function () {
    $plan = placeNamePlan();
    $keys = [];
    $courses = 0;
    foreach ($plan as $region) {
        foreach ($region['courses'] as $course) {
            $courses++;
            foreach ($course['levels'] as $level) {
                foreach ($level['stages'][0]['questions'] as $q) {
                    $keys[] = $q['key'];
                    expect($q['type'])->toBe('multiple_choice')
                        ->and($q['choices'])->toHaveCount(4)
                        ->and(collect($q['choices'])->where('correct', true))->toHaveCount(1)
                        ->and(collect($q['choices'])->pluck('label')->unique())->toHaveCount(4)
                        ->and($q['explanation']['summary'])->not->toBe('');
                }
            }
        }
    }

    expect($courses)->toBe(47)
        ->and($keys)->toHaveCount(2125)
        ->and(array_unique($keys))->toHaveCount(2125);
});

it('問題文の『』の中の語は plain(ふりがなを付けない)に入る。コースは地方の下にある', function () {
    $plan = placeNamePlan();
    $first = placeNameCourse($plan, 'hokkaido')['levels'][0]['stages'][0]['questions'][0];

    expect($first['prompt'])->toBe('北海道の『札幌』は、なんて よむ？')
        ->and($first['plain'])->toBe(['札幌'])
        ->and($first['key'])->toStartWith('pref:hokkaido-tohoku:hokkaido:place:beginner:');
    expect(collect($plan)->pluck('key')->all())->toContain('hokkaido-tohoku', 'kinki');
    expect(collect($plan)->every(fn ($region) => $region['group'] === true))->toBeTrue();
});

it('同じ問題文と正解の重複がない', function () {
    $seen = [];
    foreach (placeNamePlan() as $region) {
        foreach ($region['courses'] as $course) {
            foreach ($course['levels'] as $level) {
                foreach ($level['stages'][0]['questions'] as $q) {
                    $id = $q['prompt'].'|'.collect($q['choices'])->firstWhere('correct', true)['label'];
                    expect($seen)->not->toHaveKey($id);
                    $seen[$id] = true;
                }
            }
        }
    }
});
