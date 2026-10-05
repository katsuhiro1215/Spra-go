# レアスプルと特別な種 — 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** がんばった記念にもらう「特別な種」から、レアスプル10色が畑で生まれるようにし、町に立つ数（5体）と「なかま」の一覧を作る。

**Architecture:** 今の仲間のしくみ（`config/companions.php`・`Garden`・`Bond`）を広げる。レアスプルは仲間の一覧に `rare` と `condition` を付けて足し、条件の数え方と種の受け渡しは新しい `RareSeeds`、一覧の形は新しい `Roster` にまとめる。画面は今の町の画面に、どの種をまく？・種をもらったお祝い・なかまの一覧を足す。

**Tech Stack:** Laravel 13（Pest、MySQL のテスト用DB）、Next.js 16・React 19・TypeScript・Tailwind（Vitest）、Sail、切り抜きの道具（Python・Pillow）

**Spec:** `docs/design/2026-09-29-rare-spru-design.md`

## Global Constraints

- 作業ブランチは `feature/rare-spru`。コミットは `#NNNNN: type:要約` と `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。計画は #00283、タスクは #00284 から番号順
- サーバーのテストは `./vendor/bin/sail test`（`--parallel` は付けない）。画面は `cd frontend && npm test`・`npm run typecheck`・`npm run lint`
- 開発用DBは `./vendor/bin/sail artisan migrate`（足すだけ）。`migrate:fresh` はしない
- 確率では出さない。コインで種を買う・早める機能は作らない
- リリ（`riri`）は使わない。一覧にも出さない
- 町に立つのは5体まで（`config('companions.town_limit')` = 5）。相棒はいつも町にいる。相棒にできるのは町にいる子だけ
- 仲間の種の見た目は、生まれる子にかかわらず `spru`。誰が生まれるかを画面に送らない
- 画面の文言は設計書のとおり（「特別な種をもらった！」「どの種をまく？」「その種は持っていないよ」「町はいっぱいだよ。だれかをおうちで休ませてね」「相棒はいつも町にいるよ」「町にいる仲間だけ相棒にできるよ」「特別な種を畑にまいてみよう！」など）
- 条件の数字は試験用。設定ファイル（`config/companions.php`）だけで変えられる形にする
- `company/` の文書は追記のみ
- `spru-assets.ts` は切り抜きの道具が書き出す（手で直さない）

## Review Focus

1. 2つのタブで同時に町を開いても、同じ色の種が2つできない（ロックと、表の「1人1色1行」の制約）→ Task 1 の「同じ色の種は2つ作れない」
2. 条件の数字をあとで厳しくしても、一度渡した種は消えない → Task 3 の「一度渡した種は、条件を満たさなくなっても残る」
3. 家族の町で、おうちで休んでいる子が立たない → Task 2 の「家族の町では、おうちの子に立ち位置がない」
4. 種まきに仲間のキーや `spru_flower` を送っても、仲間や花の種はまけない → Task 2 の「知らないキー・仲間のキー・花のキーは 422」
5. 町がいっぱいのとき、もう町にいる子を「町に出す」と送っても断らない（二重押し）→ Task 3 の「町にいる子をもう一度町に出しても断らない」

---

## ファイルの地図

| ファイル | 役目 | タスク |
|---|---|---|
| `database/migrations/2026_09_29_000005_create_profile_special_seeds_table.php` | もらった特別な種の表 | 1 |
| `database/migrations/2026_09_29_000006_add_in_town_to_profile_companions_table.php` | 仲間の「町にいる」 | 1 |
| `database/migrations/2026_09_29_000007_add_reviews_completed_to_user_profiles_table.php` | 復習をやりきった回数 | 1 |
| `app/Models/ProfileSpecialSeed.php` | 特別な種のモデル（新規） | 1 |
| `app/Models/UserProfile.php` | `specialSeeds()`・`reviews_completed` | 1 |
| `app/Models/ProfileCompanion.php` | `in_town` | 1 |
| `config/companions.php` | レアスプル10色・`town_limit`・`condition_texts` | 1 |
| `app/Support/RareSeeds.php` | 条件の数え方・種を渡す・ふくろ（新規） | 1 |
| `app/Support/Garden.php` | 畑の見た目・特別な種をまく・町に立つ数 | 2 |
| `app/Support/Family.php` | 家族の町の畑の見た目 | 2 |
| `routes/api.php` | 町・種まき・一覧・町に出す・相棒・復習 | 2・3 |
| `app/Support/Roster.php` | なかまの一覧の形（新規） | 3 |
| `app/Support/Review.php` | やりきった回数を数える | 3 |
| `tools/spru-assets/extract.py`・`crops.json` | 育つ絵・仲間の正面 | 4 |
| `frontend/src/components/spru/plant.ts` | 育つ絵を選ぶ（新規） | 4 |
| `frontend/src/components/world/garden-art.tsx` | 畑の絵 | 4・5 |
| `frontend/src/components/games/catch/catch-view.ts` | スプルキャッチの芽のしるし | 4 |
| `frontend/src/components/world/types.ts` | 型 | 5 |
| `frontend/src/components/world/garden.ts` | 畑のタップ・ひとこと・種の並び | 5 |
| `frontend/src/components/world/seed-picker.tsx` | どの種をまく？（新規） | 5 |
| `frontend/src/components/world/world-screen.tsx` | つなぐ | 5・6・7 |
| `frontend/src/components/family/family-town.tsx` | 家族の町の畑 | 5 |
| `frontend/src/components/world/companions.ts` | 生まれたときの一言・花の色 | 6 |
| `frontend/src/components/world/seed-gift.tsx` | 種をもらったお祝い（新規） | 6 |
| `frontend/src/components/world/born-overlay.tsx` | 花が咲いてから生まれる | 6 |
| `frontend/src/components/world/roster.ts` | 一覧の文（新規） | 7 |
| `frontend/src/components/world/roster-sheet.tsx` | なかまの一覧（新規） | 7 |
| `frontend/src/components/world/town-buttons.tsx` | 「なかま」ボタン | 7 |
| `frontend/src/components/world/companion-sheet.tsx` | おうちの子は相棒にできない | 7 |
| `SPEC.md`・`TASKS.md`・`company/spra/mascot/CLAUDE.md` | 文書 | 8 |

---

### Task 1: データと設定と条件の係（#00284）

**Files:**
- Create: `database/migrations/2026_09_29_000005_create_profile_special_seeds_table.php`
- Create: `database/migrations/2026_09_29_000006_add_in_town_to_profile_companions_table.php`
- Create: `database/migrations/2026_09_29_000007_add_reviews_completed_to_user_profiles_table.php`
- Create: `app/Models/ProfileSpecialSeed.php`
- Create: `app/Support/RareSeeds.php`
- Modify: `app/Models/UserProfile.php`（`$fillable`・`casts`・関係）
- Modify: `app/Models/ProfileCompanion.php`
- Modify: `config/companions.php`
- Test: `tests/Feature/RareSeedsTest.php`（新規）

**Interfaces:**
- Produces:
  - `UserProfile::specialSeeds(): HasMany`（`ProfileSpecialSeed`）
  - `ProfileCompanion` の `in_town`（bool）
  - `RareSeeds::rares(): array<string, array>`（設定の順のレアスプル）
  - `RareSeeds::isRare(string $key): bool`
  - `RareSeeds::progress(UserProfile): list<array{key: string, type: string, target: int, current: int, met: bool}>`
  - `RareSeeds::grant(UserProfile): list<string>`（呼び出し側でロック）
  - `RareSeeds::grantLocked(UserProfile): list<string>`（中でロックする。GET の API から呼ぶ）
  - `RareSeeds::bag(UserProfile): list<array{key: string, name: string}>`
  - `RareSeeds::present(list<string>): list<array{key: string, name: string, reason: string}>`
  - `RareSeeds::text(string $type, int $target, string $which): string`（`$which` は `goal` か `reached`）
  - `RareSeeds::condition(string $key, int $current): array{text: string, current: int, target: int, unit: string}`

- [ ] **Step 1: テストを書く**

`tests/Feature/RareSeedsTest.php`:

```php
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
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test --filter=RareSeedsTest`
Expected: FAIL（`Class "App\Support\RareSeeds" not found` など）

- [ ] **Step 3: マイグレーションを書く**

`database/migrations/2026_09_29_000005_create_profile_special_seeds_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * がんばった記念にもらった特別な種(docs/design/2026-09-29-rare-spru-design.md 4-1)。
 * まくまでは種のふくろにあり、まくと planted_at が入る。1人1色につき1行だけ
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_special_seeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // レアスプルのキー(ruby など。config/companions.php の list)
            $table->string('rare_key');
            $table->timestamp('granted_at');
            $table->timestamp('planted_at')->nullable();
            $table->timestamps();

            $table->unique(['user_profile_id', 'rare_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_special_seeds');
    }
};
```

`database/migrations/2026_09_29_000006_add_in_town_to_profile_companions_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 仲間が町に立っているか(docs/design/2026-09-29-rare-spru-design.md 3-5)。町に立つのは5体までで、
 * ほかはおうちで休む。今いる仲間(最大5人)は全員町にいる
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profile_companions', function (Blueprint $table) {
            $table->boolean('in_town')->default(true)->after('bond');
        });
    }

    public function down(): void
    {
        Schema::table('profile_companions', function (Blueprint $table) {
            $table->dropColumn('in_town');
        });
    }
};
```

`database/migrations/2026_09_29_000007_add_reviews_completed_to_user_profiles_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 今日の復習をやりきった回数(docs/design/2026-09-29-rare-spru-design.md 3-1。アンバーの種の条件)。
 * 今までは数えていなかったので、0から数え始める
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->unsignedInteger('reviews_completed')->default(0)->after('last_review_on');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('reviews_completed');
        });
    }
};
```

- [ ] **Step 4: モデルを書く・直す**

`app/Models/ProfileSpecialSeed.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** がんばった記念にもらった特別な種(docs/design/2026-09-29-rare-spru-design.md 4-1) */
class ProfileSpecialSeed extends Model
{
    protected $fillable = ['rare_key', 'granted_at', 'planted_at'];

    protected function casts(): array
    {
        return [
            'granted_at' => 'datetime',
            'planted_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
```

`app/Models/ProfileCompanion.php` の `$fillable` と `casts`:

```php
    protected $fillable = ['companion_key', 'nickname', 'bond', 'in_town'];

    protected function casts(): array
    {
        return [
            'bond' => 'integer',
            'in_town' => 'boolean',
        ];
    }
```

`app/Models/UserProfile.php`:
- `$fillable` の最後の行 `'bloom_base_level', 'last_correct_on', 'partner_companion_key', 'last_review_on',` の後ろに `'reviews_completed',` を足す
- `casts()` に `'reviews_completed' => 'integer',` を足す
- `seeds()` の下に足す:

```php
    /** がんばった記念にもらった特別な種(docs/design/2026-09-29-rare-spru-design.md 4-1) */
    public function specialSeeds(): HasMany
    {
        return $this->hasMany(ProfileSpecialSeed::class);
    }
```

- [ ] **Step 5: 設定を足す**

`config/companions.php` の一番上の説明に1行足す（`| 特別な仲間を足すときは…` の後）:

```php
    | レアスプル(rare が true)は weight 0 で種から選ばれず、condition を満たすともらえる特別な種から生まれる
    | (docs/design/2026-09-29-rare-spru-design.md 3-1)。condition の数字は試験用で、ここだけで変えられる。
```

`'list'` の `'ruru' => [...]],` の後ろに足す:

```php
        // レアスプル。並びはなかまの一覧の順(手に入る目安の早い順)
        'ruby' => ['name' => 'ルビースプル', 'trait' => '赤・がんばる心', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'streak', 'target' => 7], 'lines' => [
                '毎日がんばるきみを見て、生まれてきたよ！',
                '続けるって、すごい力なんだよ',
                'きみのやる気で、ぼくまで熱くなってくる！',
                '今日も会えてうれしいな。いっしょにがんばろう',
                'きみはぼくの一番のしんゆう！ずっと続けていこうね',
            ]],
        'sapphire' => ['name' => 'サファイアスプル', 'trait' => '青・海と空', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'trips', 'target' => 1], 'lines' => [
                '海をこえて会いに来たよ！',
                '空と海の青は、世界じゅうつながってるんだよ',
                'つぎはどんな国の空を見に行こうか',
                'きみといると、遠くの国もすぐそばに感じるね',
                '世界のどこにいても、きみはわたしのしんゆうだよ',
            ]],
        'silver' => ['name' => 'シルバースプル', 'trait' => '銀・こつこつ', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'level', 'target' => 10], 'lines' => [
                'レベル10、おめでとう！ピカピカだね',
                'みがけばみがくほど、光るんだよ',
                'こつこつ学ぶきみ、かっこいいな',
                'きみといっしょに、もっと輝きたいな',
                'きみはぼくの自慢のしんゆう。つぎは金色をめざそう！',
            ]],
        'amber' => ['name' => 'アンバースプル', 'trait' => '琥珀・思い出', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'reviews', 'target' => 10], 'lines' => [
                '覚えたことを、大切にしまっておいたよ',
                '何度も思い出すと、忘れにくくなるんだって',
                '復習って、宝物をみがくみたいだね',
                'きみの覚えたこと、ぜんぶ宝物だよ',
                'きみとの思い出も、ずっと大切にするね。しんゆう！',
            ]],
        'obsidian' => ['name' => 'オブシディアンスプル', 'trait' => '黒曜石・ちょうせん', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'advanced_stages', 'target' => 3], 'lines' => [
                'むずかしい問題に挑むきみ、かっこよかった！',
                'まちがえても、また挑めばいいんだ',
                'むずかしいほど、わくわくしてくるね',
                'きみの強さ、どんどん増えてるよ',
                'どんな壁も、きみとなら越えられる。しんゆうだもん！',
            ]],
        'crystal' => ['name' => 'クリスタルスプル', 'trait' => '水晶・集中', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'catch_perfect', 'target' => 1], 'lines' => [
                '全問正解！すきとおるくらい、すっきりだね',
                '落ち着いて見ると、答えが見えてくるよ',
                '集中してるきみ、キラキラしてる',
                'きみといると、頭がすっきりするんだ',
                'きみの心はクリスタルみたい。ずっとしんゆうでいてね',
            ]],
        'pearl' => ['name' => 'パールスプル', 'trait' => '真珠・少しずつ', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'streak', 'target' => 30], 'lines' => [
                '30日、毎日来てくれてありがとう',
                '真珠はね、少しずつ少しずつ大きくなるの',
                '小さな一歩が、大きな力になるんだよ',
                'きみのがんばり、ずっと見てきたよ',
                'きみはわたしの大切なしんゆう。これからもゆっくり行こうね',
            ]],
        'emerald' => ['name' => 'エメラルドスプル', 'trait' => '緑・なかま', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'companions', 'target' => 5], 'lines' => [
                '仲間がそろって、うれしくて生まれたよ！',
                'みんなといっしょだと、もっと楽しいね',
                '町がにぎやかになってきたね',
                'きみのまわりには、いつも仲間がいるね',
                'きみはみんなの、そしてぼくのしんゆうだよ',
            ]],
        'gold' => ['name' => 'ゴールドスプル', 'trait' => '金・かがやき', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'level', 'target' => 20], 'lines' => [
                'レベル20！きみのがんばりが金色に光ったよ',
                'たくさん学ぶと、心もピカピカになるね',
                'きみの知ってること、どんどん増えてるね',
                'きみといると、毎日がかがやいて見えるよ',
                'きみは最高のしんゆう！いっしょにもっと上をめざそう',
            ]],
        'platinum' => ['name' => 'プラチナスプル', 'trait' => '白金・いちばんの光', 'weight' => 0, 'rare' => true,
            'condition' => ['type' => 'level', 'target' => 30], 'lines' => [
                'レベル30！ここまで来るなんて、本当にすごい',
                '続けてきたきみだけが見られる景色だよ',
                '学ぶことは、ずっと続く冒険なんだ',
                'きみのがんばりは、どんな宝石よりも光ってる',
                'きみはぼくの誇りのしんゆう。これからもよろしくね',
            ]],
