# スプルの成長サイクル・水やり・仲間の誕生（B回）— 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**ゴール:** レベルアップでスプルがつぼみ→花→種と育ち、町の畑に種をまいて毎日水をあげると仲間が生まれる流れと、だんだん上がりにくいレベルの上がり方を作る。

**アーキテクチャ:** サーバー（Laravel）が記録を持つ。育ち具合は保存せず「今のレベル − 前に種をまいたときのレベル」から計算する（`app/Support/Garden.php`）。レベルの上がり方は `app/Support/LevelCurve.php` にまとめる。画面側は、畑をタップしたときの動き・案内のひとこと・バーの表示を純粋な関数（`garden.ts`・`bloom.ts`・`mood.ts`）にしてVitestで確かめ、町とクイズはその結果を描くだけにする。

**技術スタック:** Laravel 13（Sail）/ Pest / MySQL、Next.js 16.2.10 / React 19 / TypeScript / Tailwind CSS / Vitest、Python 3 + Pillow（切り抜きスクリプト）

**設計書:** `docs/design/2026-09-27-spru-wave-b-design.md`（必ず併せて読むこと）

## 全体の制約

- 既存のバックエンドテスト（134件）とフロントのテスト（42件）はすべて通ること
- DBの更新は `./vendor/bin/sail artisan migrate`（壊さない更新）だけを使う。`migrate:fresh` は使わない
- 生まれるもの（`profile_seeds.result_key`）は、生まれるまで画面側へ送らない（町のAPI・種まきのAPIの応答に含めない）
- コインで種を買う・育つのを早める・生まれる仲間を選び直す機能は作らない
- スプル・畑・仲間のひとことは設計書3章の文言どおり
- 素材集は `/Users/katsuhiro.k1215/SmartSprouts/company/mascot/assets/`（リポジトリの外）。`frontend/src/components/spru/spru-assets.ts` は `tools/spru-assets/extract.py` が生成する。手で直さない
- 画面に確認用の隠し機能を作らない。時刻はテスト用ブラウザの時計（Playwrightの `page.clock`）、日付や育ち具合は開発DBを `tinker` で調整して確かめ、確認後に元へ戻す
- ESLint（`react-hooks`）の規則: 描画中にrefの `.current` を読まない、effectの中で直接setStateしない（setInterval・setTimeout・非同期のコールバックの中はよい）
- 新しいUIのアイコンに絵文字を使わない。ドキュメント・コメントは日本語、コメントは「なぜ」が必要なときだけ1行
- コミットは `#NNNNN: type:summary`（`git log --oneline -1` の番号+1）＋末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 作業ブランチは `feature/spru-wave-b`（作成済み）
- 開発サーバーはポート3000（すでに動いていれば新しく起動しない）。テスト用ログイン: `test@example.com` / `password`、プロフィール「町テスト」

## レビューで特に見る点

1. **仲間が生まれる流れ**: 3回目の水やりで、スプルが水をあげる動きのあとに（約1.6秒後）お祝いが出て、「町にむかえる」を押すと仲間が道に現れ、ひとことを言うこと（Task 6のブラウザ確認）
2. **置く場所を選んでいる間**: 畑・仲間・スプルが押せず、畑も光らないこと（Task 6のブラウザ確認）
3. **畑をすばやく2回タップ**: 水やりが1回だけになること（画面の処理中の印＋サーバーの `lockForUpdate`。Task 6のブラウザ確認）
4. **夜22時以降**: スプルが寝ていても畑の水やりができ、その間だけスプルが水やりの絵になり、仲間はゆれないこと（Task 6のブラウザ確認）
5. **最後の問題で3回目のレベルアップ**: お祝いに「種ができた！町でまいてみよう」と花の付いたスプルが出て、町に戻るとスプルに花が咲き、畑が光ること（Task 7のブラウザ確認）

## ファイル構成

**サーバー（リポジトリ直下）**
- 作成: `app/Support/LevelCurve.php` — レベルの上がり方
- 作成: `app/Support/Garden.php` — 育ち具合・畑・仲間・種まき・水やり
- 作成: `app/Models/ProfileSeed.php`・`app/Models/ProfileCompanion.php`
- 作成: `config/companions.php` — 仲間の一覧と、育ち・水やりの回数
- 作成: `database/migrations/2026_09_27_000001〜000005_*.php`
- 変更: `app/Models/UserProfile.php`、`config/world.php`、`routes/api.php`、`database/seeders/WorldItemSeeder.php`（コメント）
- テスト: `tests/Feature/LevelCurveTest.php`・`GardenStateTest.php`・`GardenActionsTest.php`

**素材**
- 変更: `tools/spru-assets/extract.py`・`crops.json`
- 作成（生成）: `frontend/public/spru/actions/{water,sow-shake,sow-fly}.webp`、`bloom/`・`garden/`・`companions/`、`frontend/src/components/spru/spru-assets.ts`（生成し直し）

**フロントエンド（`frontend/src/`）**
- 作成: `components/spru/bloom.ts`・`bloom.test.ts` — つぼみ・花の付け方
- 作成: `components/world/garden.ts`・`garden.test.ts` — 畑のタップ・案内・バー・お祝いのひとこと
- 作成: `components/world/garden-art.tsx`・`born-overlay.tsx`
- 変更: `components/spru/mood.ts`・`mood.test.ts`・`hint.ts`・`hint.test.ts`・`spru-figure.tsx`
- 変更: `components/world/types.ts`・`world-scene.tsx`・`world-screen.tsx`・`world-hud.tsx`・`item-art.tsx`
- 変更: `components/quiz/level-up-overlay.tsx`、`app/quiz/[stageId]/page.tsx`、`app/owner/dashboard/shop-items/page.tsx`

**ドキュメント**
- 変更: `SPEC.md`・`TASKS.md`・`/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md`

---

### Task 1: レベルの上がり方と、難しさごとのXP

**Files:**
- Create: `app/Support/LevelCurve.php`
- Modify: `config/world.php`、`app/Models/UserProfile.php`（`applyEconomy`）、`routes/api.php`（回答API・町のAPI）、`database/seeders/WorldItemSeeder.php`（コメント）
- Test: `tests/Feature/LevelCurveTest.php`

**Interfaces:**
- Produces: `LevelCurve::xpToNext(int $level): int`、`LevelCurve::totalXpFor(int $level): int`、`LevelCurve::levelForXp(int $xp): int`、`LevelCurve::progress(int $level): array{floor:int,next:int}`。町のAPIの `profile.level_xp` と回答APIの `profile.level_xp`（`{ floor, next }`）。設定 `world.rewards.xp_by_difficulty`・`world.level_curve`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/LevelCurveTest.php`:

```php
<?php

use App\Support\LevelCurve;

/*
|--------------------------------------------------------------------------
| レベルの上がり方(docs/design/2026-09-27-spru-wave-b-design.md 3-6)
|--------------------------------------------------------------------------
|
| 次のレベルまでのXPは100から+20ずつ、上限300。正解のXPは難しさで変わる。
| 上がり方を変える前に上がったレベルは下げない。
|
*/

it('各レベルに届くまでの合計XPが設計書の表どおり', function () {
    $totals = collect(range(1, 13))->mapWithKeys(fn (int $level) => [$level => LevelCurve::totalXpFor($level)])->all();

    expect($totals)->toBe([
        1 => 0, 2 => 100, 3 => 220, 4 => 360, 5 => 520, 6 => 700, 7 => 900,
        8 => 1120, 9 => 1360, 10 => 1620, 11 => 1900, 12 => 2200, 13 => 2500,
    ]);
});

it('合計XPからレベルを求める(境目ちょうどで上がる)', function () {
    expect(LevelCurve::levelForXp(0))->toBe(1)
        ->and(LevelCurve::levelForXp(99))->toBe(1)
        ->and(LevelCurve::levelForXp(100))->toBe(2)
        ->and(LevelCurve::levelForXp(219))->toBe(2)
        ->and(LevelCurve::levelForXp(220))->toBe(3)
        ->and(LevelCurve::levelForXp(2500))->toBe(13);
});

it('正解のXPは初級10・中級15・上級20', function (string $difficulty, int $xp) {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    $question->quiz->update(['difficulty' => $difficulty]);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.delta.xp', $xp);

    expect($profile->fresh()->xp)->toBe($xp);
})->with([['初級', 10], ['中級', 15], ['上級', 20]]);

it('学習ポイントは難しさにかかわらず10', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();
    $question->quiz->update(['difficulty' => '上級']);

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();

    expect($profile->fresh()->points)->toBe(10);
});

it('新しい上がり方の境目でレベルが上がる', function () {
    $profile = createActiveProfile();
    $profile->update(['xp' => 215, 'level' => 2]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.level', 3)
        ->assertJsonPath('profile.leveled_up', true)
        ->assertJsonPath('profile.level_xp', ['floor' => 220, 'next' => 360]);
});

it('前の計算で上がっていたレベルは下がらない', function () {
    $profile = createActiveProfile();
    // 前の計算(XP100ごと)ではLv.5、新しい計算ではLv.4になるXP
    $profile->update(['xp' => 400, 'level' => 5]);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.level', 5)
        ->assertJsonPath('profile.leveled_up', false);
});

it('町の情報に今のレベルの合計XPと次のレベルの合計XPが含まれる', function () {
    $profile = createActiveProfile();
    $profile->update(['xp' => 150, 'level' => 2]);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('profile.level_xp', ['floor' => 100, 'next' => 220]);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./vendor/bin/sail artisan test --filter=LevelCurveTest`
Expected: FAIL（`App\Support\LevelCurve` が見つからない）

- [ ] **Step 3: 設定を足す**

`config/world.php` の `'rewards' => [ ... ],` を次にする:

```php
    'rewards' => [
        'answer_correct' => 10,
        'stage_clear' => 50,
        'welcome' => 100,
        // 正解のXP。難しい問題ほど多い(学習ポイントは難しさにかかわらず answer_correct)
        'xp_by_difficulty' => ['初級' => 10, '中級' => 15, '上級' => 20],
    ],

    /*
    | レベルの上がり方: 次のレベルまでに必要なXP = min(base + step × (今のレベル − 1), max)。
    | 最初は上がりやすく、続けるほど上がりにくい(docs/design/2026-09-27-spru-wave-b-design.md 3-6)。
    */

    'level_curve' => ['base' => 100, 'step' => 20, 'max' => 300],
```

- [ ] **Step 4: レベルの計算を作る**

`app/Support/LevelCurve.php`:

```php
<?php

namespace App\Support;

/**
 * レベルの上がり方(docs/design/2026-09-27-spru-wave-b-design.md 3-6)。
 * 上限を付けて、上がらなさすぎてやめてしまわないようにする。
 */
class LevelCurve
{
    /** 今のレベルから次のレベルまでに必要なXP */
    public static function xpToNext(int $level): int
    {
        $curve = config('world.level_curve');

        return min($curve['base'] + $curve['step'] * ($level - 1), $curve['max']);
    }

    /** そのレベルに届くまでの合計XP(Lv.1は0) */
    public static function totalXpFor(int $level): int
    {
        $total = 0;
        for ($l = 1; $l < $level; $l++) {
            $total += self::xpToNext($l);
        }

        return $total;
    }

    public static function levelForXp(int $xp): int
    {
        $level = 1;
        $reached = 0;
        while ($xp >= $reached + self::xpToNext($level)) {
            $reached += self::xpToNext($level);
            $level++;
        }

        return $level;
    }

    /** @return array{floor: int, next: int} 町の上のバーに使う(今のレベルに届いた合計XPと、次のレベルの合計XP) */
    public static function progress(int $level): array
    {
        return ['floor' => self::totalXpFor($level), 'next' => self::totalXpFor($level + 1)];
    }
}
```

`app/Models/UserProfile.php`:
- `use Illuminate\Support\Carbon;` の次に `use App\Support\LevelCurve;` を足す（use文はアルファベット順に並べ直す: `App\Support\LevelCurve` を `Illuminate\...` より前）
- `applyEconomy` の中の次の2行

```php
        if (isset($deltas['xp'])) {
            $newLevel = intdiv($this->xp, 100) + 1;
```

を次にする（その後の `if ($newLevel > $this->level)` はそのまま。新しい計算のレベルが今より低い間は上がらないので、レベルは下がらない）:

```php
        if (isset($deltas['xp'])) {
            $newLevel = LevelCurve::levelForXp($this->xp);
```

- [ ] **Step 5: 回答APIと町のAPIを変える**

`routes/api.php`:
- `use App\Support\ContinueStage;` の次に `use App\Support\LevelCurve;` を足す
- 回答API（`/questions/{question}/answer`）の `'xp' => 10,` を次にする:

```php
                'xp' => config('world.rewards.xp_by_difficulty')[$question->quiz?->difficulty] ?? 10,
```

- 同じAPIの `$economy = [ ... ];` の中、`'streak_milestone_bonus_coin' => $streak['milestone_bonus_coin'],` の次に:

```php
            'level_xp' => LevelCurve::progress($profile->level),
```

- 町のAPI（`Route::get('/', ...)`、`->name('show')`）の `'profile' => [ ... ]` の中、`'coins' => $profile->coins,` の次に:

```php
                'level_xp' => LevelCurve::progress($profile->level),
```

`database/seeders/WorldItemSeeder.php` のクラスのコメント `* 町に置くアイテムの初期の品ぞろえ。レベルは10問正解で1上がるため、` を `* 町に置くアイテムの初期の品ぞろえ。レベルは最初10問正解で1上がり、だんだん上がりにくくなる(config/world.php の level_curve)ため、` にする。

- [ ] **Step 6: テストが通ることを確認する**

Run: `./vendor/bin/sail artisan test --filter=LevelCurveTest && ./vendor/bin/sail artisan test`
Expected: LevelCurveTest 9件PASS、全体 143件PASS（既存のレベルアップのテストはXP95→105でLv.2のため、そのまま通る）

- [ ] **Step 7: コミット**

```bash
git add app/Support/LevelCurve.php app/Models/UserProfile.php config/world.php routes/api.php database/seeders/WorldItemSeeder.php tests/Feature/LevelCurveTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:レベルをだんだん上がりにくくし(上限300)、正解のXPを難しさで変える

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 畑と仲間のデータ、町のAPI

**Files:**
- Create: `database/migrations/2026_09_27_000001_add_garden_columns_to_user_profiles_table.php`、`2026_09_27_000002_start_bloom_from_current_level.php`、`2026_09_27_000003_create_profile_seeds_table.php`、`2026_09_27_000004_create_profile_companions_table.php`、`2026_09_27_000005_move_world_items_off_garden_tile.php`
- Create: `app/Models/ProfileSeed.php`、`app/Models/ProfileCompanion.php`、`config/companions.php`、`app/Support/Garden.php`
- Modify: `app/Models/UserProfile.php`、`config/world.php`、`routes/api.php`
- Test: `tests/Feature/GardenStateTest.php`

**Interfaces:**
- Consumes: Task 1 の `LevelCurve`（直接は使わない）
- Produces: `Garden::TIMEZONE`、`Garden::today(): string`、`Garden::position(): array{x:int,y:int}`、`Garden::growth(UserProfile): int`、`Garden::activeSeed(UserProfile): ?ProfileSeed`、`Garden::learnedToday(UserProfile): bool`、`Garden::state(UserProfile): array`、`Garden::companions(UserProfile): array`、`Garden::companionArray(string $key, ?array $spot): array`（private）。`UserProfile::seeds()`・`companions()`。町のAPIの `spru`・`garden`・`companions`、回答APIの `profile.spru_growth`・`profile.garden_busy`

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/GardenStateTest.php`:

```php
<?php

use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| スプルの育ち具合と、畑・仲間の状態(docs/design/2026-09-27-spru-wave-b-design.md 3〜4章)
|--------------------------------------------------------------------------
*/

it('育ち具合はレベルアップの回数で決まり、3で止まる', function (int $level, int $growth) {
    $profile = createActiveProfile();
    $profile->update(['level' => $level, 'bloom_base_level' => 4]);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('spru.growth', $growth);
})->with([[4, 0], [5, 1], [6, 2], [7, 3], [9, 3]]);

it('新しいプロフィールは育ち具合0から始まる', function () {
    createActiveProfile();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('spru.growth', 0);
});

it('畑はスプルの家の前のマスにあり、アイテムを置けないマスになる', function () {
    createActiveProfile();

    $response = $this->getJson('/api/world')->assertOk();

    expect($response->json('land.blocked'))->toContain([1, 2]);
    $response->assertJsonPath('garden.x', 1)
        ->assertJsonPath('garden.y', 2)
        ->assertJsonPath('garden.state', 'empty');
});

it('種ができていて畑が空いていれば、種をまける状態になる', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);

    $this->getJson('/api/world')
        ->assertJsonPath('garden.can_sow', true)
        ->assertJsonPath('garden.can_water', false);
});

it('畑の見た目は水やりの回数で変わる', function (int $waterings, string $state) {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => $waterings]);

    $this->getJson('/api/world')
        ->assertJsonPath('garden.state', $state)
        ->assertJsonPath('garden.waterings', $waterings);
})->with([[0, 'seed'], [1, 'sprout'], [2, 'sprout_big']]);

it('誰が生まれるかは町の情報に出さない', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);

    $response = $this->getJson('/api/world')->assertOk();

    expect($response->getContent())->not->toContain('momo');
});

