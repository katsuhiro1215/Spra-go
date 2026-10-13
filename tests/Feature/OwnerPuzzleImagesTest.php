<?php

use App\Models\Owner;
use App\Models\PuzzleDisabledImage;
use App\Support\FlagQuiz\FlagQuizWriter;
use App\Support\FlagQuiz\FlagCatchPlanner;

/*
|--------------------------------------------------------------------------
| Ownerが、国旗パズルに出す旗を、盤の大きさごとに切り替える
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    config(['games.puzzle_space.catalog' => ['released_on' => null, 'season' => null]]);
    FlagQuizWriter::writeCatch(FlagCatchPlanner::plan(flagTestCatalog()));

    $kinds = ['2x2' => [], '3x3' => [], '4x4' => []];
    foreach (DB::table('question_choices')->where('is_correct', true)->get(['meta']) as $choice) {
        $image = json_decode($choice->meta, true)['image'] ?? null;
        if ($image === null) {
            continue;
        }
        foreach (['2x2' => 4, '3x3' => 9, '4x4' => 16] as $grid => $count) {
            $kinds[$grid][$image] = range(0, $count - 1);
        }
    }
    config(['games.puzzle_flag.image_kinds' => $kinds]);
});

it('Owner以外は見ることも切り替えることもできない', function () {
    $this->getJson('/api/owner/puzzle-images')->assertStatus(401);
    $this->putJson('/api/owner/puzzle-images', ['grid' => '2x2', 'image' => '/flag/x.svg', 'enabled' => false])->assertStatus(401);
});

it('盤の大きさごとに、使える旗を日本語の名前つきで並べ、既定はすべてOn', function () {
    $owner = Owner::factory()->create();

    $response = $this->actingAs($owner, 'owner')->getJson('/api/owner/puzzle-images')->assertOk();

    expect(array_keys($response->json('grids')))->toBe(['2x2', '3x3', '4x4']);
    $first = $response->json('grids.2x2.0');
    expect($first)->toHaveKeys(['image', 'label', 'enabled'])
        ->and($first['image'])->toStartWith('/flag/')
        ->and($first['label'])->not->toBe('')
        ->and($first['enabled'])->toBeTrue();
});

it('Offにすると、その大きさのパズルにだけ、その旗が出なくなる。Onに戻すと出る', function () {
    $owner = Owner::factory()->create();
    $grids = $this->actingAs($owner, 'owner')->getJson('/api/owner/puzzle-images')->json('grids');
    $image = $grids['2x2'][0]['image'];

    $this->actingAs($owner, 'owner')->putJson('/api/owner/puzzle-images', ['grid' => '2x2', 'image' => $image, 'enabled' => false])->assertOk();

    expect(PuzzleDisabledImage::count())->toBe(1);
    $after = $this->actingAs($owner, 'owner')->getJson('/api/owner/puzzle-images')->json('grids');
    expect(collect($after['2x2'])->firstWhere('image', $image)['enabled'])->toBeFalse()
        ->and(collect($after['3x3'])->firstWhere('image', $image)['enabled'])->toBeTrue();

    // 遊ぶ側: 2x2(初級)の問題に、その旗は出ない
    $kinds = \App\Support\CatchGame::puzzleKinds('puzzle_flag');
    expect($kinds['2x2'])->not->toHaveKey($image)->and($kinds['3x3'])->toHaveKey($image);

    $this->actingAs($owner, 'owner')->putJson('/api/owner/puzzle-images', ['grid' => '2x2', 'image' => $image, 'enabled' => true])->assertOk();
    expect(PuzzleDisabledImage::count())->toBe(0)
        ->and(\App\Support\CatchGame::puzzleKinds('puzzle_flag')['2x2'])->toHaveKey($image);
});

it('同じ切り替えを重ねても、行は増えない。知らない大きさ・絵は受け付けない', function () {
    $owner = Owner::factory()->create();
    $image = $this->actingAs($owner, 'owner')->getJson('/api/owner/puzzle-images')->json('grids.2x2.0.image');

    foreach ([1, 2] as $_) {
        $this->actingAs($owner, 'owner')->putJson('/api/owner/puzzle-images', ['grid' => '2x2', 'image' => $image, 'enabled' => false])->assertOk();
    }
    expect(PuzzleDisabledImage::count())->toBe(1);

    $this->actingAs($owner, 'owner')->putJson('/api/owner/puzzle-images', ['grid' => '5x5', 'image' => $image, 'enabled' => false])->assertStatus(422);
    $this->actingAs($owner, 'owner')->putJson('/api/owner/puzzle-images', ['grid' => '2x2', 'image' => '/flag/nothing.svg', 'enabled' => false])->assertStatus(422);
});