```

`'flower_item' => ...,` の後ろに足す:

```php
    /*
    | 特別な種の条件の文(docs/design/2026-09-29-rare-spru-design.md 3-6)。goal はなかまの一覧、reached は種をもらった
    | お祝い。{n} は目標の数で、目標が1のときは *_one があればそちらを使う。unit は一覧の「あと〇〇」
    */
    'condition_texts' => [
        'streak' => ['goal' => '{n}日続けて学ぶ', 'reached' => '{n}日続けて学んだね', 'unit' => '日'],
        'trips' => ['goal' => '{n}か国に着く', 'goal_one' => '外国に着く', 'reached' => '{n}か国に着いたね', 'reached_one' => '初めて外国に着いたね', 'unit' => 'か国'],
        'level' => ['goal' => 'レベル{n}になる', 'reached' => 'レベル{n}になったね', 'unit' => 'レベル'],
        'reviews' => ['goal' => '今日の復習を{n}回やりきる', 'reached' => '復習を{n}回やりきったね', 'unit' => '回'],
        'advanced_stages' => ['goal' => '上級のステージを{n}つクリア', 'reached' => '上級のステージを{n}つクリアしたね', 'unit' => 'つ'],
        'catch_perfect' => ['goal' => 'スプルキャッチで{n}回全問正解', 'goal_one' => 'スプルキャッチで全問正解', 'reached' => 'スプルキャッチで{n}回全問正解したね', 'reached_one' => 'スプルキャッチで全問正解したね', 'unit' => '回'],
        'companions' => ['goal' => '仲間{n}人がそろう', 'reached' => '仲間が{n}人そろったね', 'unit' => '人'],
    ],

    // 町に立てる仲間の数。相棒をふくむ(docs/design/2026-09-29-rare-spru-design.md 3-5)
    'town_limit' => 5,
```

- [ ] **Step 6: 条件の係を書く**

`app/Support/RareSeeds.php`:

```php
<?php

namespace App\Support;

use App\Models\UserProfile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * がんばった記念にもらう特別な種(docs/design/2026-09-29-rare-spru-design.md 3-1・3-2・4-3)。
 * 条件の数は保存せず、今ある記録から数える(今日の復習をやりきった回数だけは user_profiles.reviews_completed)
 */
class RareSeeds
{
    /** @return array<string, array<string, mixed>> 設定(config/companions.php の list)の順のレアスプル */
    public static function rares(): array
    {
        return collect(config('companions.list'))->filter(fn (array $def) => $def['rare'] ?? false)->all();
    }

    public static function isRare(string $key): bool
    {
        return (bool) config("companions.list.{$key}.rare", false);
    }

    /**
     * 10色それぞれの進み具合。current は目標で止める(一覧の棒があふれないように)
     *
     * @return list<array{key: string, type: string, target: int, current: int, met: bool}>
     */
    public static function progress(UserProfile $profile): array
    {
        $counts = [];
        $rows = [];
        foreach (self::rares() as $key => $def) {
            ['type' => $type, 'target' => $target] = $def['condition'];
            $counts[$type] ??= self::count($profile, $type);
            $met = $counts[$type]['reached'] >= $target;
            $rows[] = [
                'key' => $key,
                'type' => $type,
                'target' => $target,
                'current' => $met ? $target : min($counts[$type]['current'], $target),
                'met' => $met,
            ];
        }

        return $rows;
    }

    /**
     * 満たしていて、まだもらっていない色の種を渡す。呼び出し側で、プロフィールを lockForUpdate してから呼ぶ
     *
     * @return list<string> 新しく渡した色(一覧の順)
     */
    public static function grant(UserProfile $profile): array
    {
        $have = $profile->specialSeeds()->pluck('rare_key')->all();
        $granted = [];
        foreach (self::progress($profile) as $row) {
            if ($row['met'] && ! in_array($row['key'], $have, true)) {
                $profile->specialSeeds()->create(['rare_key' => $row['key'], 'granted_at' => now()]);
                $granted[] = $row['key'];
            }
        }

        return $granted;
    }

    /**
     * GET の API から呼ぶ。プロフィールをロックして渡す(2つのタブで同時に開いても2回渡らない)
     *
     * @return list<string>
     */
    public static function grantLocked(UserProfile $profile): array
    {
        return DB::transaction(
            fn () => self::grant(UserProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail()),
        );
    }

    /** @return list<array{key: string, name: string}> 種のふくろの中(まだまいていない種。一覧の順) */
    public static function bag(UserProfile $profile): array
    {
        $inBag = $profile->specialSeeds()->whereNull('planted_at')->pluck('rare_key')->all();

        return collect(self::rares())
            ->filter(fn (array $def, string $key) => in_array($key, $inBag, true))
            ->map(fn (array $def, string $key) => ['key' => $key, 'name' => $def['name']])
            ->values()
            ->all();
    }

    /**
     * 種をもらったお祝い(設計書5-2)に渡す形
     *
     * @param  list<string>  $keys
     * @return list<array{key: string, name: string, reason: string}>
     */
    public static function present(array $keys): array
    {
        return array_map(function (string $key) {
            $def = config("companions.list.{$key}");

            return [
                'key' => $key,
                'name' => $def['name'],
                'reason' => self::text($def['condition']['type'], $def['condition']['target'], 'reached'),
            ];
        }, $keys);
    }

    /** 条件の文。$which は goal(一覧)か reached(お祝い) */
    public static function text(string $type, int $target, string $which): string
    {
        $texts = config("companions.condition_texts.{$type}");
        $template = $target === 1 && isset($texts["{$which}_one"]) ? $texts["{$which}_one"] : $texts[$which];

        return str_replace('{n}', (string) $target, $template);
    }

    /** @return array{text: string, current: int, target: int, unit: string} なかまの一覧の条件 */
    public static function condition(string $key, int $current): array
    {
        ['type' => $type, 'target' => $target] = config("companions.list.{$key}.condition");

        return [
            'text' => self::text($type, $target, 'goal'),
            'current' => $current,
            'target' => $target,
            'unit' => config("companions.condition_texts.{$type}.unit"),
        ];
    }

    /** @return array{reached: int, current: int} reached は満たしたかどうかに使う数、current は一覧に出す数 */
    private static function count(UserProfile $profile, string $type): array
    {
        if ($type === 'streak') {
            return ['reached' => (int) $profile->best_streak, 'current' => self::currentStreak($profile)];
        }

        $count = match ($type) {
            'trips' => $profile->trips()->count(),
            'level' => (int) $profile->level,
            'reviews' => (int) $profile->reviews_completed,
            'advanced_stages' => DB::table('profile_stage_progress')
                ->join('stages', 'stages.id', '=', 'profile_stage_progress.stage_id')
                ->where('profile_stage_progress.user_profile_id', $profile->id)
                ->whereNotNull('profile_stage_progress.cleared_at')
                ->where('stages.difficulty', '上級')
                ->distinct()
                ->count('profile_stage_progress.stage_id'),
            'catch_perfect' => $profile->gamePlays()
                ->where('game', CatchGame::GAME)
                ->whereNotNull('finished_at')
                ->whereColumn('correct_count', 'answered_count')
                ->get(['question_ids', 'answered_count'])
                ->filter(fn ($play) => $play->answered_count > 0 && $play->answered_count === count($play->question_ids))
                ->count(),
            'companions' => $profile->companions()->pluck('companion_key')->reject(fn (string $key) => self::isRare($key))->count(),
        };

        return ['reached' => $count, 'current' => $count];
    }

    /** 今の連続。昨日も今日も学んでいなければ0(連続日数の日の切り替えと同じく日本時間) */
    private static function currentStreak(UserProfile $profile): int
    {
        $today = Garden::today();
        $yesterday = Carbon::parse($today, Garden::TIMEZONE)->subDay()->toDateString();

        return in_array($profile->last_played_date?->toDateString(), [$today, $yesterday], true)
            ? (int) $profile->current_streak
            : 0;
    }
}
```

- [ ] **Step 7: テスト用DBと開発用DBにマイグレーションを当てて、テストを通す**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail test --filter=RareSeedsTest`
Expected: 3つのマイグレーションが当たり、RareSeedsTest が全部 PASS（16件）

- [ ] **Step 8: 全部のサーバーのテストを流す**

Run: `./vendor/bin/sail test 2>&1 | tail -5`
Expected: 全部 PASS（今の429件＋16件）

- [ ] **Step 9: コミット**

```bash
git add database/migrations/2026_09_29_00000{5,6,7}_*.php app/Models/ProfileSpecialSeed.php app/Models/ProfileCompanion.php app/Models/UserProfile.php config/companions.php app/Support/RareSeeds.php tests/Feature/RareSeedsTest.php
git commit -m "#00284: feat:レアスプル10色と特別な種の条件を足す(もらった種の表・町にいる印・復習をやりきった回数・条件の係)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 畑と町（#00285）

**Files:**
- Modify: `app/Support/Garden.php`（`state`・`sow`・`bloom`・`companions`・`companionArray`、`look` を足す）
- Modify: `app/Support/Family.php:60-68`
- Modify: `routes/api.php`（`GET /api/world`・`POST /api/world/garden/sow`、`use App\Support\RareSeeds;`）
- Modify: `tests/Feature/GardenActionsTest.php:132-140`・`tests/Feature/CompanionPartnerTest.php`（`companions.0` の形）・`tests/Feature/FamilyTownTest.php:68`
- Test: `tests/Feature/RareSpruGardenTest.php`（新規）

**Interfaces:**
- Consumes: `RareSeeds::bag`・`RareSeeds::isRare`・`RareSeeds::rares`・`RareSeeds::grantLocked`・`RareSeeds::present`・`UserProfile::specialSeeds()`・`ProfileCompanion::in_town`（Task 1）
- Produces:
  - `Garden::state()` に `look: ?string`・`spru_seed_ready: bool`・`seed_bag: list<{key,name}>` を足し、`can_sow` を「畑が空いていて、スプルの種ができているかふくろに種がある」にする
  - `Garden::sow(UserProfile $profile, string $seed = 'spru'): ProfileSeed`
  - `Garden::look(ProfileSeed $seed): string`
  - `Garden::companions()` の各子に `rare: bool`・`in_town: bool`（キーの並びは `… is_partner, rare, in_town, x, y`）
  - `GET /api/world` に `new_seeds`
  - `POST /api/world/garden/sow` の `seed`

- [ ] **Step 1: テストを書く**

`tests/Feature/RareSpruGardenTest.php`:

```php
<?php

use App\Support\Garden;

/*
|--------------------------------------------------------------------------
| 特別な種をまく・育てる・町に立つ数(docs/design/2026-09-29-rare-spru-design.md 3-2〜3-5・4-4)
|--------------------------------------------------------------------------
*/

it('町を開くと満たした色の種を渡し、お祝いは1回目だけ', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 10, 'bloom_base_level' => 10]);

    $this->getJson('/api/world')->assertOk()
        ->assertJsonPath('new_seeds', [['key' => 'silver', 'name' => 'シルバースプル', 'reason' => 'レベル10になったね']])
        ->assertJsonPath('garden.seed_bag', [['key' => 'silver', 'name' => 'シルバースプル']])
        ->assertJsonPath('garden.spru_seed_ready', false)
        ->assertJsonPath('garden.can_sow', true)
        ->assertJsonPath('garden.look', null);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('new_seeds', []);
    expect($profile->specialSeeds()->count())->toBe(1);
});

it('家族の町を見ても、その人の種は渡らない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $sister->update(['level' => 10]);

    $this->getJson("/api/family/{$sister->id}")->assertOk();

    expect($sister->specialSeeds()->count())->toBe(0);
});

it('特別な種をまくと、その色で育ち、育ち具合は戻らない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 7, 'bloom_base_level' => 4]);
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now()]);

    $this->postJson('/api/world/garden/sow', ['seed' => 'silver'])->assertOk()
        ->assertJsonPath('spru.growth', 3)
        ->assertJsonPath('garden.state', 'seed')
        ->assertJsonPath('garden.look', 'silver')
        ->assertJsonPath('garden.seed_bag', [])
        ->assertJsonPath('garden.spru_seed_ready', true)
        ->assertJsonPath('garden.can_sow', false);

    expect($profile->fresh()->bloom_base_level)->toBe(4)
        ->and($profile->specialSeeds()->first()->planted_at)->not->toBeNull()
        ->and($profile->seeds()->first()->result_key)->toBe('silver');
});

it('ふくろにない色・もうまいた色はまけない', function () {
    $profile = createActiveProfile();
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now(), 'planted_at' => now()]);

    $this->postJson('/api/world/garden/sow', ['seed' => 'ruby'])
        ->assertStatus(422)->assertJsonPath('message', 'その種は持っていないよ');
    $this->postJson('/api/world/garden/sow', ['seed' => 'silver'])
        ->assertStatus(422)->assertJsonPath('message', 'その種は持っていないよ');

    expect($profile->seeds()->count())->toBe(0);
});

it('知らないキー・仲間のキー・花のキーは 422', function (string $seed) {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);

    $this->postJson('/api/world/garden/sow', ['seed' => $seed])
        ->assertStatus(422)->assertJsonPath('message', 'その種は持っていないよ');

    expect($profile->seeds()->count())->toBe(0);
})->with(['riri', 'lumi', 'spru_flower', 'unknown']);

it('ふくろに種があっても、スプルの種ができていなければスプルの種はまけない', function () {
    $profile = createActiveProfile();
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now()]);

    $this->postJson('/api/world/garden/sow')
        ->assertStatus(422)->assertJsonPath('message', 'まだ種ができていないよ');
    $this->postJson('/api/world/garden/sow', ['seed' => 'spru'])
        ->assertStatus(422)->assertJsonPath('message', 'まだ種ができていないよ');
});

it('畑に種が育っていると、特別な種もまけない', function () {
    $profile = createActiveProfile();
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now()]);
    $profile->seeds()->create(['result_key' => 'momo']);

    $this->postJson('/api/world/garden/sow', ['seed' => 'silver'])
        ->assertStatus(422)->assertJsonPath('message', '畑に芽が育っているよ');

    expect($profile->specialSeeds()->first()->planted_at)->toBeNull();
});