it('今日正解していて、今日まだ水をあげていなければ水をあげられる', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();

    $this->getJson('/api/world')
        ->assertJsonPath('garden.learned_today', true)
        ->assertJsonPath('garden.watered_today', false)
        ->assertJsonPath('garden.can_water', true);
});

it('不正解だけの日は水をあげられない', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);
    [$question, , $wrong] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $wrong->id])->assertOk();

    $this->getJson('/api/world')
        ->assertJsonPath('garden.learned_today', false)
        ->assertJsonPath('garden.can_water', false);
});

it('「今日」は日本時間の0時で切り替わる', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->travelTo(Carbon::parse('2026-09-27 14:59:00', 'UTC')); // 日本時間 23:59
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();
    $this->getJson('/api/world')->assertJsonPath('garden.learned_today', true);

    $this->travelTo(Carbon::parse('2026-09-27 15:00:00', 'UTC')); // 日本時間 翌日の0:00
    $this->getJson('/api/world')->assertJsonPath('garden.learned_today', false);
});

it('生まれた仲間は、生まれた順に道の立ち位置つきで出る', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'ruru']);
    $profile->companions()->create(['companion_key' => 'lumi']);

    $this->getJson('/api/world')
        ->assertJsonCount(2, 'companions')
        ->assertJsonPath('companions.0', [
            'key' => 'ruru', 'name' => 'Ruru', 'trait' => '水・知恵', 'line' => 'じっくり考えるのが好き', 'x' => 0, 'y' => 3,
        ])
        ->assertJsonPath('companions.1.key', 'lumi')
        ->assertJsonPath('companions.1.x', 2)
        ->assertJsonPath('companions.1.y', 3);
});

it('立ち位置が足りない仲間は、位置なしで出る', function () {
    config(['world.companion_spots' => [[0, 3]]]);
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'ruru']);
    $profile->companions()->create(['companion_key' => 'lumi']);

    $this->getJson('/api/world')
        ->assertJsonPath('companions.1.x', null)
        ->assertJsonPath('companions.1.y', null);
});

it('回答すると、育ち具合と畑に種があるかが返る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3, 'bloom_base_level' => 1]);
    $profile->seeds()->create(['result_key' => 'momo']);
    [$question, $correct] = createQuestionWithChoices();

    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])
        ->assertOk()
        ->assertJsonPath('profile.spru_growth', 2)
        ->assertJsonPath('profile.garden_busy', true);
});

it('更新のとき、畑のマスに置いてあったアイテムはバッグに戻る', function () {
    $profile = createActiveProfile();
    $item = createDecoration();
    $onGarden = $profile->worldItems()->create(['shop_item_id' => $item->id, 'x' => 1, 'y' => 2]);
    $elsewhere = $profile->worldItems()->create(['shop_item_id' => $item->id, 'x' => 5, 'y' => 5]);

    (require database_path('migrations/2026_09_27_000005_move_world_items_off_garden_tile.php'))->up();

    expect($onGarden->fresh()->x)->toBeNull()
        ->and($onGarden->fresh()->y)->toBeNull()
        ->and($elsewhere->fresh()->x)->toBe(5);
});

it('更新のとき、今あるプロフィールは今のレベルから育ち始める', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 6, 'bloom_base_level' => 1]);

    (require database_path('migrations/2026_09_27_000002_start_bloom_from_current_level.php'))->up();

    expect($profile->fresh()->bloom_base_level)->toBe(6);
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./vendor/bin/sail artisan test --filter=GardenStateTest`
Expected: FAIL（`bloom_base_level` の列が無い、`seeds()` が無い など）

- [ ] **Step 3: テーブルを作る**

`database/migrations/2026_09_27_000001_add_garden_columns_to_user_profiles_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // 前に種をまいたときのレベル。育ち具合 = level − bloom_base_level(上限3)
            $table->unsignedInteger('bloom_base_level')->default(1)->after('level');
            // 最後に正解した日(日本時間)。その日に水やりできるかに使う
            $table->date('last_correct_on')->nullable()->after('last_played_date');
        });
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn(['bloom_base_level', 'last_correct_on']);
        });
    }
};
```

`database/migrations/2026_09_27_000002_start_bloom_from_current_level.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 今あるプロフィールは「ふつう」(育ち具合0)から育ち始める
        DB::table('user_profiles')->update(['bloom_base_level' => DB::raw('level')]);
    }

    public function down(): void
    {
        //
    }
};
```

`database/migrations/2026_09_27_000003_create_profile_seeds_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_seeds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            // 生まれるもの(仲間のキーか spru_flower)。種をまいたときに決め、生まれるまで画面に出さない
            $table->string('result_key', 32);
            $table->unsignedTinyInteger('waterings')->default(0);
            $table->date('last_watered_on')->nullable();
            // null の間は畑で育っている(1人1つまで。処理側で保証する)
            $table->timestamp('bloomed_at')->nullable();
            $table->timestamps();

            $table->index(['user_profile_id', 'bloomed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_seeds');
    }
};
```

`database/migrations/2026_09_27_000004_create_profile_companions_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_companions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->string('companion_key', 32);
            $table->timestamps();

            $table->unique(['user_profile_id', 'companion_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_companions');
    }
};
```

`database/migrations/2026_09_27_000005_move_world_items_off_garden_tile.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 畑(config/world.php の landmarks の garden)になるマスに置いてあったアイテムはバッグに戻す
        DB::table('profile_world_items')
            ->where('x', 1)
            ->where('y', 2)
            ->update(['x' => null, 'y' => null, 'updated_at' => now()]);
    }

    public function down(): void
    {
        //
    }
};
```

- [ ] **Step 4: モデルと設定を作る**

`app/Models/ProfileSeed.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileSeed extends Model
{
    protected $fillable = ['result_key', 'waterings', 'last_watered_on', 'bloomed_at'];

    // 誰が生まれるかを、うっかり画面に送らないようにする
    protected $hidden = ['result_key'];

    protected function casts(): array
    {
        return [
            'waterings' => 'integer',
            'last_watered_on' => 'date',
            'bloomed_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
```

`app/Models/ProfileCompanion.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileCompanion extends Model
{
    protected $fillable = ['companion_key'];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
```

`app/Models/UserProfile.php`:
- `$fillable` の配列の最後（`'last_played_date',` の次）に `'bloom_base_level', 'last_correct_on',` を足す
- `casts()` の配列に `'bloom_base_level' => 'integer',` と `'last_correct_on' => 'date',` を足す
- `worldItems()` の定義の次に:

```php
    public function seeds(): HasMany
    {
        return $this->hasMany(ProfileSeed::class);
    }

    public function companions(): HasMany
    {
        return $this->hasMany(ProfileCompanion::class);
    }
```

`config/companions.php`:

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 仲間の一覧(docs/design/2026-09-27-spru-wave-b-design.md 3-5)
    |--------------------------------------------------------------------------
    |
    | 種をまいたとき、まだ生まれていない仲間から weight(出やすさ)の重みで1人選ぶ。
    | 特別な仲間を足すときは、絵(tools/spru-assets/crops.json の companions)と1行を足す。
    | 立ち位置は config/world.php の companion_spots。
    |
    */

    'list' => [
        'lumi' => ['name' => 'Lumi', 'trait' => '光・ひらめき', 'line' => 'ひらめいた！いっしょに学ぼう', 'weight' => 1],
        'momo' => ['name' => 'Momo', 'trait' => '花・やさしさ', 'line' => 'お花、きれいだね', 'weight' => 1],
        'kuru' => ['name' => 'Kuru', 'trait' => '木の実・知識', 'line' => 'ものしりになりたいな', 'weight' => 1],
        'piko' => ['name' => 'Piko', 'trait' => '葉・冒険', 'line' => '冒険に行こうよ！', 'weight' => 1],
        'ruru' => ['name' => 'Ruru', 'trait' => '水・知恵', 'line' => 'じっくり考えるのが好き', 'weight' => 1],
    ],

    // 種ができるまでのレベルアップの回数(ふつう → つぼみ → 花 → 種)
    'growth_steps' => 3,

    // 生まれるまでの水やりの回数(1日1回)
    'waterings_to_bloom' => 3,

    // 全員生まれた後の種から咲くもの(非売品の町のアイテム)
    'flower_result' => 'spru_flower',
    'flower_item' => ['name' => 'スプルの花', 'asset_key' => 'spru_flower'],

];
```

`config/world.php`:
- `'landmarks' => [` の中、`['key' => 'spru_house', 'x' => 1, 'y' => 1],` の次に:

```php
            // スプルの家の前の畑。種をまいて水やりする(目印なのでアイテムは置けない)
            ['key' => 'garden', 'x' => 1, 'y' => 2],
```

- `'land' => [ ... ],` の閉じ括弧の次（ファイルの最後の `];` の前）に:

```php

    /*
    | 生まれた仲間の立ち位置(道のマス)。生まれた順に使う。6人目以降を足すときは位置も足す
    */

    'companion_spots' => [[0, 3], [2, 3], [4, 3], [5, 3], [6, 3]],
```

- [ ] **Step 5: 育ち具合と畑の状態を計算する**

`app/Support/Garden.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfileCompanion;
use App\Models\ProfileSeed;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/**
 * スプルの育ち具合と、畑・仲間(docs/design/2026-09-27-spru-wave-b-design.md 3〜4章)。
 * 育ち具合は保存せず、レベルと「前に種をまいたときのレベル」の差から決める。
 */
class Garden
{
    /** 水やりの「今日」の切り替え(連続日数と同じく日本時間0時) */
    public const TIMEZONE = 'Asia/Tokyo';

    public static function today(): string
    {
        return Carbon::now(self::TIMEZONE)->toDateString();
    }

    /** @return array{x: int, y: int} */
    public static function position(): array
    {
        $garden = collect(WorldLand::landmarks())->firstWhere('key', 'garden');

        return ['x' => $garden['x'], 'y' => $garden['y']];
    }

    public static function growth(UserProfile $profile): int
    {
        return max(0, min($profile->level - $profile->bloom_base_level, config('companions.growth_steps')));
    }

    public static function activeSeed(UserProfile $profile): ?ProfileSeed
    {
        return $profile->seeds()->whereNull('bloomed_at')->first();
    }

    public static function learnedToday(UserProfile $profile): bool
    {
        return $profile->last_correct_on?->toDateString() === self::today();
    }

    /** @return array{x:int, y:int, state:string, waterings:int, learned_today:bool, watered_today:bool, can_sow:bool, can_water:bool} */
    public static function state(UserProfile $profile): array
    {
        $seed = self::activeSeed($profile);
        $learned = self::learnedToday($profile);
        $watered = $seed?->last_watered_on?->toDateString() === self::today();

        return [
            ...self::position(),
            'state' => $seed === null ? 'empty' : ['seed', 'sprout', 'sprout_big'][min($seed->waterings, 2)],
            'waterings' => $seed?->waterings ?? 0,
            'learned_today' => $learned,
            'watered_today' => $watered,
            'can_sow' => $seed === null && self::growth($profile) >= config('companions.growth_steps'),
            'can_water' => $seed !== null && $learned && ! $watered,
        ];
    }

    /** @return list<array{key:string, name:string, trait:string, line:string, x:?int, y:?int}> 生まれた順 */
    public static function companions(UserProfile $profile): array
    {
        $spots = config('world.companion_spots');

        return $profile->companions()->orderBy('id')->get()->values()
            ->map(fn (ProfileCompanion $companion, int $i) => self::companionArray($companion->companion_key, $spots[$i] ?? null))
            ->all();
    }

    /** @param  array{0: int, 1: int}|null  $spot */
    private static function companionArray(string $key, ?array $spot): array
    {
        $def = config("companions.list.{$key}", []);

        return [
            'key' => $key,
            'name' => $def['name'] ?? $key,
            'trait' => $def['trait'] ?? '',
            'line' => $def['line'] ?? '',
            'x' => $spot[0] ?? null,
            'y' => $spot[1] ?? null,
        ];
    }
}
```

- [ ] **Step 6: 町のAPIと回答APIに足す**

`routes/api.php`:
- `use App\Support\ContinueStage;` の次に `use App\Support\Garden;` を足す（Task 1の `LevelCurve` より前）
- 町のAPIの返り値の `'continue_stage_id' => ContinueStage::resolveId($profile),` の次に:

```php
            'spru' => ['growth' => Garden::growth($profile)],
            'garden' => Garden::state($profile),
            'companions' => Garden::companions($profile),
```

- 回答APIの `$economyResult = $isCorrect` の行の直前に:

```php
        if ($isCorrect) {
            // その日に水やりできるかに使う(applyEconomy の保存で一緒に保存される)
            $profile->last_correct_on = Garden::today();
        }

```

- 回答APIの `$economy = [ ... ];` の中、Task 1で足した `'level_xp' => ...,` の次に:

```php
            'spru_growth' => Garden::growth($profile),
            'garden_busy' => Garden::activeSeed($profile) !== null,
```

- [ ] **Step 7: テストが通ることを確認する**

Run: `./vendor/bin/sail artisan test --filter=GardenStateTest && ./vendor/bin/sail artisan test`
Expected: GardenStateTest 20件PASS、全体 163件PASS

- [ ] **Step 8: 開発DBを更新する**

Run: `./vendor/bin/sail artisan migrate`
Expected: 5つの更新が `DONE`（`migrate:fresh` は使わない）

- [ ] **Step 9: コミット**

```bash
git add database/migrations/2026_09_27_* app/Models/ProfileSeed.php app/Models/ProfileCompanion.php app/Models/UserProfile.php config/companions.php config/world.php app/Support/Garden.php routes/api.php tests/Feature/GardenStateTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:スプルの育ち具合・畑・仲間のデータを追加し、町のAPIと回答APIで返す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 種まき・水やり・生まれる、「スプルの花」は非売品

**Files:**
- Modify: `app/Support/Garden.php`、`routes/api.php`（町のAPIのグループ・ショップ一覧・購入・Ownerの編集）
- Test: `tests/Feature/GardenActionsTest.php`

**Interfaces:**
- Consumes: Task 2 の `Garden::growth`・`activeSeed`・`learnedToday`・`state`・`companionArray`・`today`、`UserProfile::seeds()`・`companions()`・`worldItems()`、`ProfileWorldItem::toWorldArray()`
- Produces: `Garden::pickResult(UserProfile): string`、`Garden::sow(UserProfile): ProfileSeed`、`Garden::water(UserProfile): ?array`、`Garden::flowerShopItem(): ShopItem`。`POST /api/world/garden/sow` → `{ spru: { growth }, garden }`、`POST /api/world/garden/water` → `{ garden, born }`（`born` は null、`{ kind: "companion", key, name, trait, line, x, y }`、`{ kind: "item", world_item }`）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/GardenActionsTest.php`:

```php
<?php

use App\Models\Owner;
use App\Models\ShopItem;
use App\Support\Garden;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 種まき・水やり・生まれる(docs/design/2026-09-27-spru-wave-b-design.md 3-2〜3-5)
|--------------------------------------------------------------------------
*/

it('種ができていれば種をまけて、育ち具合が0に戻る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);

    $this->postJson('/api/world/garden/sow')
        ->assertOk()
        ->assertJsonPath('spru.growth', 0)
        ->assertJsonPath('garden.state', 'seed')
        ->assertJsonPath('garden.can_sow', false);

    expect($profile->fresh()->bloom_base_level)->toBe(4)
        ->and($profile->seeds()->whereNull('bloomed_at')->count())->toBe(1);
});

it('種ができていないと、種をまけない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3, 'bloom_base_level' => 1]);

    $this->postJson('/api/world/garden/sow')
        ->assertStatus(422)
        ->assertJsonPath('message', 'まだ種ができていないよ');

    expect($profile->seeds()->count())->toBe(0);
});

it('畑に種が育っていると、次の種はまけない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);
    $profile->seeds()->create(['result_key' => 'momo']);

    $this->postJson('/api/world/garden/sow')
        ->assertStatus(422)
        ->assertJsonPath('message', '畑に芽が育っているよ');
});

it('生まれるのは、まだ生まれていない仲間で、種まきの応答には出さない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);
    foreach (['lumi', 'momo', 'kuru', 'piko'] as $key) {
        $profile->companions()->create(['companion_key' => $key]);
    }

    $response = $this->postJson('/api/world/garden/sow')->assertOk();

    expect($profile->seeds()->first()->result_key)->toBe('ruru')
        ->and($response->getContent())->not->toContain('ruru');
});

it('仲間が全員生まれていれば、種からはスプルの花が咲く', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);
    foreach (['lumi', 'momo', 'kuru', 'piko', 'ruru'] as $key) {
        $profile->companions()->create(['companion_key' => $key]);
    }

    $this->postJson('/api/world/garden/sow')->assertOk();

    expect($profile->seeds()->first()->result_key)->toBe('spru_flower');
});

it('今日正解していれば水をあげられ、芽が育つ', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'momo']);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('garden.state', 'sprout')
        ->assertJsonPath('garden.watered_today', true)
        ->assertJsonPath('garden.can_water', false)
        ->assertJsonPath('born', null);
});

it('今日まだ正解していなければ、水をあげられない', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);

    $this->postJson('/api/world/garden/water')
        ->assertStatus(422)
        ->assertJsonPath('message', '今日1問正解したら、水をあげられるよ');
});

it('畑に種が無いと、水をあげられない', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);

    $this->postJson('/api/world/garden/water')
        ->assertStatus(422)
        ->assertJsonPath('message', '畑に種がないよ');
});

it('水やりは1日1回で、次の日に学べばまたあげられる', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo']);
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC')); // 日本時間 12:00
    $profile->update(['last_correct_on' => Garden::today()]);

    $this->postJson('/api/world/garden/water')->assertOk();
    $this->postJson('/api/world/garden/water')
        ->assertStatus(422)
        ->assertJsonPath('message', '今日はもう水をあげたよ。また明日ね');

    $this->travelTo(Carbon::parse('2026-09-28 03:00:00', 'UTC'));
    $this->postJson('/api/world/garden/water')
        ->assertStatus(422)
        ->assertJsonPath('message', '今日1問正解したら、水をあげられるよ');

    $profile->update(['last_correct_on' => Garden::today()]);
    $this->postJson('/api/world/garden/water')->assertOk()->assertJsonPath('garden.state', 'sprout_big');
});

it('3回目の水やりで仲間が生まれ、道に並ぶ', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today()]);
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => 2, 'last_watered_on' => '2026-01-01']);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('born', [
            'kind' => 'companion', 'key' => 'momo', 'name' => 'Momo', 'trait' => '花・やさしさ', 'line' => 'お花、きれいだね', 'x' => 0, 'y' => 3,
        ])
        ->assertJsonPath('garden.state', 'empty');

    $this->getJson('/api/world')->assertJsonPath('companions.0.key', 'momo');
});

it('スプルの花はバッグに入り、ショップには出ず、買えない', function () {
    $profile = createActiveProfile();
    $profile->update(['last_correct_on' => Garden::today(), 'points' => 100]);
    $profile->seeds()->create(['result_key' => 'spru_flower', 'waterings' => 2]);

    $this->postJson('/api/world/garden/water')
        ->assertOk()
        ->assertJsonPath('born.kind', 'item')
        ->assertJsonPath('born.world_item.asset_key', 'spru_flower')
        ->assertJsonPath('born.world_item.x', null);

    $this->getJson('/api/world')->assertJsonPath('bag.0.name', 'スプルの花');
    expect(collect($this->getJson('/api/shop')->json())->pluck('name'))->not->toContain('スプルの花');

    $flower = ShopItem::query()->where('name', 'スプルの花')->firstOrFail();
    $this->postJson("/api/shop/{$flower->id}/purchase")->assertStatus(422);
    expect($profile->fresh()->points)->toBe(100);
});

it('Ownerはスプルの花を編集できない', function () {
    $flower = Garden::flowerShopItem();
    $owner = Owner::factory()->create();

    $this->actingAs($owner, 'owner')->patchJson("/api/owner/shop-items/{$flower->id}", [
        'name' => '名前を変える',
        'price' => 10,
        'type' => 'decoration',
        'meta' => ['asset_key' => 'bench'],
    ])->assertStatus(422);

    expect($flower->fresh()->name)->toBe('スプルの花');
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `./vendor/bin/sail artisan test --filter=GardenActionsTest`
Expected: FAIL（`/api/world/garden/sow` が404、`Garden::flowerShopItem` が無い）

- [ ] **Step 3: 種まき・水やり・生まれるを作る**

`app/Support/Garden.php`:
- use文に `use App\Models\ShopItem;` を足す（`App\Models\ProfileSeed` の次）
- `companions()` の定義の次（`companionArray()` の前）に:

```php
    /** まだ生まれていない仲間から「出やすさ」の重みで1人選ぶ。全員生まれていれば spru_flower */
    public static function pickResult(UserProfile $profile): string
    {
        $born = $profile->companions()->pluck('companion_key')->all();
        $candidates = collect(config('companions.list'))
            ->reject(fn (array $def, string $key) => in_array($key, $born, true))
            ->filter(fn (array $def) => ($def['weight'] ?? 0) > 0);

        if ($candidates->isEmpty()) {
            return config('companions.flower_result');
        }

        $roll = random_int(1, $candidates->sum('weight'));
        foreach ($candidates as $key => $def) {
            $roll -= $def['weight'];
            if ($roll <= 0) {
                return $key;
            }
        }

        return $candidates->keys()->last();
    }

    /** 呼び出し側で、プロフィールを lockForUpdate してから呼ぶ */
    public static function sow(UserProfile $profile): ProfileSeed
    {
        abort_if(self::growth($profile) < config('companions.growth_steps'), 422, 'まだ種ができていないよ');
        abort_if(self::activeSeed($profile) !== null, 422, '畑に芽が育っているよ');

        $profile->bloom_base_level = $profile->level;
        $profile->save();

        return $profile->seeds()->create(['result_key' => self::pickResult($profile)]);
    }

    /**
     * 呼び出し側で、プロフィールを lockForUpdate してから呼ぶ。
     *
     * @return array<string, mixed>|null 3回目の水やりで生まれたもの
     */
    public static function water(UserProfile $profile): ?array
    {
        $seed = self::activeSeed($profile);
        abort_if($seed === null, 422, '畑に種がないよ');
        abort_unless(self::learnedToday($profile), 422, '今日1問正解したら、水をあげられるよ');
        abort_if($seed->last_watered_on?->toDateString() === self::today(), 422, '今日はもう水をあげたよ。また明日ね');

        $seed->waterings++;
        $seed->last_watered_on = self::today();
        $born = null;
        if ($seed->waterings >= config('companions.waterings_to_bloom')) {
            $seed->bloomed_at = now();
            $born = self::bloom($profile, $seed->result_key);
        }
        $seed->save();

        return $born;
    }

    /** 「スプルの花」(非売品の町のアイテム)。初めて咲いたときに作る */
    public static function flowerShopItem(): ShopItem
    {
        $item = config('companions.flower_item');

        return ShopItem::query()->firstOrCreate(
            ['type' => 'decoration', 'name' => $item['name']],
            [
                'price' => 0,
                'currency' => 'point',
                'min_level' => 1,
                'meta' => ['asset_key' => $item['asset_key'], 'not_for_sale' => true],
            ],
        );
    }

    /** @return array<string, mixed> */
    private static function bloom(UserProfile $profile, string $resultKey): array
    {
        if ($resultKey === config('companions.flower_result')) {
            $worldItem = $profile->worldItems()->create(['shop_item_id' => self::flowerShopItem()->id]);

            return ['kind' => 'item', 'world_item' => $worldItem->load('shopItem')->toWorldArray()];
        }

        $profile->companions()->firstOrCreate(['companion_key' => $resultKey]);
        $index = $profile->companions()->orderBy('id')->pluck('companion_key')->search($resultKey);

        return ['kind' => 'companion', ...self::companionArray($resultKey, config('world.companion_spots')[$index] ?? null)];
    }
```

- [ ] **Step 4: APIを足し、スプルの花を売らないようにする**

`routes/api.php`:
- 町のAPIのグループの中、`Route::post('/welcome', ...)->name('welcome');` の次に:

```php
    Route::post('/garden/sow', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            Garden::sow($profile);

            return ['spru' => ['growth' => Garden::growth($profile)], 'garden' => Garden::state($profile)];
        });
    })->name('garden.sow');

    Route::post('/garden/water', function (Request $request) {
        $activeProfile = ActiveProfile::require($request);

        return DB::transaction(function () use ($activeProfile) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();
            $born = Garden::water($profile);

            return ['garden' => Garden::state($profile), 'born' => $born];
        });
    })->name('garden.water');
