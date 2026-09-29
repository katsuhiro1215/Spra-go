<?php

use App\Models\Category;
use App\Models\ProfileStageProgress;
use App\Models\Stage;
use App\Models\UserProfile;
use App\Support\RareSeeds;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 特別な種の条件と受け渡し(docs/design/2026-09-29-rare-spru-design.md 3-1・3-2・4-3)
|--------------------------------------------------------------------------
*/

function rareProgress(UserProfile $profile, string $key): array
{
    return collect(RareSeeds::progress($profile->fresh()))->firstWhere('key', $key);
}

/** 難しさが上級のステージを作る。$cleared なら クリアしたことにする */
function advancedStage(UserProfile $profile, int $number, bool $cleared, string $difficulty = '上級'): Stage
{
    $category = Category::query()->firstOrCreate(['name' => '上級のテスト']);
    $stage = Stage::create(['category_id' => $category->id, 'difficulty' => $difficulty, 'stage_number' => $number]);
    ProfileStageProgress::create([
        'user_profile_id' => $profile->id,
        'stage_id' => $stage->id,
        'cleared_at' => $cleared ? now() : null,
    ]);

    return $stage;
}

/** スプルキャッチを終えた回(10問) */
function finishedCatch(UserProfile $profile, int $answered, int $correct, bool $finished = true): void
{
    $profile->gamePlays()->create([
        'game' => 'catch',
        'difficulty' => '初級',
        'question_ids' => range(1, 10),
        'finished_at' => $finished ? now() : null,
        'played_on' => $finished ? '2026-09-27' : null,
        'answered_count' => $finished ? $answered : null,
        'correct_count' => $finished ? $correct : null,
        'score' => 0,
        'best_combo' => 0,
    ]);
}

it('レアスプルは10色で、スプルの種からは選ばれず、ひとことが5つある', function () {
    $rares = RareSeeds::rares();

    expect(array_keys($rares))->toBe(['ruby', 'sapphire', 'silver', 'amber', 'obsidian', 'crystal', 'pearl', 'emerald', 'gold', 'platinum'])
        ->and(collect($rares)->every(fn (array $def) => $def['weight'] === 0 && count($def['lines']) === 5))->toBeTrue()
        ->and(collect($rares)->every(fn (array $def) => config("companions.condition_texts.{$def['condition']['type']}") !== null))->toBeTrue()
        ->and(RareSeeds::isRare('gold'))->toBeTrue()
        ->and(RareSeeds::isRare('lumi'))->toBeFalse()
        ->and(RareSeeds::isRare('riri'))->toBeFalse()
        ->and(config('companions.town_limit'))->toBe(5);
});

it('連続日数は、いちばん長い連続で満たし、今の数は今の連続', function () {
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC')); // 日本時間 12:00
    $profile = createActiveProfile();
    $profile->update(['best_streak' => 6, 'current_streak' => 4, 'last_played_date' => '2026-09-26']);

    expect(rareProgress($profile, 'ruby'))->toBe(['key' => 'ruby', 'type' => 'streak', 'target' => 7, 'current' => 4, 'met' => false]);

    $profile->update(['best_streak' => 7, 'current_streak' => 2, 'last_played_date' => '2026-09-27']);

    expect(rareProgress($profile, 'ruby'))->toMatchArray(['current' => 7, 'met' => true]);
});

it('昨日も今日も学んでいなければ、今の連続は0', function () {
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC'));
    $profile = createActiveProfile();
    $profile->update(['best_streak' => 5, 'current_streak' => 5, 'last_played_date' => '2026-09-25']);

    expect(rareProgress($profile, 'ruby'))->toMatchArray(['current' => 0, 'met' => false]);
});

it('外国に着いた数で、サファイアの条件を満たす', function () {
    $profile = createActiveProfile();
    expect(rareProgress($profile, 'sapphire'))->toMatchArray(['type' => 'trips', 'target' => 1, 'current' => 0, 'met' => false]);

    $profile->trips()->create(['destination' => 'id', 'arrived_at' => now()]);

    expect(rareProgress($profile, 'sapphire'))->toMatchArray(['current' => 1, 'met' => true]);
});

it('レベル10・20・30で、シルバー・ゴールド・プラチナ', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 20]);

    expect(rareProgress($profile, 'silver'))->toMatchArray(['current' => 10, 'met' => true])
        ->and(rareProgress($profile, 'gold'))->toMatchArray(['current' => 20, 'met' => true])
        ->and(rareProgress($profile, 'platinum'))->toMatchArray(['target' => 30, 'current' => 20, 'met' => false]);
});

it('目標に届いたら、今の数は目標で止まる', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 35]);

    expect(rareProgress($profile, 'platinum'))->toMatchArray(['current' => 30, 'met' => true]);
});