it('スプルの種の見た目は、生まれる子にかかわらず spru', function (string $result) {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => $result]);

    $response = $this->getJson('/api/world')->assertOk()->assertJsonPath('garden.look', 'spru');

    expect($response->getContent())->not->toContain('"'.$result.'"');
})->with(['momo', 'spru_flower']);

it('特別な種に3回水をあげると、そのレアスプルが生まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'silver', 'waterings' => 2, 'last_watered_on' => '2026-01-01']);

    $this->postJson('/api/world/garden/water')->assertOk()
        ->assertJsonPath('born.kind', 'companion')
        ->assertJsonPath('born.key', 'silver')
        ->assertJsonPath('born.name', 'シルバースプル')
        ->assertJsonPath('born.trait', '銀・こつこつ')
        ->assertJsonPath('born.lines', ['レベル10、おめでとう！ピカピカだね'])
        ->assertJsonPath('born.rare', true)
        ->assertJsonPath('born.in_town', true)
        ->assertJsonPath('born.is_partner', true)
        ->assertJsonPath('born.x', 0);
});

it('スプルの種からレアスプルは生まれない', function () {
    $profile = createActiveProfile();

    foreach (range(1, 40) as $i) {
        expect(Garden::pickResult($profile))->toBeIn(['lumi', 'momo', 'kuru', 'piko', 'ruru']);
    }
});

it('町が5体でいっぱいなら、生まれた子はおうちで休み、立ち位置はない', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    foreach (['lumi', 'momo', 'kuru', 'piko', 'ruru'] as $key) {
        $profile->companions()->create(['companion_key' => $key]);
    }
    $profile->update(['partner_companion_key' => 'lumi']);
    $profile->seeds()->create(['result_key' => 'silver', 'waterings' => 2, 'last_watered_on' => '2026-01-01']);

    $this->postJson('/api/world/garden/water')->assertOk()
        ->assertJsonPath('born.key', 'silver')
        ->assertJsonPath('born.in_town', false)
        ->assertJsonPath('born.is_partner', false)
        ->assertJsonPath('born.x', null)
        ->assertJsonPath('born.y', null);
});

it('立ち位置は町にいる子だけに、相棒を先頭にして前から付ける', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'lumi', 'in_town' => false]);
    $profile->companions()->create(['companion_key' => 'momo']);
    $profile->companions()->create(['companion_key' => 'kuru']);
    $profile->update(['partner_companion_key' => 'kuru']);

    $this->getJson('/api/world')->assertOk()
        ->assertJsonPath('companions.0.key', 'kuru')
        ->assertJsonPath('companions.0.x', 0)
        ->assertJsonPath('companions.0.y', 3)
        ->assertJsonPath('companions.1.key', 'lumi')
        ->assertJsonPath('companions.1.in_town', false)
        ->assertJsonPath('companions.1.x', null)
        ->assertJsonPath('companions.2.key', 'momo')
        ->assertJsonPath('companions.2.x', 3)
        ->assertJsonPath('companions.2.y', 2);
});

it('家族の町では、おうちの子に立ち位置がなく、畑の見た目が出る', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $sister->companions()->create(['companion_key' => 'lumi']);
    $sister->companions()->create(['companion_key' => 'momo', 'in_town' => false]);
    $sister->update(['partner_companion_key' => 'lumi']);
    $sister->seeds()->create(['result_key' => 'gold']);

    $this->getJson("/api/family/{$sister->id}")->assertOk()
        ->assertJsonPath('garden.look', 'gold')
        ->assertJsonPath('companions.1.key', 'momo')
        ->assertJsonPath('companions.1.x', null);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test --filter=RareSpruGardenTest`
Expected: FAIL（`new_seeds`・`garden.look` が無い、`seed` を受け取らない など）

- [ ] **Step 3: 畑を直す**

`app/Support/Garden.php`:

`state()` を置き換える:

```php
    /** @return array{x:int, y:int, state:string, look:?string, waterings:int, learned_today:bool, watered_today:bool, spru_seed_ready:bool, seed_bag:list<array{key:string, name:string}>, can_sow:bool, can_water:bool} */
    public static function state(UserProfile $profile): array
    {
        $seed = self::activeSeed($profile);
        $learned = self::learnedToday($profile);
        $watered = $seed?->last_watered_on?->toDateString() === self::today();
        $spruSeedReady = self::growth($profile) >= config('companions.growth_steps');
        $bag = RareSeeds::bag($profile);

        return [
            ...self::position(),
            'state' => $seed === null ? 'empty' : ['seed', 'sprout', 'sprout_big'][min($seed->waterings, 2)],
            'look' => $seed === null ? null : self::look($seed),
            'waterings' => $seed?->waterings ?? 0,
            'learned_today' => $learned,
            'watered_today' => $watered,
            'spru_seed_ready' => $spruSeedReady,
            'seed_bag' => $bag,
            'can_sow' => $seed === null && ($spruSeedReady || $bag !== []),
            'can_water' => $seed !== null && $learned && ! $watered,
        ];
    }

    /**
     * 畑の見た目(docs/design/2026-09-29-rare-spru-design.md 3-4)。特別な種はその色、
     * スプルの種は生まれる子にかかわらず spru(誰が生まれるかを画面に送らない)
     */
    public static function look(ProfileSeed $seed): string
    {
        return RareSeeds::isRare($seed->result_key) ? $seed->result_key : 'spru';
    }
```

`companions()` を置き換える:

```php
    /**
     * 生まれた仲間。相棒を先頭に、ほかは生まれた順(docs/design/2026-09-27-spru-wave-c-design.md 3-1)。
     * 立ち位置(config/world.php の companion_spots)は、町にいる子だけにこの順で前から使う。
     * おうちで休んでいる子は x・y が null(docs/design/2026-09-29-rare-spru-design.md 3-5)
     *
     * @return list<array<string, mixed>>
     */
    public static function companions(UserProfile $profile): array
    {
        $spots = config('world.companion_spots');
        $partnerKey = $profile->partner_companion_key;
        $next = 0;

        return $profile->companions()->orderBy('id')->get()
            ->sortBy(fn (ProfileCompanion $companion) => $companion->companion_key === $partnerKey ? 0 : 1)
            ->values()
            ->map(function (ProfileCompanion $companion) use ($partnerKey, $spots, &$next) {
                $spot = $companion->in_town ? ($spots[$next++] ?? null) : null;

                return self::companionArray($companion, $partnerKey, $spot);
            })
            ->all();
    }
```

`sow()` を置き換える:

```php
    /**
     * 呼び出し側で、プロフィールを lockForUpdate してから呼ぶ。$seed は spru(スプルの種)か、
     * ふくろにある特別な種の色(docs/design/2026-09-29-rare-spru-design.md 3-3)。特別な種はスプルの育ち具合を戻さない
     */
    public static function sow(UserProfile $profile, string $seed = 'spru'): ProfileSeed
    {
        if ($seed === 'spru') {
            abort_if(self::growth($profile) < config('companions.growth_steps'), 422, 'まだ種ができていないよ');
            abort_if(self::activeSeed($profile) !== null, 422, '畑に芽が育っているよ');

            $profile->bloom_base_level = $profile->level;
            $profile->save();

            return $profile->seeds()->create(['result_key' => self::pickResult($profile)]);
        }

        abort_if(self::activeSeed($profile) !== null, 422, '畑に芽が育っているよ');
        $special = $profile->specialSeeds()->where('rare_key', $seed)->whereNull('planted_at')->first();
        abort_if($special === null, 422, 'その種は持っていないよ');
        $special->update(['planted_at' => now()]);

        return $profile->seeds()->create(['result_key' => $seed]);
    }
```

`bloom()` の `$profile->companions()->firstOrCreate(['companion_key' => $resultKey]);` を置き換える:

```php
        // 町がいっぱいなら、おうちで休む(docs/design/2026-09-29-rare-spru-design.md 3-5)
        $inTown = $profile->companions()->where('in_town', true)->count() < config('companions.town_limit');
        $profile->companions()->firstOrCreate(['companion_key' => $resultKey], ['in_town' => $inTown]);
```

`companionArray()` の `'is_partner' => $key === $partnerKey,` の後ろに足す:

```php
            'rare' => (bool) ($def['rare'] ?? false),
            'in_town' => (bool) $companion->in_town,
```

- [ ] **Step 4: 家族の町と API を直す**

`app/Support/Family.php` の `'garden' => [...]` を置き換える:

```php
            'garden' => ['x' => $garden['x'], 'y' => $garden['y'], 'state' => $garden['state'], 'look' => $garden['look']],
```

`routes/api.php`:
- `use App\Support\QuestionMemory;` の下に `use App\Support\RareSeeds;` を足す
- `GET /api/world` の `$profile->regenerateHp();` の下に足す:

```php
        // 条件を満たした特別な種を先に渡す(種のふくろに入る。docs/design/2026-09-29-rare-spru-design.md 3-2)
        $newSeeds = RareSeeds::grantLocked($profile);
```

- 同じ返事の `'tickets' => Travel::tickets($profile),` の後ろに `'new_seeds' => RareSeeds::present($newSeeds),` を足す
- `POST /api/world/garden/sow` を置き換える:

```php
    Route::post('/garden/sow', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);
        // spru(スプルの種)か、レアスプルの色だけ(docs/design/2026-09-29-rare-spru-design.md 4-5)
        $data = $request->validate(
            ['seed' => ['nullable', 'string', Rule::in(['spru', ...array_keys(RareSeeds::rares())])]],
            ['seed.in' => 'その種は持っていないよ', 'seed.string' => 'その種は持っていないよ'],
        );

        return DB::transaction(function () use ($activeProfile, $data) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            Garden::sow($profile, $data['seed'] ?? 'spru');

            return ['spru' => ['growth' => Garden::growth($profile)], 'garden' => Garden::state($profile)];
        });
    })->name('garden.sow');
```

- [ ] **Step 5: 今のテストの形を直す**

`tests/Feature/GardenActionsTest.php` の「3回目の水やりで仲間が生まれ、道に並ぶ」の `'bond' => 0, 'next_heart_bond' => 20, 'is_partner' => true, 'x' => 0, 'y' => 3,` を次にする:

```php
            'bond' => 0, 'next_heart_bond' => 20, 'is_partner' => true, 'rare' => false, 'in_town' => true, 'x' => 0, 'y' => 3,
```

`tests/Feature/CompanionPartnerTest.php` の「仲間の一覧に名前・ハート・相棒かが出て、相棒が先頭に立つ」の `'hearts' => 2, 'heart_label' => 'なかよし', 'bond' => 25, 'next_heart_bond' => 50, 'is_partner' => true, 'x' => 0, 'y' => 3,` を次にする:

```php
            'hearts' => 2, 'heart_label' => 'なかよし', 'bond' => 25, 'next_heart_bond' => 50, 'is_partner' => true, 'rare' => false, 'in_town' => true, 'x' => 0, 'y' => 3,
```

`tests/Feature/FamilyTownTest.php` の `->assertJsonPath('garden', ['x' => 1, 'y' => 2, 'state' => 'sprout'])` を次にする:

```php
        ->assertJsonPath('garden', ['x' => 1, 'y' => 2, 'state' => 'sprout', 'look' => 'spru'])
```

ほかに `companions.N` の形を丸ごと比べるテストがあれば、同じく `'rare' => false, 'in_town' => true` を `is_partner` の後ろに足す（`grep -rn "'is_partner' =>" tests/Feature` で探す）。

- [ ] **Step 6: テストを通す**

Run: `./vendor/bin/sail test --filter='RareSpruGardenTest|GardenActionsTest|GardenStateTest|CompanionPartnerTest|FamilyTownTest|CompanionBondTest'`
Expected: 全部 PASS

- [ ] **Step 7: 全部のサーバーのテストを流す**

Run: `./vendor/bin/sail test 2>&1 | tail -5`
Expected: 全部 PASS

- [ ] **Step 8: コミット**

```bash
git add app/Support/Garden.php app/Support/Family.php routes/api.php tests/Feature/RareSpruGardenTest.php tests/Feature/GardenActionsTest.php tests/Feature/CompanionPartnerTest.php tests/Feature/FamilyTownTest.php
git commit -m "#00285: feat:特別な種を畑にまいてレアスプルが生まれるようにし、町に立つのを5体までにする(町を開くと種を渡す・畑の見た目)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: なかまの一覧・町に出す・相棒・復習の回数（#00286）

**Files:**
- Create: `app/Support/Roster.php`
- Modify: `routes/api.php`（`GET /api/world/roster`・`POST /api/world/companions/{key}/town`・`POST /api/world/partner`）
- Modify: `app/Support/Review.php`（`complete`）
- Test: `tests/Feature/RosterTest.php`（新規）・`tests/Feature/CompanionTownTest.php`（新規）・`tests/Feature/ReviewTest.php`（1件足す）

**Interfaces:**
- Consumes: `RareSeeds::progress`・`RareSeeds::condition`・`RareSeeds::grantLocked`・`RareSeeds::present`（Task 1）、`Garden::companions`・`Garden::activeSeed`（Task 2）、`Bond::displayName`・`Bond::hearts`
- Produces:
  - `Roster::of(UserProfile): array{town_limit: int, town_count: int, members: list<array{key, name, rare, status, in_town, is_partner, hearts, condition}>}`
  - `GET /api/world/roster` → `Roster::of` ＋ `new_seeds`
  - `POST /api/world/companions/{key}/town`（`in_town` 必須）→ `{ companions, review }`

- [ ] **Step 1: テストを書く**

`tests/Feature/RosterTest.php`:

```php
<?php

/*
|--------------------------------------------------------------------------
| なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 3-5・4-5・5-5)
|--------------------------------------------------------------------------
*/

it('仲間5人→レアスプル10色の順で、状態と条件を出す', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 10, 'bloom_base_level' => 10]);
    $profile->companions()->create(['companion_key' => 'lumi', 'nickname' => 'ピカ', 'bond' => 25]);
    $profile->update(['partner_companion_key' => 'lumi']);
    $profile->specialSeeds()->create(['rare_key' => 'ruby', 'granted_at' => now(), 'planted_at' => now()]);
    $profile->seeds()->create(['result_key' => 'ruby']);

    $response = $this->getJson('/api/world/roster')->assertOk()
        ->assertJsonPath('town_limit', 5)
        ->assertJsonPath('town_count', 1)
        ->assertJsonPath('new_seeds', [['key' => 'silver', 'name' => 'シルバースプル', 'reason' => 'レベル10になったね']]);

    expect(collect($response->json('members'))->pluck('key')->all())->toBe([
        'lumi', 'momo', 'kuru', 'piko', 'ruru',
        'ruby', 'sapphire', 'silver', 'amber', 'obsidian', 'crystal', 'pearl', 'emerald', 'gold', 'platinum',
    ]);
    $response
        ->assertJsonPath('members.0', ['key' => 'lumi', 'name' => 'ピカ', 'rare' => false, 'status' => 'born', 'in_town' => true, 'is_partner' => true, 'hearts' => 2, 'condition' => null])
        ->assertJsonPath('members.1', ['key' => 'momo', 'name' => '？？？', 'rare' => false, 'status' => 'waiting', 'in_town' => false, 'is_partner' => false, 'hearts' => 0, 'condition' => null])
        ->assertJsonPath('members.5.status', 'growing')
        ->assertJsonPath('members.6', [
            'key' => 'sapphire', 'name' => 'サファイアスプル', 'rare' => true, 'status' => 'waiting', 'in_town' => false, 'is_partner' => false, 'hearts' => 0,
            'condition' => ['text' => '外国に着く', 'current' => 0, 'target' => 1, 'unit' => 'か国'],
        ])
        ->assertJsonPath('members.7.status', 'in_bag')
        ->assertJsonPath('members.14.condition', ['text' => 'レベル30になる', 'current' => 10, 'target' => 30, 'unit' => 'レベル']);
});

it('仲間は畑で育っていても、一覧では生まれるまでなぞのまま', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);

    $response = $this->getJson('/api/world/roster')->assertOk()
        ->assertJsonPath('members.1.status', 'waiting')
        ->assertJsonPath('members.1.name', '？？？');

    expect($response->getContent())->not->toContain('Momo');
});

it('一度渡した種は、条件を満たさなくなっても残る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 5]);
    $profile->specialSeeds()->create(['rare_key' => 'silver', 'granted_at' => now()]);

    $this->getJson('/api/world/roster')->assertOk()
        ->assertJsonPath('members.7.status', 'in_bag')
        ->assertJsonPath('new_seeds', []);

    expect($profile->specialSeeds()->count())->toBe(1);
});
```

`tests/Feature/CompanionTownTest.php`:

```php
<?php

use App\Models\UserProfile;

/*
|--------------------------------------------------------------------------
| 町に出す・おうちで休む(docs/design/2026-09-29-rare-spru-design.md 3-5・4-5)
|--------------------------------------------------------------------------
*/

/** 町にいる仲間5人(相棒は lumi)と、おうちの silver */
function fullTown(UserProfile $profile): void
{
    foreach (['lumi', 'momo', 'kuru', 'piko', 'ruru'] as $key) {
        $profile->companions()->create(['companion_key' => $key]);
    }
    $profile->companions()->create(['companion_key' => 'silver', 'in_town' => false]);
    $profile->update(['partner_companion_key' => 'lumi']);
}

it('おうちで休ませると立ち位置がなくなり、町に出すとまた立つ', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/momo/town', ['in_town' => false])->assertOk()
        ->assertJsonPath('companions.1.key', 'momo')
        ->assertJsonPath('companions.1.in_town', false)
        ->assertJsonPath('companions.1.x', null);

    $this->postJson('/api/world/companions/silver/town', ['in_town' => true])->assertOk()
        ->assertJsonPath('companions.5.key', 'silver')
        ->assertJsonPath('companions.5.in_town', true)
        ->assertJsonPath('companions.5.x', 6);
});

it('町が5体でいっぱいなら、町に出せない', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/silver/town', ['in_town' => true])
        ->assertStatus(422)->assertJsonPath('message', '町はいっぱいだよ。だれかをおうちで休ませてね');
});

it('町にいる子をもう一度町に出しても断らない', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/momo/town', ['in_town' => true])->assertOk();
});

it('相棒は休ませられない', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/lumi/town', ['in_town' => false])
        ->assertStatus(422)->assertJsonPath('message', '相棒はいつも町にいるよ');
});

it('生まれていない子・ほかのプロフィールの子は見つからない', function () {
    $profile = createActiveProfile();
    $sister = createFamilyMember($profile);
    $sister->companions()->create(['companion_key' => 'piko', 'in_town' => false]);

    $this->postJson('/api/world/companions/piko/town', ['in_town' => true])->assertNotFound();
    expect($sister->companions()->first()->in_town)->toBeFalse();
});

it('in_town が無いと 422', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/companions/momo/town', [])->assertStatus(422);
});

it('おうちの子は相棒にできない', function () {
    $profile = createActiveProfile();
    fullTown($profile);

    $this->postJson('/api/world/partner', ['key' => 'silver'])
        ->assertStatus(422)->assertJsonPath('message', '町にいる仲間だけ相棒にできるよ');

    expect($profile->fresh()->partner_companion_key)->toBe('lumi');
});
```

`tests/Feature/ReviewTest.php` の最後に足す:

```php
it('やりきると、やりきった回数が1増える(アンバーの種の条件)', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    makeDue($profile, $question);

    $this->postJson('/api/review/complete')->assertOk();

    expect($profile->fresh()->reviews_completed)->toBe(1);
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test --filter='RosterTest|CompanionTownTest|ReviewTest'`
Expected: FAIL（`/api/world/roster` が 404、`/town` が 404/405、相棒・回数が変わらない）

- [ ] **Step 3: 一覧の形を書く**

`app/Support/Roster.php`:

```php
<?php

namespace App\Support;

use App\Models\UserProfile;

/**
 * なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 4-5・5-5)。仲間5人(設定の順)→レアスプル10色(一覧の順)。
 * 仲間は生まれるまで名前も状態も出さない(畑で育っていても waiting・「？？？」)
 */
class Roster
{
    /** @return array{town_limit: int, town_count: int, members: list<array<string, mixed>>} */
    public static function of(UserProfile $profile): array
    {
        $born = $profile->companions()->get()->keyBy('companion_key');
        $seeds = $profile->specialSeeds()->get()->keyBy('rare_key');
        $growing = Garden::activeSeed($profile)?->result_key;
        $progress = collect(RareSeeds::progress($profile))->keyBy('key');
        $partnerKey = $profile->partner_companion_key;

        $members = collect(config('companions.list'))->map(function (array $def, string $key) use ($born, $seeds, $growing, $progress, $partnerKey) {
            $rare = (bool) ($def['rare'] ?? false);
            $companion = $born->get($key);
            $status = match (true) {
                $companion !== null => 'born',
                ! $rare => 'waiting',
                $growing === $key => 'growing',
                $seeds->has($key) && $seeds[$key]->planted_at === null => 'in_bag',
                default => 'waiting',
            };

            return [
                'key' => $key,
                'name' => $companion !== null ? Bond::displayName($companion) : ($rare ? $def['name'] : '？？？'),
                'rare' => $rare,
                'status' => $status,
                'in_town' => $companion !== null && $companion->in_town,
                'is_partner' => $companion !== null && $key === $partnerKey,
                'hearts' => $companion !== null ? Bond::hearts($companion->bond) : 0,
                'condition' => $rare && $companion === null ? RareSeeds::condition($key, $progress[$key]['current']) : null,
            ];
        })->values()->all();

        return [
            'town_limit' => config('companions.town_limit'),
            'town_count' => $born->where('in_town', true)->count(),
            'members' => $members,
        ];
    }
}
```

- [ ] **Step 4: API を足す・直す**

`routes/api.php`:
- `use App\Support\Review;` の上に `use App\Support\Roster;` を足す（アルファベット順）
- `Route::post('/partner', ...)` の中の `abort_unless($profile->companions()->where('companion_key', $data['key'])->exists(), 422, 'まだ生まれていない仲間だよ');` を置き換える:

```php
            $companion = $profile->companions()->where('companion_key', $data['key'])->first();
            abort_unless($companion, 422, 'まだ生まれていない仲間だよ');
            // 相棒はいつも町にいる。入れ替えを単純にするため、町にいる子だけ(docs/design/2026-09-29-rare-spru-design.md 3-5)
            abort_unless($companion->in_town, 422, '町にいる仲間だけ相棒にできるよ');
```

- `Route::post('/partner', ...)->name('partner');` の後ろに足す:

```php
    // なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 4-5)。町と同じく、条件を満たした種を先に渡す
    Route::get('/roster', function (Request $request) {
        $profile = ActiveProfile::require($request);
        $newSeeds = RareSeeds::grantLocked($profile);

        return [...Roster::of($profile), 'new_seeds' => RareSeeds::present($newSeeds)];
    })->name('roster');

    // 町に出す・おうちで休む。町に立つのは town_limit 体まで、相棒は休ませられない
    Route::post('/companions/{key}/town', function (Request $request, string $key) {
        $activeProfile = ActiveProfile::require($request);
        $request->validate(['in_town' => ['required', 'boolean']]);
        $inTown = $request->boolean('in_town');

        return DB::transaction(function () use ($activeProfile, $key, $inTown) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $companion = $profile->companions()->where('companion_key', $key)->first();
            abort_unless($companion, 404);
            if ($inTown && ! $companion->in_town) {
                $count = $profile->companions()->where('in_town', true)->count();
                abort_if($count >= config('companions.town_limit'), 422, '町はいっぱいだよ。だれかをおうちで休ませてね');
            }
            abort_if(! $inTown && $key === $profile->partner_companion_key, 422, '相棒はいつも町にいるよ');
            $companion->update(['in_town' => $inTown]);

            return ['companions' => Garden::companions($profile), 'review' => Review::state($profile)];
        });
    })->name('companions.town');
```

`app/Support/Review.php` の `complete()` の `$profile->last_review_on = Garden::today();` の下に足す:

```php
        // アンバーの種の条件(docs/design/2026-09-29-rare-spru-design.md 3-1)
        $profile->reviews_completed++;
```

- [ ] **Step 5: テストを通す**

Run: `./vendor/bin/sail test --filter='RosterTest|CompanionTownTest|ReviewTest|CompanionPartnerTest'`
Expected: 全部 PASS

- [ ] **Step 6: 全部のサーバーのテストを流す**

Run: `./vendor/bin/sail test 2>&1 | tail -5`
Expected: 全部 PASS

- [ ] **Step 7: コミット**