```

- ショップ一覧（`->name('shop.index')`）の `->get()` と `->map(...)` の間に:

```php
        // 種から咲く「スプルの花」などの非売品は出さない
        ->reject(fn (ShopItem $item) => $item->meta['not_for_sale'] ?? false)
        ->values()
```

- 購入API（`->name('shop.purchase')`）の最初の `abort_unless(...);`（「この商品は現在準備中のため購入できません。」）の次に:

```php
    abort_if($shopItem->meta['not_for_sale'] ?? false, 422, 'このアイテムは買えません。');
```

- Ownerの編集（`Route::patch('/{shopItem}', ...)`、`->name('update')`）の中の先頭に:

```php
        abort_if($shopItem->meta['not_for_sale'] ?? false, 422, '非売品のアイテムは編集できません。');

```

- [ ] **Step 5: テストが通ることを確認する**

Run: `./vendor/bin/sail artisan test --filter=GardenActionsTest && ./vendor/bin/sail artisan test`
Expected: GardenActionsTest 12件PASS、全体 175件PASS

- [ ] **Step 6: コミット**

```bash
git add app/Support/Garden.php routes/api.php tests/Feature/GardenActionsTest.php
git commit -m "$(cat <<'EOF'
#NNNNN: feature:種まき・水やり・仲間の誕生のAPIを追加し、スプルの花を非売品にする

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 種まき・水やり・花・畑・仲間の画像を切り抜く

**Files:**
- Modify: `tools/spru-assets/extract.py`（全体を置き換え）、`tools/spru-assets/crops.json`（全体を置き換え）
- Create（生成）: `frontend/public/spru/actions/{water,sow-shake,sow-fly}.webp`、`frontend/public/spru/bloom/{flower,bud}.webp`、`frontend/public/spru/garden/{seed,sprout}.webp`、`frontend/public/spru/companions/{lumi,momo,kuru,piko,ruru}.webp`
- Modify（生成）: `frontend/src/components/spru/spru-assets.ts`

**Interfaces:**
- Produces（`spru-assets.ts`）: `SPRU_IMAGES` に `water`・`sow-shake`・`sow-fly` を追加、`SPRU_BLOOM`（`flower`・`bud`）、`GARDEN_IMAGES`（`seed`・`sprout`）、`COMPANION_IMAGES`（`lumi`・`momo`・`kuru`・`piko`・`ruru`）、`type SpruBloomKey`・`GardenImageKey`・`CompanionKey`、`SPRU_TIPS: Partial<Record<SpruImageKey, { x: number; y: number }>>`（種まきの2枚には無い）

- [ ] **Step 1: 切り抜く範囲の一覧を置き換える**

`tools/spru-assets/crops.json`（A回の分はそのまま。`m5` と、figures の最後の3件、`bloom`・`garden`・`companions` を足す）:

```json
{
  "sources": {
    "m4": "mascot-4.png",
    "m5": "mascot-5.png",
    "m6": "mascot-6.png",
    "logo": "mascot-logo.png"
  },
  "figures": [
    { "key": "front", "group": "basic", "source": "m6", "box": [30, 48, 158, 258] },
    { "key": "three-quarter", "group": "basic", "source": "m6", "box": [174, 54, 288, 258] },
    { "key": "normal", "group": "expressions", "source": "m6", "box": [32, 342, 160, 520] },
    { "key": "smile", "group": "expressions", "source": "m6", "box": [180, 328, 308, 520] },
    { "key": "laugh", "group": "expressions", "source": "m6", "box": [330, 328, 460, 522] },
    { "key": "surprised", "group": "expressions", "source": "m6", "box": [480, 330, 608, 520] },
    { "key": "think", "group": "expressions", "source": "m6", "box": [634, 324, 764, 522] },
    { "key": "effort", "group": "expressions", "source": "m6", "box": [786, 328, 916, 524] },
    { "key": "happy", "group": "expressions", "source": "m6", "box": [942, 328, 1076, 524] },
    { "key": "sad", "group": "expressions", "source": "m6", "box": [1100, 334, 1222, 524] },
    { "key": "cry", "group": "expressions", "source": "m6", "box": [1246, 330, 1374, 522] },
    { "key": "shy", "group": "expressions", "source": "m6", "box": [1394, 320, 1516, 522] },
    { "key": "excited", "group": "expressions", "source": "m4", "box": [351, 46, 490, 264], "scale": 0.82 },
    { "key": "walk", "group": "actions", "source": "m6", "box": [40, 592, 140, 758] },
    { "key": "run", "group": "actions", "source": "m6", "box": [176, 594, 270, 758] },
    { "key": "jump", "group": "actions", "source": "m6", "box": [290, 576, 404, 748] },
    { "key": "wave", "group": "actions", "source": "m6", "box": [464, 576, 574, 758] },
    { "key": "sit", "group": "actions", "source": "m6", "box": [624, 594, 734, 764] },
    { "key": "sleep", "group": "actions", "source": "m6", "box": [770, 654, 904, 760] },
    { "key": "startled", "group": "actions", "source": "m6", "box": [952, 590, 1058, 760] },
    { "key": "cheer", "group": "actions", "source": "m6", "box": [1094, 590, 1212, 758] },
    { "key": "dash", "group": "actions", "source": "m6", "box": [1256, 604, 1358, 754] },
    { "key": "palms", "group": "actions", "source": "m6", "box": [1406, 584, 1506, 756] },
    { "key": "water", "group": "actions", "source": "m4", "box": [539, 1065, 624, 1198], "scale": 1.55 },
    { "key": "sow-shake", "group": "actions", "source": "m6", "box": [547, 822, 641, 979], "tip": false },
    { "key": "sow-fly", "group": "actions", "source": "m6", "box": [664, 826, 770, 982], "mode": "all", "tip": false }
  ],
  "scenes": [
    { "key": "challenge", "source": "logo", "box": [284, 930, 502, 1098] },
    { "key": "grow", "source": "logo", "box": [750, 925, 930, 1100] }
  ],
  "bloom": [
    { "key": "flower", "source": "m5", "box": [1432, 804, 1475, 854] },
    { "key": "bud", "source": "m4", "box": [447, 604, 472, 633], "mode": "rect" }
  ],
  "garden": [
    { "key": "seed", "source": "m6", "box": [806, 846, 867, 954] },
    { "key": "sprout", "source": "m6", "box": [897, 860, 955, 976] }
  ],
  "companions": [
    { "key": "lumi", "source": "m6", "box": [1067, 835, 1149, 975] },
    { "key": "momo", "source": "m6", "box": [1159, 836, 1240, 974] },
    { "key": "kuru", "source": "m6", "box": [1255, 824, 1339, 974] },
    { "key": "piko", "source": "m6", "box": [1349, 828, 1430, 971] },
    { "key": "ruru", "source": "m6", "box": [1442, 822, 1520, 971] }
  ]
}
```

（`water` は mascot-4 のシーン「水やり」。シーンの絵は小さく描かれているため `scale` で立ち姿と縮尺をそろえる。`sow-fly` は飛んでいる種が本体から離れているので `mode: "all"`、`bud` は茎を含めないよう四角く切る `mode: "rect"`）

- [ ] **Step 2: 切り抜きスクリプトを置き換える**

`tools/spru-assets/extract.py`:

```python
#!/usr/bin/env python3
"""スプルの素材集(company/mascot/assets/)から、ゲームで使う画像を1体ずつ切り抜く。

使い方(リポジトリ直下で): python3 tools/spru-assets/extract.py ../../company/mascot/assets

- 切り抜く範囲は同じフォルダの crops.json に書く(素材集上のピクセル座標 [左, 上, 右, 下])
- 出力: frontend/public/spru/{group}/{key}.webp、表情の顔アイコン faces/、シーン scenes/、
  つぼみ・花 bloom/、畑の種・芽 garden/、仲間 companions/
- 画面側が読む一覧 frontend/src/components/spru/spru-assets.ts もここで書き出す(手で直さない)
- Spru Master(Blender)ができたら、同じキー・同じ置き場所の画像に差し替える
"""
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "frontend/public/spru"
TS_OUT = ROOT / "frontend/src/components/spru/spru-assets.ts"
PAD = 8
CORE_ALPHA = 200  # これより不透明な所をキャラクター本体とみなす(区切り枠や名前の文字は半透明)
EDGE_ALPHA = 24  # 余白を詰めるときの透明度のしきい値
MIN_PART = 20  # mode "all" で残す塊の最小の大きさ(小さなごみを除く)
TIP_ALPHA = 128  # Sの先を探すときの不透明さのしきい値
TIP_ROWS = 6  # いちばん上から何行分の平均を、Sの先の横位置にするか


def components(mask: Image.Image) -> list[list[tuple[int, int]]]:
    """二値マスクの塊(上下左右でつながった点の集まり)を、見つけた順に返す"""
    w, h = mask.size
    px = mask.load()
    seen = bytearray(w * h)
    found: list[list[tuple[int, int]]] = []
    for y in range(h):
        for x in range(w):
            if px[x, y] and not seen[y * w + x]:
                comp = []
                queue = deque([(x, y)])
                seen[y * w + x] = 1
                while queue:
                    cx, cy = queue.popleft()
                    comp.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not seen[ny * w + nx]:
                            seen[ny * w + nx] = 1
                            queue.append((nx, ny))
                found.append(comp)
    return found


def mask_of(size: tuple[int, int], points: list[tuple[int, int]]) -> Image.Image:
    out = Image.new("L", size, 0)
    op = out.load()
    for x, y in points:
        op[x, y] = 255
    return out


def cut_figure(src: Image.Image, box: list[int], scale: float, mode: str = "largest") -> Image.Image:
    """mode: "largest" は一番大きい塊だけ(離れた効果線・zzzを除く)、"all" は離れた部品も残す
    (飛んでいる種など。名前の文字が入らないよう枠ぴったりで切る)、"rect" は四角くそのまま切る"""
    x0, y0, x1, y1 = box
    if mode == "rect":
        crop = src.crop((x0, y0, x1, y1))
    else:
        pad = 0 if mode == "all" else PAD
        crop = src.crop((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
        alpha = crop.getchannel("A")
        comps = components(alpha.point(lambda v: 255 if v > CORE_ALPHA else 0))
        if mode == "all":
            points = [p for comp in comps if len(comp) >= MIN_PART for p in comp]
        else:
            points = max(comps, key=len) if comps else []
        keep = mask_of(alpha.size, points).filter(ImageFilter.MaxFilter(5))  # 輪郭のなめらかな半透明部分は残す
        crop.putalpha(Image.composite(alpha, Image.new("L", alpha.size, 0), keep))
        crop = crop.crop(crop.getchannel("A").point(lambda v: 255 if v > EDGE_ALPHA else 0).getbbox())
    if scale != 1.0:
        crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.LANCZOS)
    return crop


def face_of(img: Image.Image) -> Image.Image:
    """表情の画像から顔の部分を正方形で切り出す(丸く表示する前提)"""
    w, h = img.size
    side = round(w * 0.8)
    cx, cy = round(w * 0.52), round(h * 0.5)
    left = max(0, min(w - side, cx - side // 2))
    top = max(0, min(h - side, cy - side // 2))
    return img.crop((left, top, left + side, top + side))


def tip_of(img: Image.Image) -> dict:
    """Sの先(画像のいちばん上)の位置。つぼみ・花をここに重ねる"""
    alpha = img.getchannel("A").point(lambda v: 255 if v > TIP_ALPHA else 0)
    top = alpha.getbbox()[1]
    px = alpha.load()
    xs = [x for y in range(top, min(img.height, top + TIP_ROWS)) for x in range(img.width) if px[x, y]]
    return {"x": round(sum(xs) / len(xs)), "y": top}


def save(img: Image.Image, rel: str) -> dict:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=88, method=6)
    return {"src": f"/spru/{rel}", "width": img.width, "height": img.height}


def entries(items: dict) -> str:
    return "\n".join(
        f'  {json.dumps(k)}: {{ src: {json.dumps(v["src"])}, width: {v["width"]}, height: {v["height"]} }},'
        for k, v in items.items()
    )


def write_ts(images: dict, faces: dict, scenes: dict, bloom: dict, garden: dict, companions: dict, tips: dict) -> None:
    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    stand = images["three-quarter"]["height"]
    tip_lines = "\n".join(f'  {json.dumps(k)}: {{ x: {v["x"]}, y: {v["y"]} }},' for k, v in tips.items())
    TS_OUT.write_text(
        f"""// このファイルは tools/spru-assets/extract.py が書き出す。手で直さない
export type SpruImage = {{ src: string; width: number; height: number }};

export const SPRU_IMAGES = {{
{entries(images)}
}} as const satisfies Record<string, SpruImage>;

export const SPRU_FACES = {{
{entries(faces)}
}} as const satisfies Record<string, SpruImage>;

export const SPRU_SCENES = {{
{entries(scenes)}
}} as const satisfies Record<string, SpruImage>;

export const SPRU_BLOOM = {{
{entries(bloom)}
}} as const satisfies Record<string, SpruImage>;

export const GARDEN_IMAGES = {{
{entries(garden)}
}} as const satisfies Record<string, SpruImage>;

export const COMPANION_IMAGES = {{
{entries(companions)}
}} as const satisfies Record<string, SpruImage>;

export type SpruImageKey = keyof typeof SPRU_IMAGES;
export type SpruFaceKey = keyof typeof SPRU_FACES;
export type SpruSceneKey = keyof typeof SPRU_SCENES;
export type SpruBloomKey = keyof typeof SPRU_BLOOM;
export type GardenImageKey = keyof typeof GARDEN_IMAGES;
export type CompanionKey = keyof typeof COMPANION_IMAGES;

/** 立ち姿(3/4)の元画像の高さ。ほかの画像はこれとの比で大きさをそろえる(素材集の中で縮尺が同じため) */
export const SPRU_STAND_HEIGHT = {stand};

/** 各画像の中のSの先の位置(つぼみ・花を重ねる)。種まきの画像は花が描かれているので無い */
export const SPRU_TIPS: Partial<Record<SpruImageKey, {{ x: number; y: number }}>> = {{
{tip_lines}
}};
""",
        encoding="utf-8",
    )


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("使い方: python3 tools/spru-assets/extract.py <素材集のフォルダ>")
    assets = Path(sys.argv[1])
    spec = json.loads((Path(__file__).parent / "crops.json").read_text(encoding="utf-8"))
    sources = {name: Image.open(assets / file).convert("RGBA") for name, file in spec["sources"].items()}

    images: dict = {}
    faces: dict = {}
    scenes: dict = {}
    tips: dict = {}
    for fig in spec["figures"]:
        img = cut_figure(sources[fig["source"]], fig["box"], fig.get("scale", 1.0), fig.get("mode", "largest"))
        images[fig["key"]] = save(img, f'{fig["group"]}/{fig["key"]}.webp')
        if fig.get("tip", True):
            tips[fig["key"]] = tip_of(img)
        if fig["group"] == "expressions":
            faces[fig["key"]] = save(face_of(img), f'faces/{fig["key"]}.webp')
    for scene in spec["scenes"]:
        img = sources[scene["source"]].convert("RGB").crop(tuple(scene["box"]))
        scenes[scene["key"]] = save(img, f'scenes/{scene["key"]}.webp')

    parts: dict = {}
    for group in ("bloom", "garden", "companions"):
        parts[group] = {}
        for part in spec[group]:
            img = cut_figure(sources[part["source"]], part["box"], part.get("scale", 1.0), part.get("mode", "largest"))
            parts[group][part["key"]] = save(img, f'{group}/{part["key"]}.webp')

    write_ts(images, faces, scenes, parts["bloom"], parts["garden"], parts["companions"], tips)
    print(
        f"画像 {len(images)}・顔 {len(faces)}・シーン {len(scenes)}・花 {len(parts['bloom'])}"
        f"・畑 {len(parts['garden'])}・仲間 {len(parts['companions'])} を書き出しました"
    )


if __name__ == "__main__":
    main()
```

（A回の切り抜き方は変えていない。`largest_component` を `components` と `max(..., key=len)` に分けただけで、同じ大きさの塊が複数あるときも最初に見つけたものを選ぶので、A回の画像は1バイトも変わらない）

- [ ] **Step 3: スクリプトを実行する**

Run（リポジトリ直下で）: `python3 tools/spru-assets/extract.py ../../company/mascot/assets`
Expected: `画像 26・顔 11・シーン 2・花 2・畑 2・仲間 5 を書き出しました`

- [ ] **Step 4: 出来上がりを確かめる**

Run:

```bash
find frontend/public/spru -name '*.webp' | wc -l
du -sh frontend/public/spru
git status --short frontend/public/spru frontend/src/components/spru
sed -n '/SPRU_TIPS/,$p' frontend/src/components/spru/spru-assets.ts
cd frontend && npx tsc --noEmit
```

Expected:
- 48ファイル、合計500KB未満（試作では424KB）
- `git status` で変更（`M`）はA回の画像に1件も無く、`spru-assets.ts` だけ。新しいファイル（`??`）は `actions/water.webp`・`actions/sow-shake.webp`・`actions/sow-fly.webp`・`bloom/`・`garden/`・`companions/`
- `SPRU_TIPS` が次の24件（試作の値）。`sow-shake`・`sow-fly` は無い

| 画像 | x, y | 画像 | x, y | 画像 | x, y |
|---|---|---|---|---|---|
| front | 90, 0 | three-quarter | 65, 1 | normal | 53, 0 |
| smile | 72, 0 | laugh | 72, 1 | surprised | 74, 1 |
| think | 78, 0 | effort | 79, 2 | happy | 76, 1 |
| sad | 68, 1 | cry | 75, 1 | shy | 73, 1 |
| excited | 69, 0 | walk | 73, 0 | run | 58, 2 |
| jump | 42, 1 | wave | 46, 1 | sit | 86, 1 |
| sleep | 60, 1 | startled | 63, 2 | cheer | 49, 1 |
| dash | 52, 1 | palms | 64, 1 | water | 82, 1 |

- 型エラーなし

目で確かめるため、全部の画像に花を重ねた一覧と、新しい画像の一覧を作って見る（花がSの先に付いている、欠け・枠・文字の混入が無い、`sow-fly` に飛んでいる種が入っている）:

```bash
python3 - <<'EOF'
import re
from pathlib import Path
from PIL import Image
R = Path("frontend/public/spru")
ts = Path("frontend/src/components/spru/spru-assets.ts").read_text()
tips = {k: (int(x), int(y)) for k, x, y in re.findall(r'"([\w-]+)": \{ x: (\d+), y: (\d+) \}', ts.split("SPRU_TIPS")[1])}
flower = Image.open(R / "bloom/flower.webp").convert("RGBA")
fw = round(0.22 * 208)
flower = flower.resize((fw, round(flower.height * fw / flower.width)))
sheet = Image.new("RGBA", (1400, 900), (34, 52, 84, 255))
x, y, row = 8, 30, 0
files = [f for g in ("basic", "expressions", "actions") for f in sorted((R / g).glob("*.webp"))]
files += sorted((R / "garden").glob("*.webp")) + sorted((R / "companions").glob("*.webp"))
for f in files:
    im = Image.open(f).convert("RGBA")
    cell = Image.new("RGBA", (im.width, im.height + 30), (0, 0, 0, 0))
    cell.alpha_composite(im, (0, 30))
    if f.stem in tips:
        tx, ty = tips[f.stem]
        cell.alpha_composite(flower, (tx - flower.width // 2, ty + 30 + round(0.055 * 208) - flower.height // 2))
    if x + cell.width > 1392:
        x, y, row = 8, y + row + 8, 0
    sheet.alpha_composite(cell, (x, y))
    x, row = x + cell.width + 8, max(row, cell.height)
sheet.save("/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/spru-b-check.png")
print("bottom:", y + row)
EOF
```

`/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/spru-b-check.png` をReadツールで開いて確認し、確認後に削除する（`bottom` が900を超えたら、高さを広げて作り直す）。

- [ ] **Step 5: コミット**

```bash
git add tools/spru-assets frontend/public/spru frontend/src/components/spru/spru-assets.ts
git commit -m "$(cat <<'EOF'
#NNNNN: feature:種まき・水やり・花・つぼみ・畑の芽・仲間5人の画像と、Sの先の位置を切り抜きに追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 畑・つぼみと花・案内のひとことの計算（TDD）

**Files:**
- Create: `frontend/src/components/spru/bloom.ts`、`frontend/src/components/world/garden.ts`
- Modify: `frontend/src/components/world/types.ts`、`frontend/src/components/spru/mood.ts`、`frontend/src/components/spru/hint.ts`
- Test: `frontend/src/components/spru/bloom.test.ts`、`frontend/src/components/world/garden.test.ts`、`frontend/src/components/spru/mood.test.ts`、`frontend/src/components/spru/hint.test.ts`

**Interfaces:**
- Consumes: Task 4 の `SPRU_TIPS`・`SPRU_BLOOM`・`SPRU_STAND_HEIGHT`・`SpruImageKey`、A回の `pickTownMood`・`pickTownHint`
- Produces:
  - `types.ts`: `type GardenState`、`type WorldGarden`、`type WorldCompanion`、`type BornResult`、`WorldProfile.level_xp`、`WorldData.spru`・`garden`・`companions`、`Landmark.key` に `"garden"`
  - `bloom.ts`: `type Bloom = "bud" | "flower"`、`bloomOf(growth: number): Bloom | null`、`bloomRect(image: SpruImageKey, bloom: Bloom): { x; y; width; height } | null`
  - `garden.ts`: `type GardenTap`、`pickGardenTap(garden: WorldGarden): GardenTap`、`gardenPrompt(garden: WorldGarden): string | null`、`growthLabel(growth: number, xp: number, levelXp: { floor: number; next: number }): string`、`levelUpGrowthLine(growth: number, gardenBusy: boolean): string | null`
  - `mood.ts`: `TownEvent` に `sow`・`water`・`say`（`image`・`line`）、`TownMoodInput.prompt?: string | null`
  - `hint.ts`: `pickTownHint({ ..., canWater?: boolean })`

- [ ] **Step 1: 型を足す**

`frontend/src/components/world/types.ts`:
- `Landmark` の `key` を `key: "spru_house" | "torii" | "stone_lantern" | "garden";` にする
- `WorldProfile` の `coins: number;` の次に `level_xp: { floor: number; next: number };` を足す
- `WorldData` の `continue_stage_id: number | null;` の次に:

```ts
  spru: { growth: number };
  garden: WorldGarden;
  companions: WorldCompanion[];
```

- ファイルの最後に:

```ts
export type GardenState = "empty" | "seed" | "sprout" | "sprout_big";

export type WorldGarden = {
  x: number;
  y: number;
  state: GardenState;
  waterings: number;
  learned_today: boolean;
  watered_today: boolean;
  can_sow: boolean;
  can_water: boolean;
};

export type WorldCompanion = {
  key: string;
  name: string;
  trait: string;
  line: string;
  x: number | null;
  y: number | null;
};

export type BornResult = ({ kind: "companion" } & WorldCompanion) | { kind: "item"; world_item: WorldItem };
```

- [ ] **Step 2: 失敗するテストを書く（つぼみ・花）**

`frontend/src/components/spru/bloom.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { bloomOf, bloomRect } from "./bloom";
import { SPRU_STAND_HEIGHT, SPRU_TIPS } from "./spru-assets";

describe("bloomOf", () => {
  it("育ち具合1はつぼみ、2と3は花、0は何も付けない", () => {
    expect(bloomOf(0)).toBeNull();
    expect(bloomOf(1)).toBe("bud");
    expect(bloomOf(2)).toBe("flower");
    expect(bloomOf(3)).toBe("flower");
  });
});

describe("bloomRect", () => {
  it("花はSの先を中心に、少し下へずらして置く", () => {
    const rect = bloomRect("three-quarter", "flower");
    const tip = SPRU_TIPS["three-quarter"]!;
    expect(rect).not.toBeNull();
    expect(rect!.x + rect!.width / 2).toBeCloseTo(tip.x);
    expect(rect!.y + rect!.height / 2).toBeCloseTo(tip.y + 0.055 * SPRU_STAND_HEIGHT);
    expect(rect!.width).toBeCloseTo(0.22 * SPRU_STAND_HEIGHT);
  });

  it("つぼみは花より小さい", () => {
    expect(bloomRect("sit", "bud")!.width).toBeLessThan(bloomRect("sit", "flower")!.width);
  });

  it("種まきの画像は花が描かれているので重ねない", () => {
    expect(bloomRect("sow-shake", "flower")).toBeNull();
    expect(bloomRect("sow-fly", "bud")).toBeNull();
  });
});
```

- [ ] **Step 3: 失敗するテストを書く（畑）**

`frontend/src/components/world/garden.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { gardenPrompt, growthLabel, levelUpGrowthLine, pickGardenTap } from "./garden";
import type { WorldGarden } from "./types";