it('復習をやりきった回数で、アンバーの条件を満たす', function () {
    $profile = createActiveProfile();
    $profile->update(['reviews_completed' => 9]);
    expect(rareProgress($profile, 'amber'))->toMatchArray(['type' => 'reviews', 'current' => 9, 'met' => false]);

    $profile->update(['reviews_completed' => 10]);
    expect(rareProgress($profile, 'amber'))->toMatchArray(['current' => 10, 'met' => true]);
});

it('上級のステージは、クリアしたものだけ数える', function () {
    $profile = createActiveProfile();
    advancedStage($profile, 1, true);
    advancedStage($profile, 2, true);
    advancedStage($profile, 3, false);
    advancedStage($profile, 4, true, '中級');

    expect(rareProgress($profile, 'obsidian'))->toMatchArray(['type' => 'advanced_stages', 'target' => 3, 'current' => 2, 'met' => false]);

    advancedStage($profile, 5, true);
    expect(rareProgress($profile, 'obsidian'))->toMatchArray(['current' => 3, 'met' => true]);
});

it('スプルキャッチは、終えた回で出た問題を全部正解した回だけ数える', function () {
    $profile = createActiveProfile();
    finishedCatch($profile, 10, 9);
    finishedCatch($profile, 3, 3);
    finishedCatch($profile, 0, 0, finished: false);

    expect(rareProgress($profile, 'crystal'))->toMatchArray(['type' => 'catch_perfect', 'current' => 0, 'met' => false]);

    finishedCatch($profile, 10, 10);
    expect(rareProgress($profile, 'crystal'))->toMatchArray(['current' => 1, 'met' => true]);
});

it('仲間の数は、レアでない仲間だけ数える', function () {
    $profile = createActiveProfile();
    foreach (['lumi', 'momo', 'kuru', 'piko', 'ruby'] as $key) {
        $profile->companions()->create(['companion_key' => $key]);
    }

    expect(rareProgress($profile, 'emerald'))->toMatchArray(['type' => 'companions', 'target' => 5, 'current' => 4, 'met' => false]);

    $profile->companions()->create(['companion_key' => 'ruru']);
    expect(rareProgress($profile, 'emerald'))->toMatchArray(['current' => 5, 'met' => true]);
});

it('満たした色だけ種を渡し、2回目は何も渡さない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 10, 'best_streak' => 7]);

    expect(RareSeeds::grant($profile->fresh()))->toBe(['ruby', 'silver'])
        ->and(RareSeeds::grant($profile->fresh()))->toBe([])
        ->and($profile->specialSeeds()->count())->toBe(2)
        ->and(RareSeeds::bag($profile->fresh()))->toBe([
            ['key' => 'ruby', 'name' => 'ルビースプル'],
            ['key' => 'silver', 'name' => 'シルバースプル'],
        ]);
});

it('まいた種はふくろに入らない', function () {
    $profile = createActiveProfile();
    $profile->specialSeeds()->create(['rare_key' => 'ruby', 'granted_at' => now(), 'planted_at' => now()]);
    $profile->specialSeeds()->create(['rare_key' => 'gold', 'granted_at' => now()]);

    expect(RareSeeds::bag($profile))->toBe([['key' => 'gold', 'name' => 'ゴールドスプル']]);
});

it('同じ色の種は2つ作れない', function () {
    $profile = createActiveProfile();
    $profile->specialSeeds()->create(['rare_key' => 'ruby', 'granted_at' => now()]);

    expect(fn () => $profile->specialSeeds()->create(['rare_key' => 'ruby', 'granted_at' => now()]))
        ->toThrow(UniqueConstraintViolationException::class);
});

it('お祝いの一言と条件の文', function () {
    expect(RareSeeds::present(['sapphire', 'ruby', 'crystal']))->toBe([
        ['key' => 'sapphire', 'name' => 'サファイアスプル', 'reason' => '初めて外国に着いたね'],
        ['key' => 'ruby', 'name' => 'ルビースプル', 'reason' => '7日続けて学んだね'],
        ['key' => 'crystal', 'name' => 'クリスタルスプル', 'reason' => 'スプルキャッチで全問正解したね'],
    ])
        ->and(RareSeeds::text('trips', 3, 'goal'))->toBe('3か国に着く')
        ->and(RareSeeds::condition('obsidian', 1))->toBe(['text' => '上級のステージを3つクリア', 'current' => 1, 'target' => 3, 'unit' => 'つ']);
});

it('今いる仲間は、町にいる状態から始まる', function () {
    $profile = createActiveProfile();
    $companion = $profile->companions()->create(['companion_key' => 'lumi']);

    expect($companion->fresh()->in_town)->toBeTrue();
});