```bash
git add app/Support/Roster.php app/Support/Review.php routes/api.php tests/Feature/RosterTest.php tests/Feature/CompanionTownTest.php tests/Feature/ReviewTest.php
git commit -m "#00286: feat:なかまの一覧のAPIと、町に出す・おうちで休むAPIを足す(相棒は町にいる子だけ・復習をやりきった回数を数える)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 絵（#00287）

**Files:**
- Modify: `tools/spru-assets/extract.py`（`garden` の組を `growth` に替える）
- Modify: `tools/spru-assets/crops.json`（元の絵15枚・`companions` を差し替え・`garden` を消して `growth` を足す）
- 書き出し: `frontend/public/spru/companions/*.webp`（15）・`frontend/public/spru/growth/{look}/{stage}.webp`（44）・`frontend/src/components/spru/spru-assets.ts`
- Delete: `frontend/public/spru/garden/seed.webp`・`sprout.webp`
- Create: `frontend/src/components/spru/plant.ts`・`plant.test.ts`
- Modify: `frontend/src/components/world/garden-art.tsx`
- Modify: `frontend/src/components/games/catch/catch-view.ts`・`catch-view.test.ts`

**Interfaces:**
- Produces:
  - `GROWTH_IMAGES`（キーは `"{look}/{stage}"`。look は `spru` と10色、stage は `seed`・`sprout`・`bud`・`flower`）、`GrowthImageKey`
  - `COMPANION_IMAGES` に10色のキーが増える（`CompanionKey` も）
  - `plantImage(look: string | null, stage: PlantStage): SpruImage`、`type PlantStage = "seed" | "sprout" | "bud" | "flower"`（`@/components/spru/plant`）
  - `GARDEN_IMAGES`・`GardenImageKey` はなくなる

- [ ] **Step 1: 育つ絵を選ぶ部品のテストを書く**

`frontend/src/components/spru/plant.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { plantImage } from "./plant";
import { GROWTH_IMAGES } from "./spru-assets";

describe("plantImage", () => {
  it("色と段階の絵を返す", () => {
    expect(plantImage("gold", "bud")).toBe(GROWTH_IMAGES["gold/bud"]);
    expect(plantImage("spru", "seed")).toBe(GROWTH_IMAGES["spru/seed"]);
  });

  it("見た目が無い・知らない色は、ふつうのスプルの絵", () => {
    expect(plantImage(null, "sprout")).toBe(GROWTH_IMAGES["spru/sprout"]);
    expect(plantImage("riri", "flower")).toBe(GROWTH_IMAGES["spru/flower"]);
  });

  it("10色と、ふつうのスプルの4段階がそろっている", () => {
    const looks = ["spru", "ruby", "sapphire", "silver", "amber", "obsidian", "crystal", "pearl", "emerald", "gold", "platinum"];
    for (const look of looks) {
      for (const stage of ["seed", "sprout", "bud", "flower"] as const) {
        expect(Object.keys(GROWTH_IMAGES)).toContain(`${look}/${stage}`);
      }
    }
  });
});
```

`frontend/src/components/games/catch/catch-view.test.ts` の import と「growthImage」のテストを直す:
- `import { GARDEN_IMAGES, SPRU_BLOOM } from "@/components/spru/spru-assets";` → `import { GROWTH_IMAGES, SPRU_BLOOM } from "@/components/spru/spru-assets";`
- `expect(growthImage("seed")).toBe(GARDEN_IMAGES.seed);` → `expect(growthImage("seed")).toBe(GROWTH_IMAGES["spru/seed"]);`
- `expect(growthImage("sprout")).toBe(GARDEN_IMAGES.sprout);` → `expect(growthImage("sprout")).toBe(GROWTH_IMAGES["spru/sprout"]);`

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/spru/plant.test.ts src/components/games/catch/catch-view.test.ts`
Expected: FAIL（`./plant` が無い、`GROWTH_IMAGES` が無い）

- [ ] **Step 3: 切り抜きの道具を直す**

`tools/spru-assets/extract.py`:
- 説明の `つぼみ・花 bloom/、畑の種・芽 garden/、仲間 companions/、` を `つぼみ・花 bloom/、畑で育つ絵 growth/{見た目}/{段階}.webp(キーに / を入れる)、仲間 companions/、` にする
- `write_ts` の引数 `garden: dict` を `growth: dict` にし、中の

```python
export const GARDEN_IMAGES = {{
{entries(garden)}
}} as const satisfies Record<string, SpruImage>;
```

を次にする:

```python
export const GROWTH_IMAGES = {{
{entries(growth)}
}} as const satisfies Record<string, SpruImage>;
```

- 型の行 `export type GardenImageKey = keyof typeof GARDEN_IMAGES;` を `export type GrowthImageKey = keyof typeof GROWTH_IMAGES;` にする
- `main()` の組の並び `"bloom", "garden", "companions", ...` の `"garden"` を `"growth"` にする
- `write_ts(...)` の呼び出しの `parts["garden"]` を `parts["growth"]` にする
- 最後の `print` の `f"・畑 {len(parts['garden'])}・仲間 {len(parts['companions'])}"` を `f"・育つ絵 {len(parts['growth'])}・仲間 {len(parts['companions'])}"` にする

- [ ] **Step 4: 切り抜く範囲を書く**

`tools/spru-assets/crops.json`:

`"sources"` の `"spru": "spru/spru.png",` の後ろに足す:

```json
    "lumi": "spru/lumi.png",
    "momo": "spru/momo.png",
    "kuru": "spru/kuru.png",
    "piko": "spru/piko.png",
    "ruru": "spru/ruru.png",
    "ruby": "spru/ruby-spru.png",
    "sapphire": "spru/sapphire-spru.png",
    "silver": "spru/silver-spru-2.png",
    "amber": "spru/amber-spru.png",
    "obsidian": "spru/obsidian-spru.png",
    "crystal": "spru/crystal-spru-2.png",
    "pearl": "spru/pearl-spru-2.png",
    "emerald": "spru/emerald-spru.png",
    "gold": "spru/gold-spru.png",
    "platinum": "spru/platinum-spru-2.png",
```

`"garden": [ ... ]` を消し、`"companions": [ ... ]` を次の2つに置き換える（範囲は各シートを測った値。`scale` 0.31 で正面の高さが今の仲間と同じ約150pxになる。格子模様の無いシートは `clear_checker` がそのまま返すので、全部に `"background": "checker"` を付けてよい）。

> 設計書5-6の目安「正面は高さ240前後」ではなく、今の仲間と同じ約150にする。町・カード・お祝いでの大きさは、絵のピクセルの高さ（`SPRU_STAND_HEIGHT` との比）で決まるため、240にすると町で仲間がスプルより大きくなる。設計書の「町の中での大きさは、今の仲間と同じ高さにそろえる」を優先する（Ruling として台帳に書く）。

```json
  "growth": [
    { "key": "spru/seed", "source": "spru", "box": [270, 848, 380, 1006], "background": "checker", "scale": 0.6 },
    { "key": "spru/sprout", "source": "spru", "box": [698, 820, 810, 1014], "background": "checker", "scale": 0.6 },
    { "key": "spru/bud", "source": "spru", "box": [916, 808, 1024, 1014], "background": "checker", "scale": 0.6 },
    { "key": "spru/flower", "source": "spru", "box": [1134, 786, 1302, 1014], "background": "checker", "scale": 0.6 },
    { "key": "ruby/seed", "source": "ruby", "box": [272, 852, 376, 1006], "background": "checker", "scale": 0.6 },
    { "key": "ruby/sprout", "source": "ruby", "box": [698, 820, 812, 1012], "background": "checker", "scale": 0.6 },
    { "key": "ruby/bud", "source": "ruby", "box": [916, 810, 1026, 1012], "background": "checker", "scale": 0.6 },
    { "key": "ruby/flower", "source": "ruby", "box": [1124, 784, 1310, 1014], "background": "checker", "scale": 0.6 },
    { "key": "sapphire/seed", "source": "sapphire", "box": [272, 852, 378, 1006], "background": "checker", "scale": 0.6 },
    { "key": "sapphire/sprout", "source": "sapphire", "box": [698, 818, 812, 1014], "background": "checker", "scale": 0.6 },
    { "key": "sapphire/bud", "source": "sapphire", "box": [916, 808, 1026, 1012], "background": "checker", "scale": 0.6 },
    { "key": "sapphire/flower", "source": "sapphire", "box": [1124, 784, 1302, 1014], "background": "checker", "scale": 0.6 },
    { "key": "silver/seed", "source": "silver", "box": [276, 856, 380, 1006], "background": "checker", "scale": 0.6 },
    { "key": "silver/sprout", "source": "silver", "box": [698, 816, 814, 1012], "background": "checker", "scale": 0.6 },
    { "key": "silver/bud", "source": "silver", "box": [916, 812, 1028, 1012], "background": "checker", "scale": 0.6 },
    { "key": "silver/flower", "source": "silver", "box": [1132, 788, 1298, 1014], "background": "checker", "scale": 0.6 },
    { "key": "amber/seed", "source": "amber", "box": [272, 854, 372, 1002], "background": "checker", "scale": 0.6 },
    { "key": "amber/sprout", "source": "amber", "box": [696, 818, 814, 1012], "background": "checker", "scale": 0.6 },
    { "key": "amber/bud", "source": "amber", "box": [914, 808, 1030, 1012], "background": "checker", "scale": 0.6 },
    { "key": "amber/flower", "source": "amber", "box": [1086, 780, 1336, 1016], "background": "checker", "scale": 0.6 },
    { "key": "obsidian/seed", "source": "obsidian", "box": [272, 854, 378, 1006], "background": "checker", "scale": 0.6 },
    { "key": "obsidian/sprout", "source": "obsidian", "box": [696, 820, 812, 1014], "background": "checker", "scale": 0.6 },
    { "key": "obsidian/bud", "source": "obsidian", "box": [914, 810, 1028, 1014], "background": "checker", "scale": 0.6 },
    { "key": "obsidian/flower", "source": "obsidian", "box": [1126, 784, 1308, 1014], "background": "checker", "scale": 0.6 },
    { "key": "crystal/seed", "source": "crystal", "box": [274, 854, 378, 1006], "background": "checker", "scale": 0.6 },
    { "key": "crystal/sprout", "source": "crystal", "box": [696, 814, 812, 1014], "background": "checker", "scale": 0.6 },
    { "key": "crystal/bud", "source": "crystal", "box": [916, 808, 1028, 1014], "background": "checker", "scale": 0.6 },
    { "key": "crystal/flower", "source": "crystal", "box": [1128, 784, 1306, 1014], "background": "checker", "scale": 0.6 },
    { "key": "pearl/seed", "source": "pearl", "box": [272, 856, 376, 1002], "background": "checker", "scale": 0.6 },
    { "key": "pearl/sprout", "source": "pearl", "box": [698, 816, 812, 1012], "background": "checker", "scale": 0.6 },
    { "key": "pearl/bud", "source": "pearl", "box": [916, 808, 1028, 1012], "background": "checker", "scale": 0.6 },
    { "key": "pearl/flower", "source": "pearl", "box": [1130, 786, 1306, 1016], "background": "checker", "scale": 0.6 },
    { "key": "emerald/seed", "source": "emerald", "box": [272, 852, 378, 1006], "background": "checker", "scale": 0.6 },
    { "key": "emerald/sprout", "source": "emerald", "box": [698, 818, 812, 1012], "background": "checker", "scale": 0.6 },
    { "key": "emerald/bud", "source": "emerald", "box": [916, 810, 1026, 1012], "background": "checker", "scale": 0.6 },
    { "key": "emerald/flower", "source": "emerald", "box": [1126, 784, 1306, 1014], "background": "checker", "scale": 0.6 },
    { "key": "gold/seed", "source": "gold", "box": [268, 864, 364, 992], "background": "checker", "scale": 0.6 },
    { "key": "gold/sprout", "source": "gold", "box": [696, 818, 816, 1010], "background": "checker", "scale": 0.6 },
    { "key": "gold/bud", "source": "gold", "box": [914, 810, 1030, 1010], "background": "checker", "scale": 0.6 },
    { "key": "gold/flower", "source": "gold", "box": [1140, 798, 1300, 1012], "background": "checker", "scale": 0.6 },
    { "key": "platinum/seed", "source": "platinum", "box": [274, 856, 382, 1006], "background": "checker", "scale": 0.6 },
    { "key": "platinum/sprout", "source": "platinum", "box": [700, 818, 814, 1012], "background": "checker", "scale": 0.6 },
    { "key": "platinum/bud", "source": "platinum", "box": [918, 814, 1028, 1012], "background": "checker", "scale": 0.6 },
    { "key": "platinum/flower", "source": "platinum", "box": [1126, 786, 1302, 1014], "background": "checker", "scale": 0.6 }
  ],
  "companions": [
    { "key": "lumi", "source": "lumi", "box": [42, 18, 372, 512], "background": "checker", "scale": 0.31 },
    { "key": "momo", "source": "momo", "box": [50, 12, 372, 500], "background": "checker", "scale": 0.31 },
    { "key": "kuru", "source": "kuru", "box": [74, 4, 372, 502], "background": "checker", "scale": 0.31 },
    { "key": "piko", "source": "piko", "box": [42, 18, 372, 498], "background": "checker", "scale": 0.31 },
    { "key": "ruru", "source": "ruru", "box": [72, 16, 374, 500], "background": "checker", "scale": 0.31 },
    { "key": "ruby", "source": "ruby", "box": [46, 12, 376, 504], "background": "checker", "scale": 0.31 },
    { "key": "sapphire", "source": "sapphire", "box": [46, 12, 376, 504], "background": "checker", "scale": 0.31 },
    { "key": "silver", "source": "silver", "box": [44, 14, 376, 502], "background": "checker", "scale": 0.31 },
    { "key": "amber", "source": "amber", "box": [46, 12, 374, 502], "background": "checker", "scale": 0.31 },
    { "key": "obsidian", "source": "obsidian", "box": [46, 14, 374, 504], "background": "checker", "scale": 0.31 },
    { "key": "crystal", "source": "crystal", "box": [42, 10, 376, 502], "background": "checker", "scale": 0.31 },
    { "key": "pearl", "source": "pearl", "box": [42, 10, 376, 502], "background": "checker", "scale": 0.31 },
    { "key": "emerald", "source": "emerald", "box": [46, 14, 376, 504], "background": "checker", "scale": 0.31 },
    { "key": "gold", "source": "gold", "box": [50, 20, 370, 494], "background": "checker", "scale": 0.31 },
    { "key": "platinum", "source": "platinum", "box": [46, 14, 376, 504], "background": "checker", "scale": 0.31 }
  ],
```

- [ ] **Step 5: 書き出す**

Run: `git rm -q frontend/public/spru/garden/seed.webp frontend/public/spru/garden/sprout.webp && python3 tools/spru-assets/extract.py ../../company/spra/mascot/assets`（5〜6分かかる）
Expected: 最後に「…・育つ絵 44・仲間 15・…を書き出しました」。`git status --short frontend/public/spru` で、`companions/` の15枚（5枚は変更・10枚は新規）と `growth/` の44枚だけが増減し、ほかの絵は変わらない

- [ ] **Step 6: 絵を目で確かめる**

Run: `python3 -c "from PIL import Image; import glob; [print(p, Image.open(p).size) for p in sorted(glob.glob('frontend/public/spru/companions/*.webp'))]"`
Expected: 15枚とも高さ145〜160ほど

各色の `growth/*/flower.webp`・`companions/*.webp` を数枚 Read で開き、格子模様が残っていないこと、体が削れていないこと、となりの絵が入っていないことを見る（残っていたら、その絵の `box` を狭める）

- [ ] **Step 7: 育つ絵を選ぶ部品を書き、畑とスプルキャッチを替える**

`frontend/src/components/spru/plant.ts`:

```ts
import { GROWTH_IMAGES, type SpruImage } from "./spru-assets";

export type PlantStage = "seed" | "sprout" | "bud" | "flower";

/**
 * 畑で育つ絵(docs/design/2026-09-29-rare-spru-design.md 3-4)。look は spru(ふつうのスプル。仲間の種もこれ)か
 * レアスプルの色。見た目が無い・絵の無い色は、ふつうのスプルの絵
 */
export function plantImage(look: string | null, stage: PlantStage): SpruImage {
  const images: Record<string, SpruImage> = GROWTH_IMAGES;
  return images[`${look ?? "spru"}/${stage}`] ?? GROWTH_IMAGES[`spru/${stage}`];
}
```

`frontend/src/components/world/garden-art.tsx` を置き換える:

```tsx
import { plantImage, type PlantStage } from "@/components/spru/plant";

import type { GardenState } from "./types";

// 畑の状態ごとの絵と高さ(SVGの単位)。2回水をあげた大きな芽は、つぼみの絵(docs/design/2026-09-29-rare-spru-design.md 3-4)
const PLANT: Record<Exclude<GardenState, "empty">, { stage: PlantStage; height: number }> = {
  seed: { stage: "seed", height: 16 },
  sprout: { stage: "sprout", height: 24 },
  sprout_big: { stage: "bud", height: 30 },
};

/** スプルの家の前の畑(原点=マスの中心)。土の畝に、水やりの回数に応じた種・芽・つぼみを重ねる */
export function GardenArt({ state, look }: { state: GardenState; look: string | null }) {
  const plant = state === "empty" ? null : PLANT[state];
  const asset = plant ? plantImage(look, plant.stage) : null;
  const width = plant && asset ? (asset.width * plant.height) / asset.height : 0;
  return (
    <g>
      <ellipse cx={0} cy={3} rx={26} ry={10} fill="#2f5d2a" opacity={0.14} />
      <polygon points="-24,0 0,-12 24,0 0,12" fill="#8a5a3a" />
      <polygon points="-24,0 0,12 0,15 -24,3" fill="#6e452b" />
      <polygon points="0,12 24,0 24,3 0,15" fill="#5c3a24" />
      <path d="M-14 -3 L10 -15 M-8 3 L16 -9 M-2 9 L22 -3" stroke="#6e452b" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      {plant && asset && (
        <image href={asset.src} x={-width / 2} y={-plant.height + 4} width={width} height={plant.height} />
      )}
    </g>
  );
}
```

`frontend/src/components/world/world-scene.tsx:346` の `<GardenArt state={garden.state} />` を `<GardenArt state={garden.state} look={null} />` にする（Task 5 で `garden.look` に替える）

`frontend/src/components/games/catch/catch-view.ts`:
- `import { GARDEN_IMAGES, SPRU_BLOOM, type SpruImage } from "@/components/spru/spru-assets";` → `import { GROWTH_IMAGES, SPRU_BLOOM, type SpruImage } from "@/components/spru/spru-assets";`
- `seed: GARDEN_IMAGES.seed,` → `seed: GROWTH_IMAGES["spru/seed"],`
- `sprout: GARDEN_IMAGES.sprout,` → `sprout: GROWTH_IMAGES["spru/sprout"],`

`grep -rn "GARDEN_IMAGES\|GardenImageKey" frontend/src` で、ほかに残っていないことを確かめる

- [ ] **Step 8: テストと型と lint を通す**

Run: `cd frontend && npx vitest run src/components/spru/plant.test.ts src/components/games/catch/catch-view.test.ts && npm run typecheck && npm run lint && npm test 2>&1 | tail -4`
Expected: 全部 PASS、型・lint のエラー0

- [ ] **Step 9: コミット**

```bash
git add tools/spru-assets/extract.py tools/spru-assets/crops.json frontend/public/spru frontend/src/components/spru frontend/src/components/world/garden-art.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/games/catch
git commit -m "#00287: feat:新しい設定画から仲間5人の正面の絵とレアスプル10色の絵・育つ絵を切り抜く(畑とスプルキャッチの種・芽を新しい絵にする)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 畑の画面（どの種をまく？）（#00288）

**Files:**
- Modify: `frontend/src/components/world/types.ts`
- Modify: `frontend/src/components/world/garden.ts`・`garden.test.ts`
- Modify: `frontend/src/components/world/errands.test.ts`（畑の形）
- Create: `frontend/src/components/world/seed-picker.tsx`
- Modify: `frontend/src/components/world/world-screen.tsx`
- Modify: `frontend/src/components/world/world-scene.tsx:346`
- Modify: `frontend/src/components/family/family-town.tsx:187-194`