const garden = (overrides: Partial<WorldGarden> = {}): WorldGarden => ({
  x: 1,
  y: 2,
  state: "empty",
  waterings: 0,
  learned_today: false,
  watered_today: false,
  can_sow: false,
  can_water: false,
  ...overrides,
});

describe("pickGardenTap", () => {
  it("種がまけるときは種まき", () => {
    expect(pickGardenTap(garden({ can_sow: true }))).toEqual({ action: "sow" });
  });

  it("空の畑でまだ種ができていなければ、花が咲く条件を言う", () => {
    expect(pickGardenTap(garden())).toEqual({
      action: "say",
      image: "think",
      line: "レベルが上がると、スプルに花が咲くよ",
    });
  });

  it("水をあげられるときは水やり", () => {
    expect(pickGardenTap(garden({ state: "seed", learned_today: true, can_water: true }))).toEqual({ action: "water" });
  });

  it("今日まだ正解していなければ、正解するように言う", () => {
    expect(pickGardenTap(garden({ state: "sprout" }))).toEqual({
      action: "say",
      image: "think",
      line: "今日1問正解したら、水をあげられるよ",
    });
  });

  it("今日もう水をあげていれば、また明日と言う", () => {
    expect(pickGardenTap(garden({ state: "sprout", learned_today: true, watered_today: true }))).toEqual({
      action: "say",
      image: "smile",
      line: "今日はもう水をあげたよ。また明日ね",
    });
  });
});

describe("gardenPrompt", () => {
  it("種まき、水やりの順に案内し、どちらもできなければ無し", () => {
    expect(gardenPrompt(garden({ can_sow: true }))).toBe("花が咲いたよ！タップして種をまこう");
    expect(gardenPrompt(garden({ state: "seed", can_water: true }))).toBe("芽に水をあげよう！");
    expect(gardenPrompt(garden({ state: "seed", learned_today: true, watered_today: true }))).toBeNull();
  });
});

describe("growthLabel", () => {
  it("次に育つものと残りXPを出し、種ができたら残りは出さない", () => {
    const levelXp = { floor: 100, next: 220 };
    expect(growthLabel(0, 150, levelXp)).toBe("つぼみまで あと70XP");
    expect(growthLabel(1, 150, levelXp)).toBe("花まで あと70XP");
    expect(growthLabel(2, 150, levelXp)).toBe("種まで あと70XP");
    expect(growthLabel(3, 150, levelXp)).toBe("種ができた！");
  });
});

describe("levelUpGrowthLine", () => {
  it("育ち具合に合わせたひとことで、種ができたときは畑が空いているかで変える", () => {
    expect(levelUpGrowthLine(0, false)).toBeNull();
    expect(levelUpGrowthLine(1, false)).toBe("スプルにつぼみがついた！");
    expect(levelUpGrowthLine(2, false)).toBe("スプルの花が咲いた！");
    expect(levelUpGrowthLine(3, false)).toBe("種ができた！町でまいてみよう");
    expect(levelUpGrowthLine(3, true)).toBe("畑の芽が育ったら、種をまけるよ");
  });
});
```

- [ ] **Step 4: 失敗するテストを足す（出し分け・ひとこと）**

`frontend/src/components/spru/mood.test.ts` の `describe("pickTownMood", () => {` の中の最後（`"できごとは夜の眠りより優先される..."` のテストの次）に:

```ts
  it("種をまくと、頭を振ってから種が飛び、種まきのひとことを言う", () => {
    const event = { kind: "sow" as const, at: t(12) };
    expect(pickTownMood(input({ event, now: t(12) + 500 }))).toMatchObject({
      image: "sow-shake",
      face: "happy",
      line: "種をまいたよ！毎日水をあげて育てよう",
    });
    expect(pickTownMood(input({ event, now: t(12) + 1_500 }))).toMatchObject({ image: "sow-fly", face: "laugh" });
    expect(pickTownMood(input({ event, now: t(12) + 2_400 })).image).toBe("three-quarter");
  });

  it("水やりは水やりの絵で「大きくなあれ！」", () => {
    expect(pickTownMood(input({ event: { kind: "water", at: t(12) } }))).toEqual({
      image: "water",
      face: "smile",
      line: "大きくなあれ！",
      sleeping: false,
    });
  });

  it("畑の案内は、指定された画像とひとことを出す", () => {
    const event = { kind: "say" as const, at: t(12), image: "think" as const, line: "今日1問正解したら、水をあげられるよ" };
    expect(pickTownMood(input({ event }))).toMatchObject({
      image: "think",
      face: "think",
      line: "今日1問正解したら、水をあげられるよ",
    });
  });

  it("畑の案内があれば、時間帯のあいさつの代わりに言う", () => {
    expect(pickTownMood(input({ prompt: "芽に水をあげよう！" })).line).toBe("芽に水をあげよう！");
  });

  it("できごとの言葉と、座る・寝るは、畑の案内より優先される", () => {
    const event = { kind: "stored" as const, at: t(12), itemName: "ベンチ" };
    expect(pickTownMood(input({ prompt: "芽に水をあげよう！", event, now: t(12) + 5_000 })).line).toBe(
      "ベンチをバッグにしまったよ",
    );
    expect(pickTownMood(input({ prompt: "芽に水をあげよう！", now: t(12) + IDLE_SIT_MS })).line).toBe("ひと休み…");
  });
```

`frontend/src/components/spru/hint.test.ts` の `describe("pickTownHint", () => {` の中の最初に:

```ts
  it("今日の水やりができるときは、いちばん先に水やりをすすめる", () => {
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 1, shop, canWater: true })).toBe(
      "畑に水をあげよう！",
    );
  });

```

- [ ] **Step 5: テストが失敗することを確認する**

Run: `cd frontend && npm test`
Expected: FAIL（`./bloom`・`./garden` が見つからない。mood・hintの追加分が失敗）

- [ ] **Step 6: つぼみ・花を実装する**

`frontend/src/components/spru/bloom.ts`:

```ts
import { SPRU_BLOOM, SPRU_STAND_HEIGHT, SPRU_TIPS, type SpruImageKey } from "./spru-assets";

export type Bloom = "bud" | "flower";

// 立ち姿の高さに対する、つぼみ・花の幅と、Sの先から下へずらす量(素材集で見た目を合わせた値)
const BLOOM_WIDTH_RATIO: Record<Bloom, number> = { flower: 0.22, bud: 0.13 };
const BLOOM_DROP_RATIO = 0.055;

/** 育ち具合(0〜3)から、Sの先に付けるもの。種ができた(3)も花のまま */
export function bloomOf(growth: number): Bloom | null {
  if (growth >= 2) return "flower";
  if (growth === 1) return "bud";
  return null;
}

/** つぼみ・花を描く四角(スプルの画像の中のピクセル座標)。Sの先が無い画像(種まき)は null */
export function bloomRect(
  image: SpruImageKey,
  bloom: Bloom,
): { x: number; y: number; width: number; height: number } | null {
  const tip = SPRU_TIPS[image];
  if (!tip) return null;
  const asset = SPRU_BLOOM[bloom];
  const width = BLOOM_WIDTH_RATIO[bloom] * SPRU_STAND_HEIGHT;
  const height = (width * asset.height) / asset.width;
  return { x: tip.x - width / 2, y: tip.y + BLOOM_DROP_RATIO * SPRU_STAND_HEIGHT - height / 2, width, height };
}
```

- [ ] **Step 7: 畑の計算を実装する**

`frontend/src/components/world/garden.ts`:

```ts
import type { SpruImageKey } from "@/components/spru/spru-assets";

import type { WorldGarden } from "./types";

export type GardenTap = { action: "sow" } | { action: "water" } | { action: "say"; image: SpruImageKey; line: string };

/** 畑をタップしたときの動き(設計書3-4) */
export function pickGardenTap(garden: WorldGarden): GardenTap {
  if (garden.state === "empty") {
    return garden.can_sow
      ? { action: "sow" }
      : { action: "say", image: "think", line: "レベルが上がると、スプルに花が咲くよ" };
  }
  if (garden.can_water) return { action: "water" };
  if (!garden.learned_today) return { action: "say", image: "think", line: "今日1問正解したら、水をあげられるよ" };
  return { action: "say", image: "smile", line: "今日はもう水をあげたよ。また明日ね" };
}

/** スプルのふだんのひとことより優先する、畑の案内(設計書3-4) */
export function gardenPrompt(garden: WorldGarden): string | null {
  if (garden.can_sow) return "花が咲いたよ！タップして種をまこう";
  if (garden.can_water) return "芽に水をあげよう！";
  return null;
}

const NEXT_GROWTH = ["つぼみ", "花", "種"] as const;

/** 町の上のバーの右側(設計書5-5) */
export function growthLabel(growth: number, xp: number, levelXp: { floor: number; next: number }): string {
  if (growth >= 3) return "種ができた！";
  return `${NEXT_GROWTH[growth]}まで あと${Math.max(0, levelXp.next - xp)}XP`;
}

/** レベルアップのお祝いに足すひとこと(設計書3-1) */
export function levelUpGrowthLine(growth: number, gardenBusy: boolean): string | null {
  if (growth === 1) return "スプルにつぼみがついた！";
  if (growth === 2) return "スプルの花が咲いた！";
  if (growth >= 3) return gardenBusy ? "畑の芽が育ったら、種をまけるよ" : "種ができた！町でまいてみよう";
  return null;
}
```

- [ ] **Step 8: 出し分けとひとことを広げる**

`frontend/src/components/spru/mood.ts`:
- `TownEvent` の最後の行 `| { kind: "tap"; at: number; image: "shy" | "laugh" | "cheer"; hint: string };` を次にする:

```ts
  | { kind: "tap"; at: number; image: "shy" | "laugh" | "cheer"; hint: string }
  | { kind: "sow" | "water"; at: number }
  | { kind: "say"; at: number; image: SpruImageKey; line: string };
```

- `TownMoodInput` の `placing: boolean;` の次に:

```ts
  // 畑の案内(components/world/garden.ts の gardenPrompt)。ふだんのあいさつの代わりに言う
  prompt?: string | null;
```

- `EVENT_IMAGE_MS` の `woke: 1_500,` の次に `sow: 2_400,`・`water: 2_600,`・`say: 2_600,` を足し、その定義の次に:

```ts
// 種まきは「頭を振る」を見せてから「種が飛ぶ」に変える
const SOW_SHAKE_MS = 1_200;
```

- `FACE_FOR_IMAGE` の `startled: "surprised",` の次に `water: "smile",`・`"sow-shake": "happy",`・`"sow-fly": "laugh",` を足す
- `function eventImage(event: TownEvent): SpruImageKey {` を `function eventImage(event: TownEvent, age: number): SpruImageKey {` にし、`case "tap": return event.image;` の次に:

```ts
    case "sow":
      return age < SOW_SHAKE_MS ? "sow-shake" : "sow-fly";
    case "water":
      return "water";
    case "say":
      return event.image;
```

- `eventLine` の `case "tap": return event.hint;` の次に:

```ts
    case "sow":
      return "種をまいたよ！毎日水をあげて育てよう";
    case "water":
      return "大きくなあれ！";
    case "say":
      return event.line;
```

- `pickTownMood` の引数を `{ now, lastInteractionAt, event, nightWokenAt, placing, prompt = null }: TownMoodInput` にし、中の `const image = eventImage(activeEvent);` を `const image = eventImage(activeEvent, eventAge);` に、最後の `: GREETINGS[getTimeOfDay(date)];` を `: (prompt ?? GREETINGS[getTimeOfDay(date)]);` にする

`frontend/src/components/spru/hint.ts`:
- 引数を `{ bag, points, level, shop, canWater = false }` にし、型に `canWater?: boolean;` を足す
- 関数の最初の行（`if (bag.length > 0) ...` の前）に:

```ts
  if (canWater) return "畑に水をあげよう！";
```

- [ ] **Step 9: テストが通ることを確認する**

Run: `cd frontend && npm test && npx tsc --noEmit && npx eslint src/components/spru src/components/world`
Expected: PASS（A回の42件＋つぼみ・花4件＋畑8件＋出し分け5件＋ひとこと1件＝60件）、型エラー・lintエラーなし

- [ ] **Step 10: コミット**

```bash
git add frontend/src/components/world/types.ts frontend/src/components/spru/bloom.ts frontend/src/components/spru/bloom.test.ts frontend/src/components/world/garden.ts frontend/src/components/world/garden.test.ts frontend/src/components/spru/mood.ts frontend/src/components/spru/mood.test.ts frontend/src/components/spru/hint.ts frontend/src/components/spru/hint.test.ts
git commit -m "$(cat <<'EOF'
#NNNNN: feature:畑のタップ・案内のひとこと・つぼみと花の付け方・バーの表示を決める計算を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 町に畑・仲間・つぼみと花を出し、種まき・水やり・誕生をつなぐ

**Files:**
- Create: `frontend/src/components/world/garden-art.tsx`、`frontend/src/components/world/born-overlay.tsx`
- Modify: `frontend/src/components/spru/spru-figure.tsx`、`frontend/src/components/world/item-art.tsx`、`frontend/src/components/world/world-hud.tsx`、`frontend/src/components/world/world-scene.tsx`（全体を置き換え）、`frontend/src/components/world/world-screen.tsx`（全体を置き換え）

**Interfaces:**
- Consumes: Task 3 のAPI、Task 4 の `GARDEN_IMAGES`・`COMPANION_IMAGES`・`SPRU_BLOOM`・`CompanionKey`、Task 5 の `bloomOf`・`bloomRect`・`Bloom`・`pickGardenTap`・`gardenPrompt`・`growthLabel`・`TownEvent`（`sow`・`water`・`say`）・`pickTownHint({ canWater })`・型
- Produces: `SpruFigure({ image, standHeight, bloom?, alt?, className? })`、`GardenArt({ state })`、`BornOverlay({ born, onClose })`、`WorldHud({ name, profile, growth, nextUnlock })`、`ITEM` の `spru_flower`

- [ ] **Step 1: 畑の絵とお祝いを作る**

`frontend/src/components/world/garden-art.tsx`:

```tsx
import { GARDEN_IMAGES, type GardenImageKey } from "@/components/spru/spru-assets";

import type { GardenState } from "./types";

// 畑の芽の絵の高さ(SVGの単位)。大きな芽は小さな芽と同じ絵を大きく描く
const PLANT: Record<Exclude<GardenState, "empty">, { image: GardenImageKey; height: number }> = {
  seed: { image: "seed", height: 18 },
  sprout: { image: "sprout", height: 22 },
  sprout_big: { image: "sprout", height: 32 },
};

/** スプルの家の前の畑(原点=マスの中心)。土の畝に、水やりの回数に応じた種・芽を重ねる */
export function GardenArt({ state }: { state: GardenState }) {
  const plant = state === "empty" ? null : PLANT[state];
  const asset = plant ? GARDEN_IMAGES[plant.image] : null;
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

`frontend/src/components/world/born-overlay.tsx`:

```tsx
"use client";

import Image from "next/image";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { COMPANION_IMAGES, SPRU_BLOOM, type CompanionKey } from "@/components/spru/spru-assets";

import type { BornResult } from "./types";

/** 3回目の水やりで生まれたときの全画面のお祝い(設計書3-5) */
export function BornOverlay({ born, onClose }: { born: BornResult; onClose: () => void }) {
  const companion = born.kind === "companion" ? born : null;
  const asset = companion ? COMPANION_IMAGES[companion.key as CompanionKey] : SPRU_BLOOM.flower;
  const height = companion ? 150 : 80;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="born-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        {asset && (
          <Image
            src={asset.src}
            alt={companion ? companion.name : "スプルの花"}
            width={Math.round((asset.width * height) / asset.height)}
            height={height}
            className="animate-spru-hop"
          />
        )}
        <h2 id="born-title" className="text-2xl font-black text-[#2e6b1c]">
          <AutoFurigana text={companion ? `${companion.name}が生まれた！` : "スプルの花が咲いた！"} />
        </h2>
        {companion ? (
          <>
            <p className="rounded-full bg-[#f5efe1] px-3 py-0.5 text-sm font-black text-[#6b5d45]">
              <AutoFurigana text={companion.trait} />
            </p>
            <p className="text-sm font-bold text-[#6b5d45]">
              <AutoFurigana text={`「${companion.line}」`} />
            </p>
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
          {companion ? "町にむかえる" : "つづける"}
        </button>
      </div>
    </div>
  );
}
```

（`COMPANION_IMAGES` に無いキーの仲間はサーバーが返さない前提だが、`asset` が無くても画面が壊れないよう絵を出さずに表示する）

- [ ] **Step 2: スプルにつぼみ・花を付けられるようにし、スプルの花の絵を足す**

`frontend/src/components/spru/spru-figure.tsx` の `SpruFigure` を次にする（`SpruFace` はそのまま。import に `bloomRect`・`Bloom`・`SPRU_BLOOM` を足す）:

```tsx
import Image from "next/image";

import { bloomRect, type Bloom } from "./bloom";
import {
  SPRU_BLOOM,
  SPRU_FACES,
  SPRU_IMAGES,
  SPRU_STAND_HEIGHT,
  type SpruFaceKey,
  type SpruImageKey,
} from "./spru-assets";

/**
 * HTMLの中でスプルを出す(クイズ・演出用)。standHeight は立ち姿のときの高さ(px)で、
 * 座る・寝るなどほかの画像は素材集の縮尺どおりに大きさをそろえる。bloom はSの先のつぼみ・花
 */
export function SpruFigure({
  image,
  standHeight,
  bloom = null,
  alt = "",
  className,
}: {
  image: SpruImageKey;
  standHeight: number;
  bloom?: Bloom | null;
  alt?: string;
  className?: string;
}) {
  const asset = SPRU_IMAGES[image];
  const scale = standHeight / SPRU_STAND_HEIGHT;
  const width = Math.round(asset.width * scale);
  const height = Math.round(asset.height * scale);
  const rect = bloom ? bloomRect(image, bloom) : null;
  const figure = (
    <Image
      src={asset.src}
      alt={alt}
      width={width}
      height={height}
      className={rect ? undefined : className}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
  if (!bloom || !rect) return figure;
  // 跳ねるなどの動きは、花も一緒に動くよう外側の箱に付ける
  return (
    <span className={`relative inline-block ${className ?? ""}`} style={{ width, height }}>
      {figure}
      <Image
        src={SPRU_BLOOM[bloom].src}
        alt=""
        width={Math.round(rect.width * scale)}
        height={Math.round(rect.height * scale)}
        aria-hidden
        className="absolute"
        style={{ left: rect.x * scale, top: rect.y * scale }}
      />
    </span>
  );
}
```

`frontend/src/components/world/item-art.tsx`:
- 1行目の `import type { ReactNode } from "react";` の次に空行と `import { SPRU_BLOOM } from "@/components/spru/spru-assets";` を足す
- `const ART: Record<string, ReactNode> = {` の次の行（最初の項目の前）に:

```tsx
  // 種から咲いた「スプルの花」(非売品)。花は素材集の切り抜き
  spru_flower: (
    <g>
      <ellipse cx={0} cy={2} rx={11} ry={4.5} fill="#2f5d2a" opacity={0.15} />
      <path d="M0 2 C-1.5 -8 1.5 -14 0 -22" stroke="#5a9e3a" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <ellipse cx={-5} cy={-9} rx={5} ry={2.4} fill="#74b35d" transform="rotate(-25 -5 -9)" />
      <ellipse cx={5} cy={-14} rx={5} ry={2.4} fill="#86c56d" transform="rotate(25 5 -14)" />
      <image href={SPRU_BLOOM.flower.src} x={-11} y={-36} width={22} height={26} />
    </g>
  ),
```

- A回で `ITEM_LIGHTS` の上に残ってしまったコメント `// 絵が未登録のキーでも画面が壊れないようにする代わりの絵(プレゼント箱)` を、`const FALLBACK: ReactNode = (` の直前に移す

- [ ] **Step 3: 町の上のバーを育ち具合の表示にする**

`frontend/src/components/world/world-hud.tsx`:
- import に `import { growthLabel } from "./garden";` を足す（`import type { WorldProfile } from "./types";` の前）
- 引数に `growth,` と型 `growth: number;` を足す（`profile` の次）
- `// レベルはXP100ごとに上がる(UserProfile::applyEconomy)` と `const xpInLevel = profile.xp % 100;` の2行を次にする:

```tsx
  // レベルの上がり方はサーバーが計算する(app/Support/LevelCurve.php)
  const { floor, next } = profile.level_xp;
  const progress = Math.min(100, Math.max(0, Math.round(((profile.xp - floor) / Math.max(1, next - floor)) * 100)));
```

- バーの `aria-label="次のレベルまで"` を `aria-label="次に育つまで"` に、`aria-valuenow={xpInLevel}` を `aria-valuenow={progress}` に、`style={{ width: `${xpInLevel}%` }}` を `style={{ width: `${progress}%` }}` にする
- `<span className="shrink-0">あと {100 - xpInLevel} XP</span>` を次にする:

```tsx
            <span className="shrink-0">{growthLabel(growth, profile.xp, profile.level_xp)}</span>
```

- [ ] **Step 4: 町の描画を置き換える**

`frontend/src/components/world/world-scene.tsx` を次の内容にする:

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { bloomRect, type Bloom } from "@/components/spru/bloom";
import type { SpruView } from "@/components/spru/mood";
import {
  COMPANION_IMAGES,
  SPRU_BLOOM,
  SPRU_IMAGES,
  SPRU_STAND_HEIGHT,
  type CompanionKey,
} from "@/components/spru/spru-assets";
import { SpruFace } from "@/components/spru/spru-figure";

import { TIME_THEME } from "./ambience";
import { GardenArt } from "./garden-art";
import { HALF_H, HALF_W, LAND_THICKNESS, sceneViewBox, tileCenter, tileKey, tilePoints, toPercent } from "./iso";
import { ITEM_LIGHTS, ItemArt } from "./item-art";
import { LandmarkArt } from "./landmark-art";
import type { TimeOfDay } from "./time-of-day";
import type { WorldCompanion, WorldGarden, WorldItem, WorldLand } from "./types";

// 町の中のスプルの立ち姿の高さ(SVGの単位)。座る・寝る・仲間は素材集の縮尺どおりにそろえる
const TOWN_STAND_HEIGHT = 58;
const TOWN_SCALE = TOWN_STAND_HEIGHT / SPRU_STAND_HEIGHT;

type PlacedCompanion = WorldCompanion & { key: CompanionKey; x: number; y: number };

type SceneObject =
  | { kind: "landmark"; id: string; x: number; y: number; landmarkKey: string }
  | { kind: "item"; id: string; x: number; y: number; item: WorldItem }
  | { kind: "companion"; id: string; x: number; y: number; companion: PlacedCompanion; index: number }
  | { kind: "spru"; id: string; x: number; y: number };

type TapTarget = {
  id: string;
  x: number;
  y: number;
  label: string;
  onTap: () => void;
  halfWidth: number;
  up: number;
  down: number;
};

// 奥(x+yが小さい)から手前へ並べる
const byDepth = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x + a.y - (b.x + b.y) || a.x - b.x;

function isPlacedCompanion(companion: WorldCompanion): companion is PlacedCompanion {
  return companion.x !== null && companion.y !== null && companion.key in COMPANION_IMAGES;
}

export function WorldScene({
  land,
  items,
  validTiles,
  placing,
  onTileTap,
  onItemTap,
  spru,
  bloom,
  onSpruTap,
  timeOfDay,
  poppedItemId,
  garden,
  onGardenTap,
  companions,
  onCompanionTap,
  companionTalk,
  quiet,
}: {
  land: WorldLand;
  items: WorldItem[];
  validTiles: Set<string>;
  placing: boolean;
  onTileTap: (x: number, y: number) => void;
  onItemTap: (item: WorldItem) => void;
  spru: SpruView;
  bloom: Bloom | null;
  onSpruTap: () => void;
  timeOfDay: TimeOfDay;
  poppedItemId: number | null;
  garden: WorldGarden;
  onGardenTap: () => void;
  companions: WorldCompanion[];
  onCompanionTap: (key: string) => void;
  companionTalk: { key: string; at: number } | null;
  quiet: boolean;
}) {
  const theme = TIME_THEME[timeOfDay];
  // 夜は物を少し暗くする(明かりは暗くしない)
  const artStyle = theme.dimObjects ? { filter: "brightness(0.78) saturate(0.85)" } : undefined;
  const vb = sceneViewBox(land.size);
  const n = land.size;
  const pathSet = new Set(land.paths.map(([x, y]) => tileKey(x, y)));
  const placed = items.filter((item): item is WorldItem & { x: number; y: number } => item.x !== null && item.y !== null);
  const placedCompanions = companions.filter(isPlacedCompanion);

  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) tiles.push({ x, y });
  }

  // 奥から手前へ描くことで、手前の物が奥の物に重なる
  const objects: SceneObject[] = [
    ...land.landmarks.map((l, i) => ({ kind: "landmark" as const, id: `landmark-${i}`, x: l.x, y: l.y, landmarkKey: l.key })),
    ...placed.map((item) => ({ kind: "item" as const, id: `item-${item.id}`, x: item.x, y: item.y, item })),
    ...placedCompanions.map((companion, index) => ({
      kind: "companion" as const,
      id: `companion-${companion.key}`,
      x: companion.x,
      y: companion.y,
      companion,
      index,
    })),
    { kind: "spru" as const, id: "spru", x: land.spru.x, y: land.spru.y },
  ].sort(byDepth);

  const left = { x: -n * HALF_W, y: n * HALF_H };
  const bottom = { x: 0, y: n * HALF_H * 2 };
  const right = { x: n * HALF_W, y: n * HALF_H };
  const spruCenter = tileCenter(land.spru.x, land.spru.y);
  const bubble = toPercent(spruCenter.sx, spruCenter.sy - 60, vb);

  const spruAsset = SPRU_IMAGES[spru.image];
  const spruW = spruAsset.width * TOWN_SCALE;
  const spruH = spruAsset.height * TOWN_SCALE;
  const spruX = -spruW / 2;
  const spruY = -spruH + 2;
  const spruBloom = bloom ? bloomRect(spru.image, bloom) : null;
  const spruMotion = spru.sleeping ? undefined : spru.image === "jump" ? "animate-spru-hop" : "animate-spru-bob";
  const gardenGlow = !placing && (garden.can_sow || garden.can_water);

  const talking = companionTalk ? (placedCompanions.find((c) => c.key === companionTalk.key) ?? null) : null;
  const talkCenter = talking ? tileCenter(talking.x, talking.y) : null;
  const talkPos = talkCenter ? toPercent(talkCenter.sx, talkCenter.sy - 46, vb) : null;

  const boxStyle = (sx: number, sy: number, halfWidth: number, up: number, down: number) => {
    const topLeft = toPercent(sx - halfWidth, sy - up, vb);
    return {
      left: `${topLeft.left}%`,
      top: `${topLeft.top}%`,
      width: `${((halfWidth * 2) / vb.width) * 100}%`,
      height: `${((up + down) / vb.height) * 100}%`,
    };
  };

  // 押せる範囲は上に伸びて奥の物と重なるため、絵と同じく奥から順に並べて手前のボタンを上にする。置く場所を選んでいる間は出さない
  const tapTargets: TapTarget[] = placing
    ? []
    : [
        ...placed.map((item) => ({
          id: `item-button-${item.id}`,
          x: item.x,
          y: item.y,
          label: `${item.name}(動かす・しまう)`,
          onTap: () => onItemTap(item),
          halfWidth: HALF_W - 4,
          up: 56,
          down: 14,
        })),
        { id: "garden-button", x: garden.x, y: garden.y, label: "畑", onTap: onGardenTap, halfWidth: 22, up: 36, down: 12 },
        ...placedCompanions.map((c) => ({
          id: `companion-button-${c.key}`,
          x: c.x,
          y: c.y,
          label: c.name,
          onTap: () => onCompanionTap(c.key),
          halfWidth: 14,
          up: 44,
          down: 4,
        })),
      ].sort(byDepth);

  return (
    <div className="relative w-full" style={{ aspectRatio: `${vb.width} / ${vb.height}` }}>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`} className="absolute inset-0 h-full w-full" aria-hidden>
        <polygon
          points={`${left.x},${left.y + 50} ${bottom.x},${bottom.y + 50} ${right.x},${right.y + 50} 0,50`}
          fill="#62b8d6"
          opacity={0.55}
        />
        <polygon
          points={`${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + LAND_THICKNESS} ${left.x},${left.y + LAND_THICKNESS}`}
          fill="#d7a574"
        />
        <polygon
          points={`${bottom.x},${bottom.y} ${right.x},${right.y} ${right.x},${right.y + LAND_THICKNESS} ${bottom.x},${bottom.y + LAND_THICKNESS}`}
          fill="#bf8a5b"
        />
        <polygon points={`${left.x},${left.y} ${bottom.x},${bottom.y} ${bottom.x},${bottom.y + 7} ${left.x},${left.y + 7}`} fill="#86c56d" />
        <polygon points={`${bottom.x},${bottom.y} ${right.x},${right.y} ${right.x},${right.y + 7} ${bottom.x},${bottom.y + 7}`} fill="#74b35d" />
        <path
          d={`M${left.x} ${left.y + LAND_THICKNESS} L${bottom.x} ${bottom.y + LAND_THICKNESS} L${right.x} ${right.y + LAND_THICKNESS}`}
          stroke="#e6f7fb"
          strokeWidth={3}
          fill="none"
        />

        {tiles.map(({ x, y }) => {
          const key = tileKey(x, y);
          const fill = pathSet.has(key) ? "#f1dfbb" : (x + y) % 2 === 0 ? "#b4e19b" : "#a9da8e";
          return <polygon key={key} points={tilePoints(x, y)} fill={fill} />;
        })}

        {theme.groundTint && (
          <polygon
            points={`0,0 ${right.x},${right.y} ${right.x},${right.y + LAND_THICKNESS} ${bottom.x},${bottom.y + LAND_THICKNESS} ${left.x},${left.y + LAND_THICKNESS} ${left.x},${left.y}`}
            fill={theme.groundTint.color}
            opacity={theme.groundTint.opacity}
          />
        )}

        {gardenGlow && (
          <polygon
            points={tilePoints(garden.x, garden.y)}
            fill="#ffe27a"
            stroke="#d99a12"
            strokeWidth={1.5}
            className="animate-tile-pulse"
          />
        )}

        {placing &&
          [...validTiles].map((key) => {
            const [x, y] = key.split(",").map(Number);
            return (
              <polygon
                key={`valid-${key}`}
                points={tilePoints(x, y)}
                fill="#ffe27a"
                stroke="#d99a12"
                strokeWidth={1.5}
                className="animate-tile-pulse"
              />
            );
          })}

        {objects.map((o) => {
          const { sx, sy } = tileCenter(o.x, o.y);
          const hopping = o.kind === "companion" && companionTalk?.key === o.companion.key;
          return (
            <g key={o.id} transform={`translate(${sx} ${sy})`}>
              {o.kind === "landmark" && (
                <g style={artStyle}>
                  {o.landmarkKey === "garden" ? (
                    <GardenArt state={garden.state} />
                  ) : (
                    <LandmarkArt landmarkKey={o.landmarkKey} lit={theme.lit} />
                  )}
                </g>
              )}
              {o.kind === "item" && (
                <g className={o.item.id === poppedItemId ? "animate-pop-in" : undefined}>
                  <g style={artStyle}>
                    <ItemArt assetKey={o.item.asset_key} />
                  </g>
                  {theme.lit && o.item.asset_key && ITEM_LIGHTS[o.item.asset_key] && (
                    <circle
                      cx={ITEM_LIGHTS[o.item.asset_key].cx}
                      cy={ITEM_LIGHTS[o.item.asset_key].cy}
                      r={ITEM_LIGHTS[o.item.asset_key].r}
                      fill="#ffd98a"
                      opacity={0.5}
                    />
                  )}
                </g>
              )}
              {o.kind === "companion" && (
                <CompanionFigure
                  key={hopping ? `hop-${companionTalk?.at}` : "idle"}
                  companionKey={o.companion.key}
                  delay={o.index * 0.5}
                  quiet={quiet}
                  hopping={hopping}
                />
              )}
              {o.kind === "spru" && (
                <g key={spru.image} className={spruMotion}>
                  <image href={spruAsset.src} x={spruX} y={spruY} width={spruW} height={spruH} />
                  {bloom && spruBloom && (
                    <image
                      href={SPRU_BLOOM[bloom].src}
                      x={spruX + spruBloom.x * TOWN_SCALE}
                      y={spruY + spruBloom.y * TOWN_SCALE}
                      width={spruBloom.width * TOWN_SCALE}
                      height={spruBloom.height * TOWN_SCALE}
                    />
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {placing &&
        [...validTiles].map((key) => {
          const [x, y] = key.split(",").map(Number);
          const { sx, sy } = tileCenter(x, y);
          return (
            <button
              key={`tile-${key}`}
              type="button"
              aria-label={`横${x + 1}・縦${y + 1}のマスに置く`}
              onClick={() => onTileTap(x, y)}
              className="absolute focus-visible:outline-3 focus-visible:outline-[#f2b632]"
              style={{
                ...boxStyle(sx, sy, HALF_W, HALF_H, HALF_H),
                clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
              }}
            />
          );
        })}

      {tapTargets.map((target) => {
        const { sx, sy } = tileCenter(target.x, target.y);
        return (
          <button
            key={target.id}
            type="button"
            aria-label={target.label}
            onClick={target.onTap}
            className="absolute rounded-lg focus-visible:outline-3 focus-visible:outline-[#f2b632]"
            style={boxStyle(sx, sy, target.halfWidth, target.up, target.down)}
          />
        );
      })}

      <button
        type="button"
        data-spru
        aria-label="スプル"
        disabled={placing}
        onClick={onSpruTap}
        className="absolute rounded-full focus-visible:outline-3 focus-visible:outline-[#f2b632] disabled:pointer-events-none"
        style={boxStyle(spruCenter.sx, spruCenter.sy, 20, 60, 6)}
      />

      {talking && talkPos && (
        <div
          className="pointer-events-none absolute w-max max-w-[48%] -translate-x-1/2 -translate-y-full rounded-xl bg-white px-2.5 py-1 text-[11.5px] leading-snug font-bold text-[#3b3226] shadow-[0_2px_8px_rgba(59,50,38,0.16)]"
          style={{ left: `${talkPos.left}%`, top: `${talkPos.top}%` }}
          aria-live="polite"
        >
          <span className="mr-1 text-[#2e6b1c]">{talking.name}</span>
          <AutoFurigana text={talking.line} />
        </div>
      )}

      <div
        className="pointer-events-none absolute flex max-w-[66%] -translate-x-[18%] -translate-y-full items-center gap-2 rounded-2xl bg-white py-1.5 pr-3 pl-1.5 text-[12.5px] leading-relaxed font-bold text-[#3b3226] shadow-[0_3px_10px_rgba(59,50,38,0.16)]"
        style={{ left: `${bubble.left}%`, top: `${bubble.top}%` }}
        aria-live="polite"
      >
        <SpruFace face={spru.face} size={28} />
        <span>
          <AutoFurigana text={spru.line} />
        </span>
        <span className="absolute -bottom-1.5 left-[18%] h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
      </div>
    </div>
  );
}

// 仲間はタップしたときだけ跳ねる。夜は静かにゆれない(動きを減らす設定はCSSで止まる)
function CompanionFigure({
  companionKey,
  delay,
  quiet,
  hopping,
}: {
  companionKey: CompanionKey;
  delay: number;
  quiet: boolean;
  hopping: boolean;
}) {
  const asset = COMPANION_IMAGES[companionKey];
  const width = asset.width * TOWN_SCALE;
  const height = asset.height * TOWN_SCALE;
  const motion = hopping ? "animate-spru-hop" : quiet ? undefined : "animate-spru-bob";
  return (
    <g
      className={motion}
      style={motion === "animate-spru-bob" ? { animationDuration: "3.2s", animationDelay: `${delay}s` } : undefined}
    >
      <image href={asset.src} x={-width / 2} y={-height + 2} width={width} height={height} />
    </g>
  );
}
```

- [ ] **Step 5: 町の画面で種まき・水やり・誕生・仲間の吹き出しを管理する**

`frontend/src/components/world/world-screen.tsx` を次の内容にする:

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { useProfile } from "@/components/app/profile-provider";
import { useSound } from "@/components/app/sound-provider";
import { bloomOf } from "@/components/spru/bloom";
import { pickTownHint } from "@/components/spru/hint";
import { pickTownMood, type TownEvent } from "@/components/spru/mood";
import { apiFetch } from "@/lib/api";

import { Ambience, TIME_THEME } from "./ambience";
import { BornOverlay } from "./born-overlay";
import { gardenPrompt, pickGardenTap } from "./garden";
import { tileKey } from "./iso";
import { ItemActionSheet } from "./item-action-sheet";
import { PlacementBar } from "./placement-bar";
import { getSeason, getTimeOfDay, isSpruSleepTime } from "./time-of-day";
import type { BornResult, ShopListItem, WorldCompanion, WorldData, WorldGarden, WorldItem } from "./types";
import { WelcomeGift } from "./welcome-gift";
import { WorldHud } from "./world-hud";
import { WorldScene } from "./world-scene";

const WELCOME_AMOUNT = 100;
const TAP_IMAGES = ["shy", "laugh", "cheer"] as const;
// 仲間をタップしたときの吹き出しを出しておく時間
const COMPANION_TALK_MS = 3_000;
// 3回目の水やりで生まれたとき、水やりの動きを見せてからお祝いを出す
const BORN_DELAY_MS = 1_600;

export function WorldScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 最初に開いたときの ?place= だけを使う(配置後に読み直しても配置モードに戻らないようにURLからは消す)
  const initialPlaceParam = useRef(searchParams.get("place"));
  const { play } = useSound();
  const [placingId, setPlacingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<WorldItem | null>(null);
  const [poppedItemId, setPoppedItemId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { profile: sharedProfile, applyPartial, refresh: refreshProfile } = useProfile();
  const [world, setWorld] = useState<WorldData | null>(null);
  const [shop, setShop] = useState<ShopListItem[]>([]);
  const [welcomeBusy, setWelcomeBusy] = useState(false);
  // スプルの出し分け(components/spru/mood.ts)に渡す状態。時刻は1秒ごとに進める
  const [now, setNow] = useState(() => Date.now());
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());
  const [event, setEvent] = useState<TownEvent | null>(null);
  const [nightWokenAt, setNightWokenAt] = useState<number | null>(null);
  const [companionTalk, setCompanionTalk] = useState<{ key: string; at: number } | null>(null);
  const [born, setBorn] = useState<BornResult | null>(null);
  // 種まき・水やりの通信中は、続けて押しても送らない
  const [gardenBusy, setGardenBusy] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // プロフィール選択直後はここに来るため、アプリ起動時(未選択)のままの共有プロフィールを取り直す
    refreshProfile();
    apiFetch("/api/world").then(async (res) => {
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (res.status === 422) {
        router.replace("/profiles");
        return;
      }
      if (res.ok) {
        const data: WorldData = await res.json();
        setWorld(data);
        applyPartial({ points: data.profile.points });
        setEvent({ kind: "greet", at: Date.now() });

        // ショップやバッグから /?place=ID で来たら、そのアイテムの配置モードにする。
        // 自分のアイテムでないIDや存在しないIDは無視して普通に表示する
        const placeParam = initialPlaceParam.current;
        if (placeParam) {
          initialPlaceParam.current = null;
          const id = Number(placeParam);
          if ([...data.items, ...data.bag].some((item) => item.id === id)) setPlacingId(id);
          router.replace("/");
        }
      }
    });
    apiFetch("/api/shop").then(async (res) => {
      if (res.ok) setShop(await res.json());
    });
  }, [router, applyPartial, refreshProfile]);

  const placingItem = useMemo(
    () => (world && placingId !== null ? [...world.items, ...world.bag].find((item) => item.id === placingId) ?? null : null),
    [world, placingId],
  );

  const validTiles = useMemo(() => {
    const tiles = new Set<string>();
    if (!world || placingId === null) return tiles;
    const blocked = new Set(world.land.blocked.map(([x, y]) => tileKey(x, y)));
    const occupied = new Set(
      world.items.filter((item) => item.id !== placingId).map((item) => tileKey(item.x as number, item.y as number)),
    );
    for (let y = 0; y < world.land.size; y++) {
      for (let x = 0; x < world.land.size; x++) {
        const key = tileKey(x, y);
        if (!blocked.has(key) && !occupied.has(key)) tiles.add(key);
      }
    }
    return tiles;
  }, [world, placingId]);

  const placing = placingItem !== null;
  const growth = world?.spru.growth ?? 0;
  const prompt = world && !placing ? gardenPrompt(world.garden) : null;
  const mood = pickTownMood({ now, lastInteractionAt, event, nightWokenAt, placing, prompt });
  const talk = companionTalk && now - companionTalk.at < COMPANION_TALK_MS ? companionTalk : null;

  // スプル以外をさわったとき。昼に座って・寝ていたら起きる(夜の眠りはスプルをタップしたときだけ起きる)
  function handleInteraction(e: { target: EventTarget }) {
    if (e.target instanceof Element && e.target.closest("[data-spru]")) return;
    const at = Date.now();
    if (mood.sleeping && !isSpruSleepTime(new Date(at))) setEvent({ kind: "woke", at });
    setLastInteractionAt(at);
  }

  function handleSpruTap() {
    if (!world) return;
    const at = Date.now();
    setLastInteractionAt(at);
    if (mood.sleeping) {
      if (isSpruSleepTime(new Date(at))) setNightWokenAt(at);
      setEvent({ kind: "woke", at });
      return;
    }
    if (world.garden.can_sow) {
      sow();
      return;
    }
    setEvent({
      kind: "tap",
      at,
      image: TAP_IMAGES[Math.floor(Math.random() * TAP_IMAGES.length)],
      hint: pickTownHint({
        bag: world.bag,
        points: world.profile.points,
        level: world.profile.level,
        shop,
        canWater: world.garden.can_water,
      }),
    });
  }

  function handleGardenTap() {
    if (!world || gardenBusy) return;
    const tap = pickGardenTap(world.garden);
    if (tap.action === "sow") sow();
    else if (tap.action === "water") water();
    else setEvent({ kind: "say", at: Date.now(), image: tap.image, line: tap.line });
  }

  function handleCompanionTap(key: string) {
    setCompanionTalk({ key, at: Date.now() });
  }

  async function sow() {
    if (gardenBusy) return;
    setGardenBusy(true);
    try {
      const res = await apiFetch("/api/world/garden/sow", { method: "POST" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      const next: { spru: { growth: number }; garden: WorldGarden } = data;
      setWorld((prev) => (prev ? { ...prev, spru: next.spru, garden: next.garden } : prev));
      setMessage(null);
      play("correct");
      setEvent({ kind: "sow", at: Date.now() });
    } finally {
      setGardenBusy(false);
    }
  }

  async function water() {
    if (gardenBusy) return;
    setGardenBusy(true);
    try {
      const res = await apiFetch("/api/world/garden/water", { method: "POST" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        return;
      }
      const next: { garden: WorldGarden; born: BornResult | null } = data;
      setWorld((prev) => (prev ? { ...prev, garden: next.garden } : prev));
      setMessage(null);
      setEvent({ kind: "water", at: Date.now() });
      const result = next.born;
      if (result) {
        setTimeout(() => {
          play("allCorrect");
          setBorn(result);
        }, BORN_DELAY_MS);
      }
    } finally {
      setGardenBusy(false);
    }
  }

  function handleBornClose() {
    if (!born) return;
    const result = born;
    setBorn(null);
    if (result.kind === "item") {
      setWorld((prev) => (prev ? { ...prev, bag: [...prev.bag, result.world_item] } : prev));
      return;
    }
    const companion: WorldCompanion = {
      key: result.key,
      name: result.name,
      trait: result.trait,
      line: result.line,
      x: result.x,
      y: result.y,
    };
    setWorld((prev) => (prev ? { ...prev, companions: [...prev.companions, companion] } : prev));
    setCompanionTalk({ key: companion.key, at: Date.now() });
  }

  // 画面を先に更新し、APIが失敗したら元に戻す
  async function moveItem(item: WorldItem, x: number | null, y: number | null): Promise<boolean> {
    if (!world) return false;
    const previous = world;
    const updated = { ...item, x, y };
    const others = (list: WorldItem[]) => list.filter((i) => i.id !== item.id);
    setWorld({
      ...world,
      items: x === null ? others(world.items) : [...others(world.items), updated],
      bag: x === null ? [...others(world.bag), updated] : others(world.bag),
    });

    const res = await apiFetch(`/api/world/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ x, y }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setWorld(previous);
      setMessage(data.message ?? "通信エラーが発生しました。");
      setEvent({ kind: "error", at: Date.now() });
      return false;
    }
    return true;
  }

  async function placeAt(x: number, y: number) {
    if (!placingItem) return;
    const item = placingItem;
    setPlacingId(null);
    setMessage(null);
    if (await moveItem(item, x, y)) {
      play("correct");
      setPoppedItemId(item.id);
      setEvent({ kind: "placed", at: Date.now(), itemName: item.name });
    }
  }

  async function putAway(item: WorldItem) {
    setSelected(null);
    setMessage(null);
    if (await moveItem(item, null, null)) {
      setEvent({ kind: "stored", at: Date.now(), itemName: item.name });
    }
  }

  async function receiveWelcome() {
    setWelcomeBusy(true);
    try {
      const res = await apiFetch("/api/world/welcome", { method: "POST" });
      if (!res.ok) return;
      const data: { granted: boolean; points: number } = await res.json();
      setWorld((prev) => (prev ? { ...prev, welcome_available: false, profile: { ...prev.profile, points: data.points } } : prev));
      applyPartial({ points: data.points });
      setEvent({ kind: "welcome", at: Date.now() });
    } finally {
      setWelcomeBusy(false);
    }
  }

  const timeOfDay = getTimeOfDay(new Date(now));
  const season = getSeason(new Date(now));

  if (!world) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#8fd4e9] text-sm text-[#3b3226]">
        読み込み中...
      </div>
    );
  }

  const nextLocked = shop
    .filter((item) => item.type === "decoration" && item.min_level > world.profile.level)
    .sort((a, b) => a.min_level - b.min_level)[0];
  const nextUnlock = nextLocked ? `Lv.${nextLocked.min_level}で ${nextLocked.name}` : null;
  const continueHref = world.continue_stage_id ? `/quiz/${world.continue_stage_id}` : "/learn";

  return (
    <div
      className="min-h-screen transition-[background] duration-700"
      style={{ background: TIME_THEME[timeOfDay].background }}
      onPointerDown={handleInteraction}
      onKeyDown={handleInteraction}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <WorldHud name={sharedProfile?.name ?? ""} profile={world.profile} growth={growth} nextUnlock={nextUnlock} />

        {placingItem && <PlacementBar item={placingItem} onCancel={() => setPlacingId(null)} />}

        {message && (
          <p role="alert" className="mx-4 mt-3 rounded-xl bg-[#fdebe5] px-3 py-2 text-sm font-bold text-[#a33a22]">
            {message}
          </p>
        )}

        <p className="mx-auto mt-3 rounded-full bg-[rgba(255,250,240,0.94)] px-3 py-1 text-[12.5px] font-black shadow-[0_2px_6px_rgba(59,50,38,0.12)]">
          日本 · はじまりの町
        </p>

        <div className="relative mt-2 px-1">
          <WorldScene
            land={world.land}
            items={world.items}
            validTiles={validTiles}
            placing={placing}
            onTileTap={placeAt}
            onItemTap={setSelected}
            spru={mood}
            bloom={bloomOf(growth)}
            onSpruTap={handleSpruTap}
            timeOfDay={timeOfDay}
            poppedItemId={poppedItemId}
            garden={world.garden}
            onGardenTap={handleGardenTap}
            companions={world.companions}
            onCompanionTap={handleCompanionTap}
            companionTalk={talk}
            quiet={isSpruSleepTime(new Date(now))}
          />
          <Ambience timeOfDay={timeOfDay} season={season} />
        </div>

        {!placingItem && (
          <Link
            href={continueHref}
            className="mx-auto mt-4 flex h-[52px] items-center gap-2 rounded-full bg-[#3b7f26] px-6 text-base font-black text-white shadow-[0_5px_0_#285a19,0_10px_18px_rgba(40,90,25,0.28)]"
          >
            <BookOpen className="h-5 w-5" aria-hidden />
            つづきから学ぶ
          </Link>
        )}
      </div>

      <BottomNav />

      {selected && (
        <ItemActionSheet
          item={selected}
          onMove={() => {
            setPlacingId(selected.id);
            setSelected(null);
          }}
          onPutAway={() => putAway(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {world.welcome_available && (
        <WelcomeGift amount={WELCOME_AMOUNT} busy={welcomeBusy} onReceive={receiveWelcome} />
      )}

      {born && <BornOverlay born={born} onClose={handleBornClose} />}
    </div>
  );
}
```

- [ ] **Step 6: 型・lint・テスト**

Run: `cd frontend && npx tsc --noEmit && npx eslint src/components && npm test`
Expected: エラーなし、テスト60件PASS

- [ ] **Step 7: ブラウザで確認する（スマホ幅390pxとPC幅）**

開発サーバー（ポート3000）で「町テスト」にログインして確認する。先に、元に戻すための値を控える:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::where("name","町テスト")->first(); echo json_encode($p->only(["id","level","xp","hp","coins","points","bloom_base_level","last_correct_on"])), PHP_EOL;'
```

以下、`$p` は `App\Models\UserProfile::where("name","町テスト")->first()`。確認の途中は `tinker --execute` で値を変え、町を読み直す。

- 育ち具合（「町テスト」はLv.1のため、先にレベルを上げる。`bloom_base_level` はマイナスにできない）: `$p->update(["level"=>4,"bloom_base_level"=>3]);` でつぼみ、`"bloom_base_level"=>2` で花、`"bloom_base_level"=>1` で「花＋種ができた」になる。立つ・座る・寝る・手を振るなど、どのポーズでもSの先に付いている。上のバーの右が「つぼみまで あと〇XP」「花まで…」「種まで…」「種ができた！」と変わる
- 種まき（`"bloom_base_level"=>1` の状態）: 吹き出しが「花が咲いたよ！タップして種をまこう」、畑が光る。スプルをタップ → 頭を振る → 種が飛ぶ →「種をまいたよ！…」、畑に種が出て、スプルの花が消え、バーが「つぼみまで…」に戻る
- 水やり: `$p->update(["last_correct_on"=>now("Asia/Tokyo")->toDateString()]);` → 吹き出しが「芽に水をあげよう！」、畑が光る。畑をタップ → 水やりの絵＋「大きくなあれ！」、畑が小さな芽になる。もう一度タップ →「今日はもう水をあげたよ。また明日ね」
- 次の日: `$p->seeds()->whereNull("bloomed_at")->update(["last_watered_on"=>now("Asia/Tokyo")->subDay()->toDateString()]);` を2回くり返しながら水やり → 大きな芽 → 3回目で水やりの動きのあと（約1.6秒後）お祝い「〇〇が生まれた！」→「町にむかえる」で道に現れ、ひとことを言って跳ねる（レビューで特に見る点1）
- 仲間をタップ → 跳ねて、頭の上に名前とひとことが3秒出る
- 今日まだ正解していない: `$p->update(["last_correct_on"=>now("Asia/Tokyo")->subDay()->toDateString()]);` で種のある畑をタップ →「今日1問正解したら、水をあげられるよ」
- 空の畑で種ができていないとき: 畑をタップ →「レベルが上がると、スプルに花が咲くよ」
- 置く場所を選んでいる間（バッグから置く）: 畑が光らず、畑・仲間・スプルが押せない（レビューで特に見る点2）
- すばやく2回タップ: 水やりできる状態で、畑を `dblclick` → 水やりは1回だけ（`waterings` が1だけ増える）（レビューで特に見る点3）
- 夜: `page.clock.install({ time: new Date(2026, 8, 27, 22, 30) })` で開くと、スプルは寝たまま・仲間はゆれない。水やりできる状態で畑をタップ → その間だけ水やりの絵になり、また寝る（レビューで特に見る点4）
- 動きを減らす設定（`page.emulateMedia({ reducedMotion: "reduce" })`）: 仲間とスプルがゆれない
- スプルの花: 残りの仲間を `foreach (["lumi","momo","kuru","piko","ruru"] as $k) $p->companions()->firstOrCreate(["companion_key"=>$k]);` で全員にしてから、種まき → 水やり3回（上の「次の日」の手順）→「スプルの花が咲いた！」「バッグに入れたよ」→ バッグに入り、町に置ける。ショップには出ない

確認が終わったら元に戻す（控えた値に戻し、確認で作った種・仲間・スプルの花を消す）:

```bash
./vendor/bin/sail artisan tinker --execute='$p=App\Models\UserProfile::where("name","町テスト")->first(); $p->seeds()->delete(); $p->companions()->delete(); $f=App\Models\ShopItem::where("name","スプルの花")->first(); if ($f) { $p->worldItems()->where("shop_item_id",$f->id)->delete(); } $p->update(["level"=>控えた値, "xp"=>控えた値, "bloom_base_level"=>控えた値, "last_correct_on"=>控えた値]); echo "ok", PHP_EOL;'
```

（`控えた値` は最初に控えたJSONの値に置き換える。`last_correct_on` が null だったときは `null`）

- [ ] **Step 8: コミット**

```bash
git add frontend/src/components/world/garden-art.tsx frontend/src/components/world/born-overlay.tsx frontend/src/components/spru/spru-figure.tsx frontend/src/components/world/item-art.tsx frontend/src/components/world/world-hud.tsx frontend/src/components/world/world-scene.tsx frontend/src/components/world/world-screen.tsx
git commit -m "$(cat <<'EOF'
#NNNNN: feature:町に畑と仲間を出し、スプルにつぼみ・花を付け、種まき・水やり・仲間の誕生をつなぐ

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: クイズのお祝いに育ち具合を出し、Owner画面に「非売品」を出す

**Files:**
- Modify: `frontend/src/components/quiz/level-up-overlay.tsx`、`frontend/src/app/quiz/[stageId]/page.tsx`、`frontend/src/app/owner/dashboard/shop-items/page.tsx`

**Interfaces:**
- Consumes: Task 2 の回答APIの `profile.spru_growth`・`profile.garden_busy`、Task 5 の `bloomOf`・`Bloom`・`levelUpGrowthLine`、Task 6 の `SpruFigure({ bloom })`
- Produces: `LevelUpOverlay({ level, unlocked, onContinue, growthLine?, bloom? })`

- [ ] **Step 1: レベルアップのお祝いに育ち具合を足す**

`frontend/src/components/quiz/level-up-overlay.tsx`:
- import に `import type { Bloom } from "@/components/spru/bloom";` と `import { SpruFigure } from "@/components/spru/spru-figure";` を足す
- 引数を `{ level, unlocked, onContinue, growthLine = null, bloom = null }` にし、型に `growthLine?: string | null;`・`bloom?: Bloom | null;` を足す
- `HPが全回復したよ` の `</p>` の次に:

```tsx
        {growthLine && (
          <div className="flex w-full items-center gap-2 rounded-2xl bg-[#eef7e6] px-3 py-2 text-left">
            <SpruFigure image="three-quarter" standHeight={56} bloom={bloom} />
            <span className="text-sm font-black text-[#2e6b1c]">
              <AutoFurigana text={growthLine} />
            </span>
          </div>
        )}
```

- [ ] **Step 2: クイズ画面で育ち具合を持つ**

`frontend/src/app/quiz/[stageId]/page.tsx`:
- import に `import { bloomOf, type Bloom } from "@/components/spru/bloom";` と `import { levelUpGrowthLine } from "@/components/world/garden";` を足す（既存の `@/components/...` の並びに合わせる）
- `const [levelUp, setLevelUp] = useState<{ level: number; previousLevel: number } | null>(null);` を次にする:

```tsx
  const [levelUp, setLevelUp] = useState<{
    level: number;
    previousLevel: number;
    growthLine: string | null;
    bloom: Bloom | null;
  } | null>(null);
  // スプルの育ち具合(回答APIが返す)。正解・不正解・結果のスプルにつぼみ・花を付ける
  const [spruGrowth, setSpruGrowth] = useState(0);
```

- `submitAnswer` の中の

```tsx
        if (data.profile.leveled_up) {
          setLevelUp({ level: data.profile.level, previousLevel: profile?.level ?? data.profile.level - 1 });
        }
```

を次にする:

```tsx
        const growth: number = data.profile.spru_growth ?? 0;
        setSpruGrowth(growth);
        if (data.profile.leveled_up) {
          setLevelUp({
            level: data.profile.level,
            previousLevel: profile?.level ?? data.profile.level - 1,
            growthLine: levelUpGrowthLine(growth, Boolean(data.profile.garden_busy)),
            bloom: bloomOf(growth),
          });
        }
```

- 結果画面の `<SpruFigure image={result.image} standHeight={96} className={...} />` に `bloom={bloomOf(spruGrowth)}` を足す
- 正解・不正解の全画面表示の `<SpruFigure key={currentIndex} image={pickAnswerImage({...})} standHeight={100} className="animate-pop-in" />` に `bloom={bloomOf(spruGrowth)}` を足す
- `<LevelUpOverlay` の `onContinue={handleLevelUpContinue}` の前に `growthLine={levelUp.growthLine}` と `bloom={levelUp.bloom}` を足す

- [ ] **Step 3: Owner画面に「非売品」を出す**

`frontend/src/app/owner/dashboard/shop-items/page.tsx`:
- 商品の型の `meta: { heal?: number; asset_key?: string } | null;` を `meta: { heal?: number; asset_key?: string; not_for_sale?: boolean } | null;` にする
- 一覧の `{item.type === "decoration" ? ` ・ Lv.${item.min_level}〜` : ""}` の次の行に:

```tsx
                  {item.meta?.not_for_sale ? " ・ 非売品(種から咲く)" : ""}
```

- `<DropdownMenuItem onClick={() => openEdit(item)}>編集</DropdownMenuItem>` を、非売品のときは出さないようにする:

```tsx
                  {!item.meta?.not_for_sale && (
                    <DropdownMenuItem onClick={() => openEdit(item)}>
                      編集
                    </DropdownMenuItem>
                  )}
```

- [ ] **Step 4: 型・lint・テスト・本番ビルド**

Run: `cd frontend && npx tsc --noEmit && npx eslint src && npm test && npm run build`
Expected: エラーなし、テスト60件PASS、ビルド成功

- [ ] **Step 5: ブラウザで確認する（スマホ幅390pxとPC幅）**

先に元に戻すための値を控える（Task 6 Step 7 の控え方と同じ）。ステージ3（2問、正解は「Good morning」「Thank you」）を使う。

- 最後の問題で3回目のレベルアップ: `$p->update(["level"=>3,"xp"=>350,"bloom_base_level"=>1]);`（Lv.4まであとXP10、今の育ち具合は2）にし、1問目を不正解・2問目（最後）を正解 →「結果を見る」→ お祝いに「種ができた！町でまいてみよう」と花の付いたスプル →「つづける」で結果画面。結果・正解画面のスプルにも花が付いている。町に戻るとスプルに花が咲き、畑が光る（レビューで特に見る点5）
- 畑に種があるとき: 種を1つ作ってから（`$p->seeds()->create(["result_key"=>"momo"]);`）同じ手順 → お祝いが「畑の芽が育ったら、種をまけるよ」
- つぼみ・花: `$p->update(["level"=>3,"xp"=>350,"bloom_base_level"=>3]);` で正解してLv.4になると「スプルにつぼみがついた！」、`"bloom_base_level"=>2` なら「スプルの花が咲いた！」になる
- Ownerでログインできる場合は、ショップの管理画面で「スプルの花」に「非売品(種から咲く)」と出て、「編集」が出ないこと（Ownerのログイン情報が分からなければ省略し、報告する）

確認が終わったら、控えた値に戻し、確認で作った種を消す。

- [ ] **Step 6: コミット**

```bash
git add frontend/src/components/quiz/level-up-overlay.tsx "frontend/src/app/quiz/[stageId]/page.tsx" frontend/src/app/owner/dashboard/shop-items/page.tsx
git commit -m "$(cat <<'EOF'
#NNNNN: feature:クイズのお祝い・正解・結果のスプルに育ち具合を出し、Owner画面にスプルの花を非売品と表示する

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 仕上げ（通し確認・ドキュメント・マージ）

**Files:**
- Modify: `SPEC.md`、`TASKS.md`、`/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md`

- [ ] **Step 1: 全テストと本番ビルド**

Run: `./vendor/bin/sail artisan test && cd frontend && npm test && npx tsc --noEmit && npx eslint src && npm run build`
Expected: バックエンド175件PASS、フロント60件PASS、型・lintエラーなし、ビルド成功

- [ ] **Step 2: 通しのブラウザ確認**

「町テスト」で、スマホ幅（390px）とPC幅の両方で、Task 6・7のブラウザ確認を一通りもう一度行う（特に「レビューで特に見る点」の1〜5）。あわせて、A回の動き（手を振る・座る・寝る・タップの反応・時間帯と季節）と、①の「買う → 置く → 動かす → しまう → バッグから置き直す」が今も動くことを確かめる。確認後は値を元に戻す。

- [ ] **Step 3: SPEC.md を更新する**

`SPEC.md`:
- 1章の「2026-09-26 仲間と成長の構想」の行の `B: 成長サイクル・水やり・仲間の誕生` を `B: 成長サイクル・水やり・仲間の誕生（実装済み、`docs/design/2026-09-27-spru-wave-b-design.md`）` にする
- 4-9の「⚠️ スプルの画像は素材集…」の行の前に、次の3行を足す:
  - 「- ✅（2026-09-27、B回）スプルの成長サイクル: レベルアップ1回ごとに ふつう→つぼみ→花→種 と育ち（Sの先に重ねて描く）、町の畑（スプルの家の前）に種をまく。その日に1問でも正解したら1日1回水やりでき、3回で仲間（Lumi・Momo・Kuru・Piko・Ruru。まだいない仲間からランダム）が生まれて道に並ぶ。休んでも枯れない。全員そろった後の種からは「スプルの花」（非売品の町のアイテム）が咲く（`app/Support/Garden.php`、`config/companions.php`）」
  - 「- ✅（B回）レベルの上がり方: 次のレベルまで100から+20ずつ・上限300（`app/Support/LevelCurve.php`）。正解のXPは初級10・中級15・上級20（学習ポイントは10のまま）」
  - 「- ⚠️ 仲間の絵は1人1枚（mascot-6）で、表情・ポーズは無い。特別な仲間・記念の仲間・天井は未実装（一覧に「出やすさ」を持たせてある）。コインで種を買う・育つのを早める・選び直す機能は作らない方針」

- [ ] **Step 4: TASKS.md を更新する**

`TASKS.md` の「ワールド画面」の節で:
- 「- [ ] **B回: 成長サイクル（芽→つぼみ→花→種）、毎日の水やり（休んでも枯れない）、種から仲間が生まれる**（…）」の行を次にする:

```markdown
- [x] **B回: 成長サイクル（ふつう→つぼみ→花→種）、毎日の水やり（休んでも枯れない）、種から仲間が生まれる**（2026-09-27。設計書 `docs/design/2026-09-27-spru-wave-b-design.md`、実装計画 `docs/design/2026-09-27-spru-wave-b-plan.md`。レベルの上がり方も変更）
```

- 「- [ ] 後回し: 着せ替え（国ごとの帽子）、図鑑。…」の行の次に:

```markdown
- [ ] 特別な仲間（金色など）・記念の仲間・天井（B回で「出やすさ」の仕組みは用意済み。確率で出す仲間は公開前に専門家へ確認する）
- [ ] 仲間ごとの表情・ポーズ集ができたら、`tools/spru-assets/crops.json` の companions に足して差し替える
```

- [ ] **Step 5: マスコット部の資料に追記する**

`/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md` の「Spra-goで仮素材を使用（2026-09-26）」の項目の最後のサブ項目（2026-09-27追記（A回））の次に、同じ形で追記する（既存の文は書き換えない）:

「  - 2026-09-27追記（B回）: 仲間5人（Lumi・Momo・Kuru・Piko・Ruru）・種まき・種と芽・花とつぼみは mascot-6、水やりは mascot-4 のシーン、花の部品は mascot-5 から切り抜いて使用中。仲間は1人1枚のため、仲間ごとの表情・ポーズ集があると表現を増やせる」

（このファイルはSpra-goのリポジトリ外のため、Spra-goのコミットには含めない）

- [ ] **Step 6: ドキュメントをコミットし、mainへマージしてpushする**

```bash
git add SPEC.md TASKS.md
git commit -m "$(cat <<'EOF'
#NNNNN: docs:スプルのB回(成長サイクル・水やり・仲間の誕生・レベルの上がり方)をSPEC/TASKSに反映

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
git checkout main
git merge --no-ff feature/spru-wave-b
./vendor/bin/sail artisan test
cd frontend && npm test && cd ..
git push origin main feature/spru-wave-b
```

Expected: マージ後もバックエンド・フロントのテストがすべてPASS、pushが成功する（Keychainの確認が出た場合はOwnerに入力してもらう）