**Interfaces:**
- Consumes: `plantImage`（Task 4）、API の `garden.look`・`garden.spru_seed_ready`・`garden.seed_bag`・`POST /api/world/garden/sow` の `seed`（Task 2）
- Produces:
  - 型: `SeedBagItem`・`NewSeed`・`RosterStatus`・`RosterCondition`・`RosterMember`・`RosterData`、`WorldGarden` に `look`・`spru_seed_ready`・`seed_bag`、`WorldCompanion` に `rare`・`in_town`、`WorldData` に `new_seeds`
  - `canSowSpruSeed(garden): boolean`・`seedOptions(garden): SeedOption[]`・`seedLabel(name): string`（`./garden`）
  - `GardenTap` に `{ action: "choose" }`
  - `SeedPicker`（`./seed-picker`）

- [ ] **Step 1: テストを書く**

`frontend/src/components/world/garden.test.ts`:
- import を `import { canSowSpruSeed, gardenPrompt, growthLabel, levelUpGrowthLine, pickGardenTap, seedLabel, seedOptions } from "./garden";` にする
- 畑の形 `garden` に `look: null,`（`state` の後）と `spru_seed_ready: false,`・`seed_bag: [],`（`watered_today` の後）を足す
- 「種がまけるときは種まき」を次にする:

```ts
  it("スプルの種ができていて、ふくろが空なら、すぐ種まき", () => {
    expect(pickGardenTap(garden({ spru_seed_ready: true, can_sow: true }))).toEqual({ action: "sow" });
  });

  it("ふくろに種があれば、どの種をまくかを選ぶ", () => {
    const bag = [{ key: "ruby", name: "ルビースプル" }];
    expect(pickGardenTap(garden({ seed_bag: bag, can_sow: true }))).toEqual({ action: "choose" });
    expect(pickGardenTap(garden({ spru_seed_ready: true, seed_bag: bag, can_sow: true }))).toEqual({ action: "choose" });
  });
```

- 「gardenPrompt」の `describe` を次にする:

```ts
describe("gardenPrompt", () => {
  it("スプルの種、特別な種、水やりの順に案内し、どれもできなければ無し", () => {
    expect(gardenPrompt(garden({ spru_seed_ready: true, can_sow: true }))).toBe("花が咲いたよ！タップして種をまこう");
    expect(gardenPrompt(garden({ seed_bag: [{ key: "ruby", name: "ルビースプル" }], can_sow: true }))).toBe(
      "特別な種を畑にまいてみよう！",
    );
    expect(gardenPrompt(garden({ state: "seed", can_water: true }))).toBe("芽に水をあげよう！");
    expect(gardenPrompt(garden({ state: "seed", learned_today: true, watered_today: true }))).toBeNull();
  });

  it("畑に種があれば、スプルの種ができていても種まきの案内はしない", () => {
    expect(gardenPrompt(garden({ state: "seed", spru_seed_ready: true, learned_today: true, watered_today: true }))).toBeNull();
  });
});

describe("canSowSpruSeed", () => {
  it("畑が空いていて、スプルの種ができているときだけ", () => {
    expect(canSowSpruSeed(garden({ spru_seed_ready: true }))).toBe(true);
    expect(canSowSpruSeed(garden({ seed_bag: [{ key: "ruby", name: "ルビースプル" }], can_sow: true }))).toBe(false);
    expect(canSowSpruSeed(garden({ state: "seed", spru_seed_ready: true }))).toBe(false);
  });
});

describe("seedOptions", () => {
  it("スプルの種(できているときだけ)→ふくろの種の順", () => {
    const bag = [
      { key: "ruby", name: "ルビースプル" },
      { key: "gold", name: "ゴールドスプル" },
    ];
    expect(seedOptions(garden({ spru_seed_ready: true, seed_bag: bag }))).toEqual([
      { seed: "spru", label: "スプルの種", note: "なにが生まれるかな？", look: "spru" },
      { seed: "ruby", label: "ルビーの種", note: null, look: "ruby" },
      { seed: "gold", label: "ゴールドの種", note: null, look: "gold" },
    ]);
    expect(seedOptions(garden({ seed_bag: bag })).map((option) => option.seed)).toEqual(["ruby", "gold"]);
  });

  it("「〇〇スプル」を「〇〇の種」にする", () => {
    expect(seedLabel("オブシディアンスプル")).toBe("オブシディアンの種");
  });
});
```

`frontend/src/components/world/errands.test.ts`:
- `garden` の形に `look: null,`（`state` の後）と `spru_seed_ready: false,`・`seed_bag: [],`（`watered_today` の後）を足す
- `garden: { ...garden, can_sow: true }` を `garden: { ...garden, spru_seed_ready: true, can_sow: true }` にする

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/garden.test.ts`
Expected: FAIL（`canSowSpruSeed`・`seedOptions`・`seedLabel` が無い）

- [ ] **Step 3: 型を足す**

`frontend/src/components/world/types.ts`:

`WorldGarden` を置き換える:

```ts
/** 種のふくろの中の特別な種(docs/design/2026-09-29-rare-spru-design.md 4-4) */
export type SeedBagItem = { key: string; name: string };

export type WorldGarden = {
  x: number;
  y: number;
  state: GardenState;
  /** 育っている種の見た目。spru(仲間の種もこれ)か、レアスプルの色。空の畑は null */
  look: string | null;
  waterings: number;
  learned_today: boolean;
  watered_today: boolean;
  /** スプルの種(レベルアップ3回)ができている */
  spru_seed_ready: boolean;
  seed_bag: SeedBagItem[];
  can_sow: boolean;
  can_water: boolean;
};
```

`WorldCompanion` の `is_partner: boolean;` の後ろに足す:

```ts
  rare: boolean;
  /** 町に立っている(false ならおうちで休んでいて、x・y は null) */
  in_town: boolean;
```

`WorldData` の `tickets: number;` の後ろに足す:

```ts
  /** この読み込みで新しくもらった特別な種(docs/design/2026-09-29-rare-spru-design.md 5-2) */
  new_seeds: NewSeed[];
```

`BornResult` の上に足す:

```ts
export type NewSeed = { key: string; name: string; reason: string };

/** なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 4-5) */
export type RosterStatus = "born" | "growing" | "in_bag" | "waiting";
export type RosterCondition = { text: string; current: number; target: number; unit: string };
export type RosterMember = {
  key: string;
  name: string;
  rare: boolean;
  status: RosterStatus;
  in_town: boolean;
  is_partner: boolean;
  hearts: number;
  condition: RosterCondition | null;
};
export type RosterData = { town_limit: number; town_count: number; members: RosterMember[]; new_seeds: NewSeed[] };
```

`FamilyTown` の `garden: Pick<WorldGarden, "x" | "y" | "state">;` を `garden: Pick<WorldGarden, "x" | "y" | "state" | "look">;` にする

- [ ] **Step 4: 畑の動きを書く**

`frontend/src/components/world/garden.ts` の上半分（`NEXT_GROWTH` より上）を置き換える:

```ts
import type { SpruImageKey } from "@/components/spru/spru-assets";

import type { WorldGarden } from "./types";

export type GardenTap =
  | { action: "sow" }
  | { action: "choose" }
  | { action: "water" }
  | { action: "say"; image: SpruImageKey; line: string };

/**
 * スプルの種をまける(畑が空いていて、スプルの種ができている)。町のスプルのタップとふだんのひとことはこれを見る
 * (特別な種だけのときに、スプルの花の話をしないため。docs/design/2026-09-29-rare-spru-design.md 5-4)
 */
export function canSowSpruSeed(garden: WorldGarden): boolean {
  return garden.state === "empty" && garden.spru_seed_ready;
}

/** 畑をタップしたときの動き(B回の設計書3-4)。ふくろに種があれば、どの種をまくかを選ぶ(レアスプルの設計書3-3) */
export function pickGardenTap(garden: WorldGarden): GardenTap {
  if (garden.state === "empty") {
    if (garden.seed_bag.length > 0) return { action: "choose" };
    return garden.spru_seed_ready
      ? { action: "sow" }
      : { action: "say", image: "think", line: "レベルが上がると、スプルに花が咲くよ" };
  }
  if (garden.can_water) return { action: "water" };
  if (!garden.learned_today) return { action: "say", image: "think", line: "今日1問正解したら、水をあげられるよ" };
  return { action: "say", image: "smile", line: "今日はもう水をあげたよ。また明日ね" };
}

/** スプルのふだんのひとことより優先する、畑の案内(B回の設計書3-4、レアスプルの設計書5-4) */
export function gardenPrompt(garden: WorldGarden): string | null {
  if (canSowSpruSeed(garden)) return "花が咲いたよ！タップして種をまこう";
  if (garden.state === "empty" && garden.seed_bag.length > 0) return "特別な種を畑にまいてみよう！";
  if (garden.can_water) return "芽に水をあげよう！";
  return null;
}

export type SeedOption = { seed: string; label: string; note: string | null; look: string };

/** どの種をまく？の並び(レアスプルの設計書5-3)。スプルの種(できているときだけ)→ふくろの種 */
export function seedOptions(garden: WorldGarden): SeedOption[] {
  const spru: SeedOption[] = garden.spru_seed_ready
    ? [{ seed: "spru", label: "スプルの種", note: "なにが生まれるかな？", look: "spru" }]
    : [];
  return [...spru, ...garden.seed_bag.map((item) => ({ seed: item.key, label: seedLabel(item.name), note: null, look: item.key }))];
}

/** 「ルビースプル」→「ルビーの種」 */
export function seedLabel(name: string): string {
  return `${name.replace(/スプル$/, "")}の種`;
}
```

- [ ] **Step 5: テストを通す**

Run: `cd frontend && npx vitest run src/components/world/garden.test.ts src/components/world/errands.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: どの種をまく？を書く**

`frontend/src/components/world/seed-picker.tsx`:

```tsx
"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { plantImage } from "@/components/spru/plant";

import { seedOptions } from "./garden";
import type { WorldGarden } from "./types";

/** 空いている畑をタップしたときの「どの種をまく？」(docs/design/2026-09-29-rare-spru-design.md 5-3) */
export function SeedPicker({
  garden,
  busy,
  onPick,
  onClose,
}: {
  garden: WorldGarden;
  busy: boolean;
  onPick: (seed: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seed-picker-title"
        className="relative flex w-full max-w-[480px] flex-col gap-2 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <h2 id="seed-picker-title" className="text-center text-lg font-black text-[#2e6b1c]">
          <AutoFurigana text="どの種をまく？" />
        </h2>
        {seedOptions(garden).map((option) => {
          const asset = plantImage(option.look, "seed");
          return (
            <button
              key={option.seed}
              type="button"
              disabled={busy}
              onClick={() => onPick(option.seed)}
              className="flex h-16 items-center gap-3 rounded-2xl bg-[#f5efe1] px-3 text-left disabled:opacity-60"
            >
              <Image src={asset.src} alt="" width={Math.round((asset.width * 44) / asset.height)} height={44} aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="text-base font-black">
                  <AutoFurigana text={option.label} />
                </span>
                {option.note && (
                  <span className="text-xs font-bold text-[#6b5d45]">
                    <AutoFurigana text={option.note} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          やめる
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 町の画面につなぐ**

`frontend/src/components/world/world-screen.tsx`:
- import の `import { pickGardenTap } from "./garden";` を `import { canSowSpruSeed, pickGardenTap, seedLabel } from "./garden";` にし、`import { SeedPicker } from "./seed-picker";` を `import { ReviewCard } from "./review-card";` の下に足す
- `const [gardenBusy, setGardenBusy] = useState(false);` の下に足す:

```tsx
  // どの種をまく？(ふくろに種があるとき)
  const [pickerOpen, setPickerOpen] = useState(false);
```

- `async function sow() {` から、その関数の終わりまでを置き換える:

```tsx
  // seed は spru(スプルの種)か、ふくろの特別な種の色(docs/design/2026-09-29-rare-spru-design.md 3-3)
  async function sow(seed: string = "spru") {
    if (gardenBusy) return;
    setGardenBusy(true);
    try {
      const res = await apiFetch("/api/world/garden/sow", { method: "POST", body: JSON.stringify({ seed }) }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      setPickerOpen(false);
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      const next: { spru: { growth: number }; garden: WorldGarden } = data;
      const planted = world?.garden.seed_bag.find((item) => item.key === seed);
      setWorld((prev) => (prev ? { ...prev, spru: next.spru, garden: next.garden } : prev));
      setMessage(null);
      play("correct");
      // スプルの種はスプルが頭を振って種が飛ぶ。特別な種は畑に植わるだけ(設計書5-3)
      if (planted) {
        setEvent({ kind: "say", at: Date.now(), image: "happy", line: `${seedLabel(planted.name)}をまいたよ！毎日水をあげて育てよう` });
      } else {
        setEvent({ kind: "sow", at: Date.now() });
      }
    } finally {
      setGardenBusy(false);
    }
  }
```

- `handleSpruTap` の `const tap = pickSpruTap({ canSow: world.garden.can_sow, review: world.review });` を `const tap = pickSpruTap({ canSow: canSowSpruSeed(world.garden), review: world.review });` にする
- `handleGardenTap` の `if (tap.action === "sow") sow();` を次にする:

```tsx
    if (tap.action === "sow") sow();
    else if (tap.action === "choose") setPickerOpen(true);
```

- `{reviewCardOpen && world.review.available && (` の上に足す:

```tsx
      {pickerOpen && (
        <SeedPicker garden={world.garden} busy={gardenBusy} onPick={(seed) => sow(seed)} onClose={() => setPickerOpen(false)} />
      )}
```

`frontend/src/components/world/world-scene.tsx:346` の `<GardenArt state={garden.state} look={null} />` を `<GardenArt state={garden.state} look={garden.look} />` にする

`frontend/src/components/family/family-town.tsx` の、見るだけの畑の形の `can_sow: false,` の上に `spru_seed_ready: false,` と `seed_bag: [],` を足す

- [ ] **Step 8: テストと型と lint を通す**

Run: `cd frontend && npm run typecheck && npm run lint && npm test 2>&1 | tail -4`
Expected: 全部 PASS、型・lint のエラー0（`WorldCompanion` の `rare`・`in_town`、`WorldData` の `new_seeds` を作っているテストの形があれば、ここで足す）

- [ ] **Step 9: コミット**

```bash
git add frontend/src/components/world frontend/src/components/family/family-town.tsx
git commit -m "#00288: feat:空いている畑をタップすると「どの種をまく？」を出し、特別な種をその色で育てる(町のスプルはスプルの種のときだけ種まきを案内する)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 種をもらったお祝い・生まれたときのお祝い（#00289）

**Files:**
- Modify: `frontend/src/components/world/companions.ts`・`companions.test.ts`
- Create: `frontend/src/components/world/seed-gift.tsx`
- Modify: `frontend/src/components/world/born-overlay.tsx`
- Modify: `frontend/src/components/world/world-screen.tsx`

**Interfaces:**
- Consumes: `NewSeed`・`WorldCompanion.rare`・`WorldCompanion.in_town`・`WorldData.new_seeds`（Task 5）、`seedLabel`（Task 5）、`plantImage`（Task 4）
- Produces:
  - `bornNote(companion: Pick<WorldCompanion, "is_partner" | "in_town">): string | null`・`bornLook(companion: Pick<WorldCompanion, "key" | "rare">): string`（`./companions`）
  - `SeedGift`（`./seed-gift`）
  - world-screen の `seedGifts` の状態（Task 7 の一覧からも入れる）

- [ ] **Step 1: テストを書く**

`frontend/src/components/world/companions.test.ts` の import に `bornLook,`・`bornNote,` を足し（アルファベット順で先頭）、最後に足す:

```ts
describe("bornNote", () => {
  it("おうちで休む子・相棒でない子・相棒の順に、お祝いの下の一言を決める", () => {
    expect(bornNote({ is_partner: false, in_town: false })).toBe(
      "町がいっぱいだから、おうちで休んでいるよ。なかまの一覧で町に出せるよ",
    );
    expect(bornNote({ is_partner: false, in_town: true })).toBe("町でタップすると、相棒にできるよ");
    expect(bornNote({ is_partner: true, in_town: true })).toBeNull();
  });
});

describe("bornLook", () => {
  it("仲間は緑の花、レアスプルはその色の花", () => {
    expect(bornLook({ key: "momo", rare: false })).toBe("spru");
    expect(bornLook({ key: "gold", rare: true })).toBe("gold");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/companions.test.ts`
Expected: FAIL（`bornNote`・`bornLook` が無い）

- [ ] **Step 3: 一言と花の色を書く**

`frontend/src/components/world/companions.ts` の最後に足す（`WorldCompanion` を型の import に足す）:

```ts
/** 生まれたときのお祝いの下の一言(docs/design/2026-09-29-rare-spru-design.md 5-4) */
export function bornNote(companion: Pick<WorldCompanion, "is_partner" | "in_town">): string | null {
  if (!companion.in_town) return "町がいっぱいだから、おうちで休んでいるよ。なかまの一覧で町に出せるよ";
  if (!companion.is_partner) return "町でタップすると、相棒にできるよ";
  return null;
}

/** 生まれる前に咲く花の見た目。仲間は緑(ふつうのスプル)、レアスプルはその色 */
export function bornLook(companion: Pick<WorldCompanion, "key" | "rare">): string {
  return companion.rare ? companion.key : "spru";
}
```

- [ ] **Step 4: テストを通す**

Run: `cd frontend && npx vitest run src/components/world/companions.test.ts`
Expected: PASS

- [ ] **Step 5: 種をもらったお祝いを書く**

`frontend/src/components/world/seed-gift.tsx`:

```tsx
"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { plantImage } from "@/components/spru/plant";

import { seedLabel } from "./garden";
import type { NewSeed } from "./types";

/** 条件を満たして特別な種をもらったときのお祝い(docs/design/2026-09-29-rare-spru-design.md 5-2) */
export function SeedGift({ seeds, onClose }: { seeds: NewSeed[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seed-gift-title"
        className="animate-pop-in flex max-h-[85vh] w-full max-w-[340px] flex-col items-center gap-3 overflow-y-auto rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <h2 id="seed-gift-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text="特別な種をもらった！" />
        </h2>
        <ul className="flex w-full flex-col gap-2">
          {seeds.map((seed) => {
            const asset = plantImage(seed.key, "seed");
            return (
              <li key={seed.key} className="flex items-center gap-3 rounded-2xl bg-[#f5efe1] px-3 py-2 text-left">
                <Image
                  src={asset.src}
                  alt=""
                  width={Math.round((asset.width * 48) / asset.height)}
                  height={48}
                  aria-hidden
                  className="animate-spru-hop"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-black">
                    <AutoFurigana text={seedLabel(seed.name)} />
                  </span>
                  <span className="text-xs font-bold text-[#6b5d45]">
                    <AutoFurigana text={seed.reason} />
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text="畑にまいてみよう" />
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          つづける
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 生まれたときのお祝いを直す**

`frontend/src/components/world/born-overlay.tsx` を置き換える:

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { plantImage } from "@/components/spru/plant";
import { COMPANION_IMAGES, SPRU_BLOOM, type CompanionKey } from "@/components/spru/spru-assets";
import { prefersReducedMotion } from "@/lib/motion";

import { bornLook, bornNote } from "./companions";
import type { BornResult } from "./types";

// 花が咲いてから本人が出るまで(docs/design/2026-09-29-rare-spru-design.md 5-4)
const FLOWER_MS = 800;

/** 3回目の水やりで生まれたときの全画面のお祝い(B回の設計書3-5)。仲間・レアスプルは、先にその子の花が咲く */
export function BornOverlay({ born, onClose }: { born: BornResult; onClose: () => void }) {
  const companion = born.kind === "companion" ? born : null;
  // お祝いは操作の後にだけ出る(サーバーでは描かない)ので、最初の状態で動きを減らす設定を見てよい
  const [bloomed, setBloomed] = useState(() => companion === null || prefersReducedMotion());

  useEffect(() => {
    if (bloomed) return;
    const timer = setTimeout(() => setBloomed(true), FLOWER_MS);
    return () => clearTimeout(timer);
  }, [bloomed]);

  const asset = !companion ? SPRU_BLOOM.flower : bloomed ? COMPANION_IMAGES[companion.key as CompanionKey] : plantImage(bornLook(companion), "flower");
  const height = companion ? (bloomed ? 150 : 110) : 80;
  const note = companion ? bornNote(companion) : null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="born-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <div className="flex h-[150px] items-end justify-center">
          {asset && (
            <Image
              key={bloomed ? "figure" : "flower"}
              src={asset.src}
              alt={companion ? (bloomed ? companion.name : "") : "スプルの花"}
              width={Math.round((asset.width * height) / asset.height)}
              height={height}
              className={bloomed ? "animate-spru-hop" : "animate-pop-in"}
            />
          )}
        </div>
        <h2 id="born-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text={companion ? `${companion.name}が生まれた！` : "スプルの花が咲いた！"} />
        </h2>
        {companion ? (
          <>
            <p className="rounded-full bg-[#f5efe1] px-3 py-0.5 text-sm font-black text-[#6b5d45]">
              <AutoFurigana text={companion.trait} />
            </p>
            <p className="text-sm font-bold text-[#6b5d45]">
              <AutoFurigana text={`「${companion.lines[0] ?? ""}」`} />
            </p>
            {note && (
              <p className="text-xs font-bold text-[#8a7a5c]">
                <AutoFurigana text={note} />
              </p>
            )}
          </>
        ) : (
          <p className="text-sm font-bold text-[#6b5d45]">
            <AutoFurigana text="バッグに入れたよ" />
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          {companion && companion.in_town ? "町にむかえる" : "つづける"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 町の画面につなぐ**

`frontend/src/components/world/world-screen.tsx`:
- `import { SeedPicker } from "./seed-picker";` の下に `import { SeedGift } from "./seed-gift";` を足し、型の import に `NewSeed,` を足す
- `const [pickerOpen, setPickerOpen] = useState(false);` の下に足す:

```tsx
  // 新しくもらった特別な種(ほかのお祝いの後に出す。docs/design/2026-09-29-rare-spru-design.md 5-2)
  const [seedGifts, setSeedGifts] = useState<NewSeed[]>([]);
```

- 最初の読み込みの `setGreetings(data.greetings);` の下に `setSeedGifts(data.new_seeds);` を足す
- `{born && <BornOverlay born={born} onClose={handleBornClose} />}` の上に足す:

```tsx
      {calm && greetings.length === 0 && !season && !born && seedGifts.length > 0 && (
        <SeedGift seeds={seedGifts} onClose={() => setSeedGifts([])} />
      )}
```

- [ ] **Step 8: テストと型と lint を通す**

Run: `cd frontend && npm run typecheck && npm run lint && npm test 2>&1 | tail -4`
Expected: 全部 PASS、型・lint のエラー0

- [ ] **Step 9: コミット**

```bash
git add frontend/src/components/world
git commit -m "#00289: feat:特別な種をもらったお祝いを出し、生まれたときはその子の花が咲いてから出てくるようにする(おうちで休む子の一言)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: なかまの一覧（#00290）

**Files:**
- Create: `frontend/src/components/world/roster.ts`・`roster.test.ts`
- Create: `frontend/src/components/world/roster-sheet.tsx`
- Modify: `frontend/src/components/world/town-buttons.tsx`
- Modify: `frontend/src/components/world/companion-sheet.tsx`
- Modify: `frontend/src/components/world/world-screen.tsx`

**Interfaces:**
- Consumes: `RosterData`・`RosterMember`・`RosterCondition`・`WorldCompanion.in_town`（Task 5）、`GET /api/world/roster`・`POST /api/world/companions/{key}/town`（Task 3）、`plantImage`（Task 4）、`CompanionImage`、`seedGifts`（Task 6）
- Produces: `remainingText`・`progressPercent`・`statusNote`・`townAction`・`townCountText`（`./roster`）、`RosterSheet`、`TownButtons` の `onRoster`

- [ ] **Step 1: テストを書く**

`frontend/src/components/world/roster.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { progressPercent, remainingText, statusNote, townAction, townCountText } from "./roster";

const condition = (current: number, target: number, unit = "日") => ({ text: "7日続けて学ぶ", current, target, unit });

describe("remainingText", () => {
  it("あと何日・何レベルかを出し、届いたら「もうすぐもらえるよ」", () => {
    expect(remainingText(condition(4, 7))).toBe("あと3日");
    expect(remainingText(condition(8, 10, "レベル"))).toBe("あと2レベル");
    expect(remainingText(condition(7, 7))).toBe("もうすぐもらえるよ");
  });
});

describe("progressPercent", () => {
  it("目標までの割合で、100で止まる", () => {
    expect(progressPercent(condition(4, 7))).toBe(57);
    expect(progressPercent(condition(0, 1))).toBe(0);
    expect(progressPercent(condition(9, 7))).toBe(100);
  });
});

describe("statusNote", () => {
  it("状態ごとの一言。生まれた子と、まだのレアスプルは無し", () => {
    expect(statusNote({ status: "waiting", rare: false })).toBe("畑で生まれるよ");
    expect(statusNote({ status: "in_bag", rare: true })).toBe("種のふくろにあるよ");
    expect(statusNote({ status: "growing", rare: true })).toBe("畑で育っているよ");
    expect(statusNote({ status: "waiting", rare: true })).toBeNull();
    expect(statusNote({ status: "born", rare: true })).toBeNull();
  });
});

describe("townAction", () => {
  it("相棒は切り替えられず、町にいる子は休める。おうちの子は町がいっぱいなら出せない", () => {
    expect(townAction({ in_town: true, is_partner: true }, 5, 5)).toBeNull();
    expect(townAction({ in_town: true, is_partner: false }, 5, 5)).toEqual({ label: "おうちで休む", inTown: false, disabled: false });
    expect(townAction({ in_town: false, is_partner: false }, 4, 5)).toEqual({ label: "町に出す", inTown: true, disabled: false });
    expect(townAction({ in_town: false, is_partner: false }, 5, 5)).toEqual({ label: "町はいっぱい", inTown: true, disabled: true });
  });
});

describe("townCountText", () => {
  it("町にいる数", () => {
    expect(townCountText(3, 5)).toBe("町にいるのは 3/5");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/world/roster.test.ts`
Expected: FAIL（`./roster` が無い）

- [ ] **Step 3: 一覧の文を書く**

`frontend/src/components/world/roster.ts`:

```ts
import type { RosterCondition, RosterMember, WorldCompanion } from "./types";

/** まだのレアスプルの「あと〇〇」(docs/design/2026-09-29-rare-spru-design.md 5-5) */
export function remainingText(condition: RosterCondition): string {
  const left = condition.target - condition.current;
  return left > 0 ? `あと${left}${condition.unit}` : "もうすぐもらえるよ";
}

/** 進み具合の棒の長さ(%) */
export function progressPercent(condition: RosterCondition): number {
  return Math.min(100, Math.round((condition.current / condition.target) * 100));
}

/** カードの状態の一言。生まれた子と、まだのレアスプル(条件を出す)は無し */
export function statusNote(member: Pick<RosterMember, "status" | "rare">): string | null {
  if (member.status === "in_bag") return "種のふくろにあるよ";
  if (member.status === "growing") return "畑で育っているよ";
  if (member.status === "waiting" && !member.rare) return "畑で生まれるよ";
  return null;
}

export type TownAction = { label: string; inTown: boolean; disabled: boolean };

/** 生まれた子の「町に出す／おうちで休む」ボタン。相棒はいつも町にいるので出さない(設計書3-5) */
export function townAction(
  companion: Pick<WorldCompanion, "in_town" | "is_partner">,
  townCount: number,
  limit: number,
): TownAction | null {
  if (companion.is_partner) return null;
  if (companion.in_town) return { label: "おうちで休む", inTown: false, disabled: false };
  const full = townCount >= limit;
  return { label: full ? "町はいっぱい" : "町に出す", inTown: true, disabled: full };
}

export function townCountText(count: number, limit: number): string {
  return `町にいるのは ${count}/${limit}`;
}
```

- [ ] **Step 4: テストを通す**

Run: `cd frontend && npx vitest run src/components/world/roster.test.ts`
Expected: PASS

- [ ] **Step 5: 一覧の画面を書く**

`frontend/src/components/world/roster-sheet.tsx`:

```tsx
"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";
import { plantImage } from "@/components/spru/plant";

import { heartsText } from "./companions";
import { progressPercent, remainingText, statusNote, townAction, townCountText } from "./roster";
import type { RosterData, RosterMember, WorldCompanion } from "./types";

/**
 * なかまの一覧(docs/design/2026-09-29-rare-spru-design.md 5-5)。生まれた子の名前・ハート・町にいるかは
 * 町の仲間(companions)の今の値を使う(相棒や名前をこの画面の上で変えても合うように)
 */
export function RosterSheet({
  roster,
  companions,
  busy,
  onToggleTown,
  onOpen,
  onClose,
}: {
  roster: RosterData;
  companions: WorldCompanion[];
  busy: boolean;
  onToggleTown: (key: string, inTown: boolean) => void;
  onOpen: (key: string) => void;
  onClose: () => void;
}) {
  const townCount = companions.filter((c) => c.in_town).length;
  const sections: [string, RosterMember[]][] = [
    ["仲間", roster.members.filter((m) => !m.rare)],
    ["レアスプル", roster.members.filter((m) => m.rare)],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-title"
        className="relative flex max-h-[90vh] w-full max-w-[480px] flex-col gap-3 overflow-y-auto rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="roster-title" className="text-lg font-black text-[#2e6b1c]">
            <AutoFurigana text="なかま" />
          </h2>
          <p className="text-xs font-black text-[#6b5d45]">
            <AutoFurigana text={townCountText(townCount, roster.town_limit)} />
          </p>
        </div>
        {sections.map(([title, members]) => (
          <section key={title} className="flex flex-col gap-2">
            <h3 className="text-sm font-black text-[#6b5d45]">
              <AutoFurigana text={title} />
            </h3>
            <ul className="grid grid-cols-3 gap-2">
              {members.map((member) => {
                const companion = companions.find((c) => c.key === member.key) ?? null;
                return (
                  <li key={member.key}>
                    {companion ? (
                      <BornCard
                        companion={companion}
                        action={townAction(companion, townCount, roster.town_limit)}
                        busy={busy}
                        onToggleTown={onToggleTown}
                        onOpen={onOpen}
                      />
                    ) : (
                      <WaitingCard member={member} />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}

const CARD = "flex h-full flex-col items-center gap-1 rounded-2xl bg-[#f5efe1] px-1.5 pt-2 pb-2 text-center";

function BornCard({
  companion,
  action,
  busy,
  onToggleTown,
  onOpen,
}: {
  companion: WorldCompanion;
  action: ReturnType<typeof townAction>;
  busy: boolean;
  onToggleTown: (key: string, inTown: boolean) => void;
  onOpen: (key: string) => void;
}) {
  return (
    <div className={CARD}>
      <button type="button" onClick={() => onOpen(companion.key)} className="flex w-full flex-col items-center gap-0.5">
        <span className="flex h-[72px] items-end">
          <CompanionImage companionKey={companion.key} standHeight={96} />
        </span>
        <span className="w-full truncate text-xs font-black">{companion.name}</span>
        <span className="text-[11px] font-black text-[#d0467a]" aria-label={`ハート${companion.hearts}つ`}>
          {heartsText(companion.hearts)}
        </span>
      </button>
      <span
        className={`rounded-full px-2 text-[10px] font-black ${companion.in_town ? "bg-[#3b7f26] text-white" : "bg-[#e3d8c0] text-[#6b5d45]"}`}
      >
        <AutoFurigana text={companion.is_partner ? "相棒" : companion.in_town ? "町にいる" : "おうち"} />
      </span>
      {action && (
        <button
          type="button"
          disabled={busy || action.disabled}
          onClick={() => onToggleTown(companion.key, action.inTown)}
          className="mt-auto h-8 w-full rounded-xl bg-[#efe5cf] text-[11px] font-black disabled:opacity-50"
        >
          <AutoFurigana text={action.label} />
        </button>
      )}
    </div>
  );
}

function WaitingCard({ member }: { member: RosterMember }) {
  const note = statusNote(member);
  const seed = member.status === "in_bag" ? plantImage(member.key, "seed") : member.status === "growing" ? plantImage(member.key, "sprout") : null;
  return (
    <div className={CARD}>
      <span className="flex h-[72px] items-end">
        {seed ? (
          <Image src={seed.src} alt="" width={Math.round((seed.width * 48) / seed.height)} height={48} aria-hidden />
        ) : (
          <CompanionImage companionKey={member.key} standHeight={96} className="opacity-35 brightness-0" />
        )}
      </span>
      <span className="w-full truncate text-xs font-black">{member.name}</span>
      {note && (
        <span className="text-[10px] font-bold text-[#6b5d45]">
          <AutoFurigana text={note} />
        </span>
      )}
      {member.condition && member.status === "waiting" && (
        <>
          <span className="text-[10px] leading-tight font-bold text-[#6b5d45]">
            <AutoFurigana text={member.condition.text} />
          </span>
          <span className="mt-auto h-1.5 w-full overflow-hidden rounded-full bg-[#e3d8c0]" aria-hidden>
            <span className="block h-full rounded-full bg-[#f2b632]" style={{ width: `${progressPercent(member.condition)}%` }} />
          </span>
          <span className="text-[10px] font-black text-[#8a6a1c]">
            <AutoFurigana text={remainingText(member.condition)} />
          </span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 町のボタン・仲間のカードを直す**

`frontend/src/components/world/town-buttons.tsx`:
- `import { Backpack } from "lucide-react";` を `import { Backpack, Sprout } from "lucide-react";` にする
- 引数に `onRoster` を足す（型は `onRoster: () => void;`、`onLiveliness` の後）
- にぎやか度のボタンの後ろに足す:

```tsx
      <button type="button" onClick={onRoster} className={PILL} aria-label="なかまの一覧">
        <Sprout className="h-3.5 w-3.5 text-[#3b7f26]" aria-hidden />
        <span>
          <AutoFurigana text="なかま" />
        </span>
      </button>
```

`frontend/src/components/world/companion-sheet.tsx` の `{!companion.is_partner && (` のボタンを置き換える:

```tsx
            {!companion.is_partner &&
              (companion.in_town ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={onMakePartner}
                  className="h-12 rounded-2xl bg-[#3b7f26] text-base font-black text-white disabled:opacity-60"
                >
                  <AutoFurigana text="相棒にする" />
                </button>
              ) : (
                <p className="rounded-2xl bg-[#f5efe1] px-3 py-3 text-center text-sm font-bold text-[#6b5d45]">
                  <AutoFurigana text="町に出すと相棒にできるよ" />
                </p>
              ))}
```

- [ ] **Step 7: 町の画面につなぐ**

`frontend/src/components/world/world-screen.tsx`:
- `import { SeedGift } from "./seed-gift";` の下に `import { RosterSheet } from "./roster-sheet";` を足し（import の並びはアルファベット順に直してよい）、型の import に `RosterData,` を足す
- `const [seedGifts, setSeedGifts] = useState<NewSeed[]>([]);` の下に足す:

```tsx
  // なかまの一覧(開いたときに読む)と、町に出す・休ませるの通信中
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [townBusy, setTownBusy] = useState(false);
```

- `async function makePartner(key: string) {` の上に足す:

```tsx
  // なかまの一覧を開く。一覧を開いたときにもらった種があれば、お祝いを出し、畑のふくろを読み直す
  async function openRoster() {
    const res = await apiFetch("/api/world/roster").catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setMessage(data.message ?? "通信エラーが発生しました。");
      return;
    }
    const next: RosterData = data;
    setRoster(next);
    if (next.new_seeds.length > 0) {
      setSeedGifts(next.new_seeds);
      const worldRes = await apiFetch("/api/world").catch(() => null);
      if (worldRes && worldRes.ok) {
        const fresh: WorldData = await worldRes.json();
        setWorld((prev) => (prev ? { ...prev, garden: fresh.garden } : prev));
      }
    }
  }

  // 町に出す・おうちで休む(設計書3-5)
  async function setTown(key: string, inTown: boolean) {
    if (townBusy) return;
    setTownBusy(true);
    try {
      const res = await apiFetch(`/api/world/companions/${key}/town`, {
        method: "POST",
        body: JSON.stringify({ in_town: inTown }),
      }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      applyCompanions(data);
      setMessage(null);
      play("correct");
    } finally {
      setTownBusy(false);
    }
  }
```

- `<TownButtons` に `onRoster={openRoster}` を足す（`onLiveliness` の下）
- `{sheetCompanion && (` の上に足す（仲間のカードが一覧の上に出るよう、一覧を先に置く）:

```tsx
      {roster && (
        <RosterSheet
          roster={roster}
          companions={world.companions}
          busy={townBusy}
          onToggleTown={setTown}
          onOpen={setSheetKey}
          onClose={() => setRoster(null)}
        />
      )}
```

- 種をもらったお祝いの条件 `calm && greetings.length === 0 && !season && !born && seedGifts.length > 0` はそのまま（一覧を開いている間ももらったら出る。`z-[60]` なので一覧の上に出る）

- [ ] **Step 8: テストと型と lint を通す**

Run: `cd frontend && npm run typecheck && npm run lint && npm test 2>&1 | tail -4`
Expected: 全部 PASS、型・lint のエラー0

- [ ] **Step 9: コミット**

```bash
git add frontend/src/components/world
git commit -m "#00290: feat:町のボタンに「なかま」を足し、なかまの一覧(町に出す・おうちで休む・まだのレアスプルの条件と進み具合)を作る" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: ブラウザで確かめる・文書（#00291）

**Files:**
- Modify: `SPEC.md`（4-9 ワールドの B回の行の後ろ）
- Modify: `TASKS.md`（「特別な仲間（金色など）・記念の仲間・天井」の行）
- Modify: `company/spra/mascot/CLAUDE.md`（追記のみ）

- [ ] **Step 1: 開発用のデータの今の状態を控える**

町テスト（プロフィール id 7）の値と、仲間・畑の種・特別な種・台帳の最大 id を scratchpad に控える:

```bash
./vendor/bin/sail artisan tinker --execute='
$p = App\Models\UserProfile::find(7);
echo json_encode([
  "profile" => $p->only(["xp","coins","hp","points","level","bloom_base_level","best_streak","current_streak","last_played_date","last_correct_on","partner_companion_key","reviews_completed","combo","best_combo"]),
  "companions" => $p->companions()->get(["id","companion_key","nickname","bond","in_town"]),
  "seeds" => DB::table("profile_seeds")->where("user_profile_id", 7)->get(),
  "special" => $p->specialSeeds()->get(),
  "ledger_max" => App\Models\ProfileCurrencyLedger::max("id"),
], JSON_UNESCAPED_UNICODE);' > "$SCRATCHPAD/rare-baseline.json"
```

（`$SCRATCHPAD` は会話の scratchpad のパス）

- [ ] **Step 2: ブラウザで確かめる（スマホの幅 390×844）**

`test@example.com` / `password` で入り、町テストを選ぶ。tinker で状態を作りながら、次を順に見る（画面の写真は `.playwright-mcp/` にだけ置き、見たら消す）:

1. レベルを10にする → 町を開くと「特別な種をもらった！」に「シルバーの種」「レベル10になったね」
2. 畑をタップ → 「どの種をまく？」に「シルバーの種」。選ぶと銀色の種が植わり、スプルが「シルバーの種をまいたよ！…」
3. 水やりを3日分（tinker で `last_watered_on` を前の日にし、`last_correct_on` を今日にする）→ 銀の芽 → 銀のつぼみ → 銀の花が咲いてからシルバースプルが出る
4. 仲間の種（スプルの種）は緑の種・芽・つぼみで育ち、生まれるまで誰か分からない
5. 町に5体いるときに生まれた子は「おうちで休んでいるよ…」。なかまの一覧で「町に出す」が押せず（町はいっぱい）、ほかの子を「おうちで休む」にすると出せる
6. 一覧のまだのレアスプルが黒い影で、条件・棒・「あと〇〇」が読める。3列で文字がはみ出さない
7. おうちの子の仲間のカードでは「町に出すと相棒にできるよ」
8. 動きを減らす設定（`browser_emulate_media` の reduced motion）で、生まれたときに花を飛ばして本人がすぐ出る
9. 家族の町（家族がいれば）で、おうちの子が立たない

- [ ] **Step 3: 開発用のデータを元に戻す**

Step 1 で控えた値に戻し、確かめるために作った仲間・畑の種・特別な種・台帳の行を消す。もう一度読んで、控えた値と同じことを確かめる

- [ ] **Step 4: 文書を書く**

`SPEC.md` の 4-9 の B回の行（`- ✅（2026-09-27、B回）スプルの成長サイクル: …`）の後ろに足す:

```markdown
- ✅（2026-09-29）**レアスプルと特別な種**: がんばった記念に「特別な種」をもらい（確率なし・1色1回）、畑にまくとその色の種・芽・つぼみで育って、3回の水やりでレアスプルが生まれる。10色と条件（試験用の数字、`config/companions.php` で変えられる）: ルビー＝7日続ける・サファイア＝外国に着く・シルバー＝レベル10・アンバー＝今日の復習を10回やりきる・オブシディアン＝上級のステージを3つクリア・クリスタル＝スプルキャッチで全問正解・パール＝30日続ける・エメラルド＝仲間5人がそろう・ゴールド＝レベル20・プラチナ＝レベル30。生まれたレアスプルは仲間と同じ（なかよし度・相棒・名前）。町に立つのは5体までで、相棒はいつも町にいる（相棒にできるのは町にいる子だけ）。町のボタン「なかま」の一覧で、町に出す／おうちで休むを選び、まだのレアスプルの条件と進み具合を見られる。仲間の種は緑のまま育ち、生まれるまで誰か分からない。仲間5人の絵は新しい設定画に差し替えた（`app/Support/RareSeeds.php`・`app/Support/Roster.php`、`GET /api/world/roster`・`POST /api/world/companions/{key}/town`、`docs/design/2026-09-29-rare-spru-design.md`）
```

`TASKS.md` の `- [ ] 特別な仲間（金色など）・記念の仲間・天井（…）` の行と、その下の `  - 2026-09-29: Ownerがレアスプル10色…` の行を置き換える:

```markdown
- [x] **レアスプルと特別な種**（2026-09-29。がんばった記念に種をもらい、畑でその色に育つ。町に立つのは5体まで・なかまの一覧。設計書 `docs/design/2026-09-29-rare-spru-design.md`、実装計画 `docs/design/2026-09-29-rare-spru-plan.md`。確率で出す仲間・天井は作らない）
- [ ] レアスプルの条件の数字の見直し（試験で触ってから。数字は `config/companions.php` の `condition`。公開後はゆるめる方向だけにする）
- [ ] リリ（幻、リシリヒナゲシ）の出し方（`company/spra/mascot/assets/spru/riri.png`。レアスプルより希少な位置づけ）
```

`company/spra/mascot/CLAUDE.md` の最後に追記:

```markdown
  - 2026-09-29追記（レアスプルと仲間の絵の使い道）: Spra-go で、`assets/spru/` の各シートの左上の大きい正面の絵を、仲間5人（差し替え）とレアスプル10色の町・一覧・お祝いの絵にした（`public/spru/companions/`）。下の段の成長の絵から「種・いちばん大きい芽・つぼみ・花」の4枚を、畑で育つ絵にした（`public/spru/growth/{色}/`。ふつうのスプルは `spru.png` から。仲間の種は、ふつうのスプルの緑の絵で育つ）。前の mascot-6 の畑の種・芽は使わなくなった。riri はまだ使っていない
```

- [ ] **Step 5: 全部のテストを流す**

Run: `./vendor/bin/sail test 2>&1 | tail -5 && cd frontend && npm test 2>&1 | tail -4 && npm run typecheck && npm run lint`
Expected: サーバー・画面とも全部 PASS、型・lint のエラー0

- [ ] **Step 6: コミット**

```bash
git add SPEC.md TASKS.md
git commit -m "#00291: docs:SPEC・TASKSにレアスプルと特別な種を書く(条件の数字の見直しとリリを未着手で足す)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

（`company/spra/mascot/CLAUDE.md` はリポジトリの外なのでコミットしない）

---

## 最後の見直しとマージ

- サブエージェントを使わない決まりなので、最後の見直しは自分で行う（Owner にそう伝える）
- 見直しで見つけた大事な点は、テストを先に書いて直す。小さな点は「あとで」の一覧に入れて Owner に伝える
- Owner の確認を取ってから、`git merge --no-ff -q -m "#00292: merge:…" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"` で main にマージする
