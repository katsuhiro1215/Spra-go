# 町の広がりとレベルのごほうび 実装計画

> **実装するエージェントへ:** 実行方法はネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。`superpowers:executing-plans` を使う。手順のチェックボックスで進み具合を追う。

**ゴール:** 領地拡大をLv5ごと（7区画）に、通常キャラをLv3から5レベルおきのレベルで会える形に、畑のふつうの種を「スプルの花」に、Lv12・22・32で名所を好きな1つ選べるようにする。

**アーキテクチャ:** すべて「今のレベルから決める」形にする（`RareSeeds::grantLocked` と同じ考え方）。通常キャラと名所の選択は、保存するのは「もらった・選んだ」記録だけで、いつ届いたかは今のレベルから求める。町を開いたとき（`GET /api/world`）に、届いている分を渡す。これで、レベルが一度に何段上がっても、取りこぼさない。

**技術:** Laravel（Pest）、Next.js（Vitest）、MySQL。

**設計書:** `docs/design/2026-10-08-town-growth-design.md`

## 全体の決まり

- ブランチ `feature/town-growth`。コミットメッセージは「`#00534: type(用途): summary`」の形（最近のコミットと同じ。番号は計画のコミット(#00533)の次(#00534)から1つずつ進める。type は `.gitmessage` の一覧から選ぶ）。コミットの最後に `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` を付ける。
- サーバーのテストは、全体を同時に2つ走らせない（MySQLのデッドロックになる）。テストは `testing` DBだけ。
- LaviとSakuは、絵が届くまで並びに入れない。並びは今の5人（`lumi`・`momo`・`kuru`・`piko`・`ruru`）だけ。
- 区画の絵・新キャラの絵は後から入る。今回は、今の描画のまま7区画に広げる。
- 日本語で書く（ドキュメント・画面の文言）。

## 見直しの焦点（Review Focus）

1. **レベルが一度に何段も上がる**（例: Lv2→Lv14）: 通常キャラは届いた分（Lv3・8・13の3人）がまとめて入る。名所の選択は、届いた回（Lv12）が1回分。→ Task 2・3 のテスト。
2. **畑で生まれた仲間を、すでに持っている**: 同じキャラは二重に入らない（`firstOrCreate`）。→ Task 2。
3. **町に立てる人数の上限（`town_limit`）**: レベルで入った仲間も、いっぱいなら「おうちで休む」から始まる。→ Task 2。
4. **名所の選択を二重に送る**: 同じ回は1回だけ選べる（2回目は422）。同時に2回送っても1つだけ。→ Task 3。
5. **既存のユーザーがLv10以上で、新しい区画のレベルが後ろへずれる**: 丘（今Lv10）がLv15になる。開いていた区画が閉じても、すでに置いたアイテムは失われない（`world:repair` でバッグに戻る）。→ Task 4。

## ファイル構成

| ファイル | 役目 |
|---|---|
| `config/companions.php` | `level_order`（会える順）・`level_first`・`level_step`・`flower_*` |
| `app/Support/LevelCompanions.php`（新） | レベルで届いた仲間を渡す |
| `app/Support/Garden.php` | `pickResult` を、ふつうの種はいつも「スプルの花」にする |
| `config/world.php` | `land.plots` 7区画、`gifts`（名所の選択の回と候補の大きさ） |
| `app/Support/LevelGifts.php`（新） | 選べる回・候補・選ぶ処理 |
| `app/Models/ProfileGift.php`・マイグレーション（新） | 選んだ記録（`profile_gifts`） |
| `routes/api.php` | `GET /api/world` に `new_companions`・`gifts`、`GET/POST /api/world/gifts` |
| `frontend/src/components/world/` | `types.ts`・`companion-gift.tsx`（新）・`gift-picker.tsx`（新）・`world-screen.tsx` |
| `SPEC.md`・`TASKS.md` | 仕様と状態 |

---

### Task 1: 設定を新しい決まりにそろえる

**Files:**
- Modify: `config/companions.php`（`level_order` などを足す）
- Test: `tests/Feature/CompanionLevelConfigTest.php`（新）

**Interfaces:**
- Produces: `config('companions.level_order')` = `['lumi','momo','kuru','piko','ruru']`、`config('companions.level_first')` = 3、`config('companions.level_step')` = 5。`config('companions.list.<key>.rare')` が false のものだけが並びに入る。

- [ ] **Step 1: 失敗するテストを書く**

```php
<?php

/*
|--------------------------------------------------------------------------
| 通常キャラが会えるレベル(docs/design/2026-10-08-town-growth-design.md 4-2)
|--------------------------------------------------------------------------
*/

it('会える順は今の通常キャラの5人で、Lv3から5レベルおき', function () {
    expect(config('companions.level_order'))->toBe(['lumi', 'momo', 'kuru', 'piko', 'ruru'])
        ->and(config('companions.level_first'))->toBe(3)
        ->and(config('companions.level_step'))->toBe(5);
});

it('会える順に入っているのは、設定にある通常キャラ(レアでない)だけ', function () {
    foreach (config('companions.level_order') as $key) {
        expect(config("companions.list.{$key}"))->not->toBeNull()
            ->and(config("companions.list.{$key}.rare", false))->toBeFalse();
    }
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/CompanionLevelConfigTest.php`
Expected: FAIL（`level_order` がない）

- [ ] **Step 3: 設定を足す**（`config/companions.php` の `'growth_steps'` の上）

```php
    /*
    | 通常キャラがレベルで会える順(docs/design/2026-10-08-town-growth-design.md 4-2)。
    | level_first のレベルから level_step レベルおきに、先頭から1人ずつ(3・8・13・18・23)。
    | 新しい仲間は、絵とセリフがそろったらこの並びの後ろに足す(足せば 28・33… と続く)
    */
    'level_order' => ['lumi', 'momo', 'kuru', 'piko', 'ruru'],
    'level_first' => 3,
    'level_step' => 5,

```

- [ ] **Step 4: 通ることを確かめる**

Run: `./vendor/bin/sail test tests/Feature/CompanionLevelConfigTest.php`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git checkout -b feature/town-growth
git add config/companions.php tests/Feature/CompanionLevelConfigTest.php
git commit -m "#00534: feature(仲間): 通常キャラがレベルで会える順を設定に足す"
```

---

### Task 2: レベルで届いた仲間を渡す

**Files:**
- Create: `app/Support/LevelCompanions.php`
- Modify: `app/Support/Garden.php`（`bloom` から仲間を入れる処理を取り出して共有）、`routes/api.php`（`GET /api/world` に `new_companions`）
- Test: `tests/Feature/LevelCompanionsTest.php`（新）

**Interfaces:**
- Consumes: `config('companions.level_order'|'level_first'|'level_step')`、`UserProfile::companions()`
- Produces:
  - `LevelCompanions::levelFor(int $index): int` — 並びの何番目（0始まり）がどのレベルか（`level_first + level_step × index`）。
  - `LevelCompanions::due(UserProfile $profile): list<string>` — 今のレベルまでに届いているキャラのキー。
  - `LevelCompanions::grantDue(UserProfile $profile): list<array>` — まだ持っていない届いたキャラを入れ、入ったキャラの配列（`Garden::companions` の1要素と同じ形）を返す。
  - `Garden::addCompanion(UserProfile $profile, string $key): void` — 町の人数の上限・最初の相棒の決まりを守って入れる（`bloom` と共有）。

- [ ] **Step 1: 失敗するテストを書く**

```php
<?php

use App\Support\LevelCompanions;

/*
|--------------------------------------------------------------------------
| レベルで会える通常キャラ(docs/design/2026-10-08-town-growth-design.md 4-2)
|--------------------------------------------------------------------------
*/

it('並びの何番目がどのレベルか(3・8・13・18・23)', function () {
    expect(array_map(fn (int $i) => LevelCompanions::levelFor($i), [0, 1, 2, 3, 4]))->toBe([3, 8, 13, 18, 23]);
});

it('届いたキャラは今のレベルまでの分だけ', function (int $level, array $expected) {
    $profile = createActiveProfile();
    $profile->update(['level' => $level]);

    expect(LevelCompanions::due($profile->fresh()))->toBe($expected);
})->with([
    'Lv2' => [2, []],
    'Lv3' => [3, ['lumi']],
    'Lv7' => [7, ['lumi']],
    'Lv8' => [8, ['lumi', 'momo']],
    'Lv23' => [23, ['lumi', 'momo', 'kuru', 'piko', 'ruru']],
    'Lv60' => [60, ['lumi', 'momo', 'kuru', 'piko', 'ruru']],
]);

it('町を開くと、届いたキャラが仲間に入り、最初の1人は相棒になる', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3]);

    $this->getJson('/api/world')
        ->assertOk()
        ->assertJsonPath('new_companions.0.key', 'lumi')
        ->assertJsonPath('companions.0.key', 'lumi');

    expect($profile->fresh()->partner_companion_key)->toBe('lumi')
        ->and($profile->companions()->count())->toBe(1);
});

it('もう一度開いても、同じキャラは増えず、new_companions は空', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 3]);
    $this->getJson('/api/world')->assertOk();

    $this->getJson('/api/world')->assertOk()->assertJsonPath('new_companions', []);

    expect($profile->companions()->count())->toBe(1);
});

it('レベルが一度に何段も上がったら、届いた分がまとめて入る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 14]);

    $response = $this->getJson('/api/world')->assertOk();

    expect(collect($response->json('new_companions'))->pluck('key')->all())->toBe(['lumi', 'momo', 'kuru']);
});

it('畑で生まれた仲間をすでに持っていても、二重には入らない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 8]);
    $profile->companions()->create(['companion_key' => 'lumi', 'in_town' => true]);

    $response = $this->getJson('/api/world')->assertOk();

    expect(collect($response->json('new_companions'))->pluck('key')->all())->toBe(['momo'])
        ->and($profile->companions()->where('companion_key', 'lumi')->count())->toBe(1);
});

it('町が仲間でいっぱいなら、レベルで入った仲間はおうちで休む', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 23]);
    config(['companions.town_limit' => 2]);

    $this->getJson('/api/world')->assertOk();

    expect($profile->companions()->where('in_town', true)->count())->toBe(2)
        ->and($profile->companions()->where('in_town', false)->count())->toBe(3);
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/LevelCompanionsTest.php`
Expected: FAIL（`LevelCompanions` がない）

- [ ] **Step 3: `Garden` から入れる処理を取り出す**（`bloom` の仲間を入れる部分を `addCompanion` にして、`bloom` はそれを呼ぶ）

```php
    /** 町の人数の上限と、最初の相棒の決まりを守って仲間を入れる(畑・レベルの両方から呼ぶ) */
    public static function addCompanion(UserProfile $profile, string $key): void
    {
        // 町がいっぱいなら、おうちで休む(docs/design/2026-09-29-rare-spru-design.md 3-5)
        $inTown = $profile->companions()->where('in_town', true)->count() < config('companions.town_limit');
        $profile->companions()->firstOrCreate(['companion_key' => $key], ['in_town' => $inTown]);
        if ($profile->partner_companion_key === null) {
            // 最初の仲間は自動で相棒になる(C回、設計書3-1)
            $profile->partner_companion_key = $key;
            $profile->save();
        }
    }
```

`bloom` の中の該当部分を次に置き換える:

```php
        self::addCompanion($profile, $resultKey);

        return ['kind' => 'companion', ...collect(self::companions($profile))->firstWhere('key', $resultKey)];
```

- [ ] **Step 4: `LevelCompanions` を作る**

```php
<?php

namespace App\Support;

use App\Models\UserProfile;

/**
 * レベルで会える通常キャラ(docs/design/2026-10-08-town-growth-design.md 4-2)。
 * 届いたかどうかは今のレベルから決める。保存するのは仲間に入ったという記録(profile_companions)だけ
 */
class LevelCompanions
{
    /** 並びの何番目(0始まり)が会えるレベル */
    public static function levelFor(int $index): int
    {
        return config('companions.level_first') + config('companions.level_step') * $index;
    }

    /** @return list<string> 今のレベルまでに届いているキャラ */
    public static function due(UserProfile $profile): array
    {
        $due = [];
        foreach (config('companions.level_order') as $index => $key) {
            if ($profile->level >= self::levelFor($index)) {
                $due[] = $key;
            }
        }

        return $due;
    }

    /**
     * まだ持っていない届いたキャラを入れる。呼び出し側で、プロフィールをロックしてから呼ぶ。
     *
     * @return list<array<string, mixed>> 今回入ったキャラ(Garden::companions の1人分と同じ形)
     */
    public static function grantDue(UserProfile $profile): array
    {
        $have = $profile->companions()->pluck('companion_key')->all();
        $new = array_values(array_diff(self::due($profile), $have));
        foreach ($new as $key) {
            Garden::addCompanion($profile, $key);
        }
        if ($new === []) {
            return [];
        }

        return collect(Garden::companions($profile))->whereIn('key', $new)->sortBy(fn (array $c) => array_search($c['key'], $new, true))->values()->all();
    }
}
```

- [ ] **Step 5: `GET /api/world` で渡す**（`$newSeeds = RareSeeds::grantLocked($profile);` の次の行に足し、返す配列に `'new_companions'` を足す。`companions` は渡した後の状態になるよう、`grantDue` を `Garden::companions` より前に呼ぶ）

```php
        $newCompanions = DB::transaction(function () use ($profile) {
            $locked = UserProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();

            return LevelCompanions::grantDue($locked);
        });
```

```php
            'new_companions' => $newCompanions,
```

`routes/api.php` の先頭の `use` に `use App\Support\LevelCompanions;` を足す。

- [ ] **Step 6: 通ることを確かめる**

Run: `./vendor/bin/sail test tests/Feature/LevelCompanionsTest.php`
Expected: PASS

- [ ] **Step 7: 関連テスト（畑・仲間・町）を流す**

Run: `./vendor/bin/sail test --filter='Garden|Companion|Roster|RareSpru|FamilyTown'`
Expected: PASS（ここで落ちる既存テストは、仲間の数がレベルで変わったものなので、Task 3で畑の変更と合わせて直す）

- [ ] **Step 8: コミット**

```bash
git add app/Support/LevelCompanions.php app/Support/Garden.php routes/api.php tests/Feature/LevelCompanionsTest.php
git commit -m "#00535: feature(仲間): レベルで届いた通常キャラを町を開いたときに渡す"
```

---

### Task 3: 畑のふつうの種を「スプルの花」にする

**Files:**
- Modify: `app/Support/Garden.php`（`pickResult`）、`tests/Feature/GardenActionsTest.php`・`RareSpruGardenTest.php` ほか落ちたもの
- Test: `tests/Feature/GardenActionsTest.php`

**Interfaces:**
- Consumes: `config('companions.flower_result')`（`spru_flower`）
- Produces: `Garden::pickResult(UserProfile): string` はいつも `config('companions.flower_result')` を返す。

- [ ] **Step 1: 失敗するテストを足す**（`GardenActionsTest.php` の末尾）

```php
it('ふつうの種をまくと、いつも「スプルの花」の種になり、仲間は選ばれない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);

    $this->postJson('/api/world/garden/sow')->assertOk();

    expect($profile->seeds()->first()->result_key)->toBe('spru_flower');
});

it('ふつうの種を3回水やりすると、「スプルの花」がバッグに入る(仲間は生まれない)', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 4, 'bloom_base_level' => 1]);
    $this->postJson('/api/world/garden/sow')->assertOk();

    foreach ([0, 1, 2] as $day) {
        Carbon::setTestNow(Carbon::parse('2026-10-08 10:00', 'Asia/Tokyo')->addDays($day));
        $profile->update(['last_correct_on' => Garden::today()]);
        $response = $this->postJson('/api/world/garden/water')->assertOk();
    }

    $response->assertJsonPath('born.kind', 'item');
    expect($profile->companions()->count())->toBe(0)
        ->and($profile->worldItems()->count())->toBe(1);
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/GardenActionsTest.php`
Expected: FAIL（まだ仲間が選ばれる）

- [ ] **Step 3: `pickResult` を直す**

```php
    /**
     * ふつうの種が育つもの。仲間はレベルで会える形になったので、いつも「スプルの花」
     * (docs/design/2026-10-08-town-growth-design.md 4-3)
     */
    public static function pickResult(UserProfile $profile): string
    {
        return config('companions.flower_result');
    }
```

- [ ] **Step 4: 落ちる既存テストを直す**

Run: `./vendor/bin/sail test --filter='Garden|Companion|Roster|RareSpru|FamilyTown|PracticeAnswer|ErrandTest|ReviewTest'`
Expected: 仲間が生まれることを前提にしたテストが落ちる。それぞれ、仲間を `$profile->companions()->create([...])` で用意する形に直す（畑で生まれる前提の確認は、花になる確認に差し替える）。全部通るまで直す。

- [ ] **Step 5: コミット**

```bash
git add app/Support/Garden.php tests/Feature
git commit -m "#00536: feature(畑): ふつうの種は育つと「スプルの花」になる(仲間はレベルで会える)"
```

---

### Task 4: 領地を7区画（Lv5ごと）にする

**Files:**
- Modify: `config/world.php`（`land.plots`・目印・道）、`tests/Feature/WorldLandTest.php`・`WorldPlacementTest.php` ほか
- Modify: 設計書7章の「区画の大きさ」を確定に直す

**Interfaces:**
- Produces: `config('world.land.plots')` = 7区画（Lv1・5・10・15・20・25・30）。`WorldLand::width()/height()` が新しい地図の大きさになる。

> 区画の並べ方（下の表）は、今の12×12の「手前に広がる」形を延ばす案。大きさは `Owner` の確認（設計書7-1）で変わることがあり、そのときはこの表の数字だけを直す（他のコードは `plots` から計算するので変わらない）。

| 順 | key | name | x | y | w | h | min_level | ground |
|---|---|---|---:|---:|---:|---:|---:|---|
| 1 | town | はじまりの町 | 0 | 0 | 7 | 7 | 1 | grass |
| 2 | bamboo | 竹林 | 7 | 0 | 5 | 7 | 5 | bamboo |
| 3 | beach | 海辺 | 0 | 7 | 7 | 5 | 10 | sand |
| 4 | hill | 丘 | 7 | 7 | 5 | 5 | 15 | hill |
| 5 | river | 川辺 | 12 | 0 | 5 | 12 | 20 | grass |
| 6 | plateau | 高原 | 0 | 12 | 12 | 5 | 25 | hill |
| 7 | island | 離島 | 12 | 12 | 5 | 5 | 30 | sand |

（地図は17×17になる。置ける物のないままだと広すぎるので、区画5〜7の目印・道は絵が届いたときに足す。今回は道だけ、町から川辺・高原へ届く直線を足す。）

- [ ] **Step 1: 失敗するテストを書く**（`WorldLandTest.php`: 区画の開くレベルを新しい表に直し、7区画になることを確かめる）

```php
it('区画は7つで、Lv1・5・10・15・20・25・30で開く', function () {
    $plots = collect(config('world.land.plots'));

    expect($plots->pluck('key')->all())->toBe(['town', 'bamboo', 'beach', 'hill', 'river', 'plateau', 'island'])
        ->and($plots->pluck('min_level')->all())->toBe([1, 5, 10, 15, 20, 25, 30]);
});

it('区画は重ならず、地図は17×17', function () {
    $cells = [];
    foreach (config('world.land.plots') as $plot) {
        for ($x = $plot['x']; $x < $plot['x'] + $plot['w']; $x++) {
            for ($y = $plot['y']; $y < $plot['y'] + $plot['h']; $y++) {
                expect($cells["{$x},{$y}"] ?? null)->toBeNull();
                $cells["{$x},{$y}"] = $plot['key'];
            }
        }
    }

    expect(\App\Support\WorldLand::width())->toBe(17)
        ->and(\App\Support\WorldLand::height())->toBe(17);
});

it('Lv.4では竹林は雲の中で、Lv.5で開く', function () {
    expect(\App\Support\WorldLand::isOpen(8, 4, 4))->toBeFalse()
        ->and(\App\Support\WorldLand::isOpen(8, 4, 5))->toBeTrue();
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/WorldLandTest.php`
Expected: FAIL

- [ ] **Step 3: `config/world.php` の `plots` を上の表に書き換え、道を足す**（町から延びる道: 川辺へ `[12,3]`〜`[16,3]`、高原へ `[3,7]`〜`[3,16]`。海辺・丘の中を通る道も同じ直線上）

```php
        'paths' => [
            [3, 1], [3, 2],
            [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
            // 竹林へ続く町の道
            [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
            // 川辺へ続く道
            [12, 3], [13, 3], [14, 3], [15, 3], [16, 3],
            // 海辺・高原へ続く道
            [3, 7], [3, 8], [3, 9], [3, 10], [3, 11], [3, 12], [3, 13], [3, 14], [3, 15], [3, 16],
        ],
```

コメントの「今は12×12」も「17×17」に直す。

- [ ] **Step 4: 落ちる既存テストを直す**

Run: `./vendor/bin/sail test --filter='WorldLand|WorldPlacement|WorldRepair|WorldApi|WorldBuilding|FamilyTown|GardenState'`
Expected: Lv.4・7・10 を前提にしたテスト、12×12 を前提にしたテストが落ちる。新しい区画のレベル（5・10・15）と地図の大きさに直す。目印（桟橋 `pier` は海辺の中 (2,11)）の位置は変わらない。全部通るまで直す。

- [ ] **Step 5: 画面（フロント）の地図の大きさを確認**

Run: `cd frontend && npx vitest run src/components/world/land.test.ts src/components/world/map-view.test.ts`
Expected: PASS（地図の大きさはAPIの `land` から計算されるので、固定の12がないかも確認し、あれば直す: `grep -rn "12" src/components/world/land.ts src/components/world/map-view.ts`）

- [ ] **Step 6: 開発DBで `world:repair --dry-run` を流し、戻る物を確認してからコミット**

```bash
./vendor/bin/sail artisan world:repair --dry-run
git add config/world.php tests/Feature frontend docs/design/2026-10-08-town-growth-design.md
git commit -m "#00537: feature(町): 領地を7区画(Lv5ごと)にする"
```

---

### Task 5: 好きな名所を1つ選ぶ（サーバー）

**Files:**
- Create: `database/migrations/2026_10_10_000001_create_profile_gifts_table.php`、`app/Models/ProfileGift.php`、`app/Support/LevelGifts.php`
- Modify: `config/world.php`（`gifts`）、`app/Models/UserProfile.php`（`gifts()`）、`routes/api.php`
- Test: `tests/Feature/LevelGiftsTest.php`（新）

**Interfaces:**
- Produces:
  - `config('world.gifts')` = `['first' => 12, 'step' => 10, 'footprints' => [12 => 2, 22 => 3], 'max_footprint' => 4]`（Lv32以降は上限なし＝`max_footprint`）。
  - `LevelGifts::levels(int $level): list<int>` — 届いた回のレベル（12・22・32…。`first + step × k ≤ level`）。
  - `LevelGifts::pending(UserProfile): list<int>` — 届いたが選んでいない回。
  - `LevelGifts::candidates(int $giftLevel): Collection<ShopItem>` — その回で選べる名所（`type = decoration`、カテゴリ `landmark`、おみやげでない、売り物でないでない、大きさがその回の上限以下）。
  - `LevelGifts::choose(UserProfile $profile, int $giftLevel, int $shopItemId): ProfileWorldItem` — 選んでバッグへ。エラーは422。
  - `GET /api/world/gifts` → `{ pending: [{level, candidates: [{shop_item_id, name, asset_key, footprint}]}] }`、`POST /api/world/gifts/{level}`（本文 `shop_item_id`）→ `{ item: <toWorldArray> }`。

- [ ] **Step 1: 失敗するテストを書く**

```php
<?php

use App\Models\ShopItem;
use App\Support\LevelGifts;

/*
|--------------------------------------------------------------------------
| 好きな名所を1つ選ぶ(docs/design/2026-10-08-town-growth-design.md 4-4)
|--------------------------------------------------------------------------
*/

function landmarkItem(string $name, string $assetKey, int $minLevel = 10): ShopItem
{
    return ShopItem::create([
        'type' => 'decoration', 'name' => $name, 'price' => 600, 'currency' => 'point',
        'min_level' => $minLevel, 'meta' => ['asset_key' => $assetKey],
    ]);
}

it('選べる回は Lv12・22・32…', function (int $level, array $expected) {
    expect(LevelGifts::levels($level))->toBe($expected);
})->with([
    'Lv11' => [11, []],
    'Lv12' => [12, [12]],
    'Lv21' => [21, [12]],
    'Lv22' => [22, [12, 22]],
    'Lv32' => [32, [12, 22, 32]],
]);

it('Lv12の候補は2×2までの名所、Lv22は3×3も、Lv32はすべて', function () {
    landmarkItem('金閣寺', 'kinkakuji');
    landmarkItem('お城', 'castle', 20);
    landmarkItem('噴水', 'fountain'); // 名所ではない(decor)

    expect(LevelGifts::candidates(12)->pluck('name')->all())->toBe(['金閣寺'])
        ->and(LevelGifts::candidates(22)->pluck('name')->sort()->values()->all())->toBe(['お城', '金閣寺'])
        ->and(LevelGifts::candidates(32)->pluck('name')->sort()->values()->all())->toBe(['お城', '金閣寺']);
});

it('届いた回の名所をえらぶと、ポイントを使わずバッグに入る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12, 'points' => 5]);
    $item = landmarkItem('金閣寺', 'kinkakuji');

    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $item->id])
        ->assertOk()
        ->assertJsonPath('item.name', '金閣寺');

    expect($profile->fresh()->points)->toBe(5)
        ->and($profile->worldItems()->count())->toBe(1)
        ->and($profile->worldItems()->first()->x)->toBeNull();
});

it('レベルが足りない回は選べない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 11]);
    $item = landmarkItem('金閣寺', 'kinkakuji');

    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $item->id])->assertStatus(422);
});

it('候補にない物は選べない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12]);
    $castle = landmarkItem('お城', 'castle', 20); // Lv12の候補は2×2まで

    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $castle->id])->assertStatus(422);
});

it('同じ回は1回しか選べない', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12]);
    $item = landmarkItem('金閣寺', 'kinkakuji');
    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $item->id])->assertOk();

    $this->postJson('/api/world/gifts/12', ['shop_item_id' => $item->id])->assertStatus(422);

    expect($profile->worldItems()->count())->toBe(1);
});

it('あとで選べる: 届いて選んでいない回が一覧に出る', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 22]);
    landmarkItem('金閣寺', 'kinkakuji');
    $this->postJson('/api/world/gifts/12', ['shop_item_id' => ShopItem::first()->id])->assertOk();

    $this->getJson('/api/world/gifts')
        ->assertOk()
        ->assertJsonCount(1, 'pending')
        ->assertJsonPath('pending.0.level', 22);
});

it('町を開くと、選べる回があることがわかる', function () {
    $profile = createActiveProfile();
    $profile->update(['level' => 12]);

    $this->getJson('/api/world')->assertOk()->assertJsonPath('gifts_pending', [12]);
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `./vendor/bin/sail test tests/Feature/LevelGiftsTest.php`
Expected: FAIL

- [ ] **Step 3: マイグレーションとモデル**

```php
Schema::create('profile_gifts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
    $table->unsignedInteger('level');
    $table->foreignId('shop_item_id')->constrained();
    $table->timestamps();
    $table->unique(['user_profile_id', 'level']);
});
```

```php
class ProfileGift extends Model
{
    protected $fillable = ['user_profile_id', 'level', 'shop_item_id'];
}
```

`UserProfile` に `gifts(): HasMany`（`ProfileGift::class`）を足す。

- [ ] **Step 4: 設定と `LevelGifts`**

`config/world.php` に:

```php
    /*
    | 好きな名所を1つ選ぶ回(docs/design/2026-10-08-town-growth-design.md 4-4)。first から step おき(12・22・32…)。
    | footprints は、その回までに選べる大きさの上限(書いていない回は max_footprint)
    */
    'gifts' => ['first' => 12, 'step' => 10, 'footprints' => [12 => 2, 22 => 3], 'max_footprint' => 4],
```

```php
<?php

namespace App\Support;

use App\Models\ProfileWorldItem;
use App\Models\ShopItem;
use App\Models\UserProfile;
use Illuminate\Support\Collection;

/** 好きな名所を1つ選ぶ(docs/design/2026-10-08-town-growth-design.md 4-4) */
class LevelGifts
{
    /** @return list<int> 今のレベルまでに届いた回 */
    public static function levels(int $level): array
    {
        $gifts = config('world.gifts');
        $levels = [];
        for ($l = $gifts['first']; $l <= $level; $l += $gifts['step']) {
            $levels[] = $l;
        }

        return $levels;
    }

    /** @return list<int> 届いたが、まだ選んでいない回 */
    public static function pending(UserProfile $profile): array
    {
        $chosen = $profile->gifts()->pluck('level')->all();

        return array_values(array_diff(self::levels($profile->level), $chosen));
    }

    public static function maxFootprint(int $giftLevel): int
    {
        $gifts = config('world.gifts');

        return $gifts['footprints'][$giftLevel] ?? $gifts['max_footprint'];
    }

    /** @return Collection<int, ShopItem> */
    public static function candidates(int $giftLevel): Collection
    {
        $max = self::maxFootprint($giftLevel);

        return ShopItem::query()->where('type', 'decoration')->orderBy('id')->get()
            ->filter(fn (ShopItem $item) => $item->category() === 'landmark'
                && ! ($item->meta['not_for_sale'] ?? false)
                && $item->footprint() <= $max)
            ->values();
    }

    /** 呼び出し側で、プロフィールをロックしてから呼ぶ */
    public static function choose(UserProfile $profile, int $giftLevel, int $shopItemId): ProfileWorldItem
    {
        abort_unless(in_array($giftLevel, self::levels($profile->level), true), 422, 'まだ選べないよ');
        abort_if($profile->gifts()->where('level', $giftLevel)->exists(), 422, 'もう選んだよ');
        $item = self::candidates($giftLevel)->firstWhere('id', $shopItemId);
        abort_if($item === null, 422, 'この中から選んでね');

        $profile->gifts()->create(['level' => $giftLevel, 'shop_item_id' => $item->id]);

        return $profile->worldItems()->create(['shop_item_id' => $item->id])->load('shopItem');
    }
}
```

- [ ] **Step 5: ルートを足す**（`world` グループの中。`use App\Support\LevelGifts;` を足す。`GET /` の返り値に `'gifts_pending' => LevelGifts::pending($profile)` を足す）

```php
    Route::get('/gifts', function (Request $request) {
        $profile = ActiveProfile::require($request);

        return ['pending' => collect(LevelGifts::pending($profile))->map(fn (int $level) => [
            'level' => $level,
            'candidates' => LevelGifts::candidates($level)->map(fn ($item) => [
                'shop_item_id' => $item->id,
                'name' => $item->name,
                'asset_key' => $item->assetKey(),
                'footprint' => $item->footprint(),
            ])->values(),
        ])->values()];
    })->name('gifts.index');

    Route::post('/gifts/{level}', function (Request $request, int $level) {
        $activeProfile = ActiveProfile::require($request);
        $data = $request->validate(['shop_item_id' => ['required', 'integer']]);

        return DB::transaction(function () use ($activeProfile, $level, $data) {
            $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

            return ['item' => LevelGifts::choose($profile, $level, $data['shop_item_id'])->toWorldArray()];
        });
    })->name('gifts.choose');
```

- [ ] **Step 6: 通ることを確かめる**

Run: `./vendor/bin/sail test tests/Feature/LevelGiftsTest.php`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add database/migrations app/Models app/Support/LevelGifts.php config/world.php routes/api.php tests/Feature/LevelGiftsTest.php
git commit -m "#00538: feature(ごほうび): Lv12・22・32で名所を好きな1つ選べる(サーバー)"
```

---

### Task 6: 画面（新しい仲間の知らせ・名所を選ぶ画面）

**Files:**
- Modify: `frontend/src/components/world/types.ts`（`new_companions`・`gifts_pending`・`GiftChoice` の型）
- Create: `frontend/src/components/world/companion-gift.tsx`・`frontend/src/components/world/gift-picker.tsx`・`frontend/src/components/world/gifts.ts`（型と、選ぶ画面の文言・並べ替えの純粋な関数）
- Test: `frontend/src/components/world/gifts.test.ts`（新）
- Modify: `frontend/src/components/world/world-screen.tsx`

**Interfaces:**
- Consumes: Task 2・5 のAPI（`new_companions`・`gifts_pending`・`GET/POST /api/world/gifts`）
- Produces（`gifts.ts`）:
  - `type GiftCandidate = { shop_item_id: number; name: string; asset_key: string | null; footprint: number }`
  - `type PendingGift = { level: number; candidates: GiftCandidate[] }`
  - `giftTitle(level: number): string` → `` `Lv.${level}のごほうび` ``
  - `giftLine(): string` → `"すきな名所を1つ えらべるよ"`
  - `sizeLabel(footprint: number): string` → `"2×2"` のような大きさの文字。

- [ ] **Step 1: 失敗するテストを書く**（`gifts.test.ts`）

```ts
import { describe, expect, it } from "vitest";

import { giftLine, giftTitle, sizeLabel } from "./gifts";

describe("ごほうびの文言", () => {
  it("タイトルにレベルが入る", () => {
    expect(giftTitle(12)).toBe("Lv.12のごほうび");
  });

  it("説明は、1つえらべることを伝える", () => {
    expect(giftLine()).toBe("すきな名所を1つ えらべるよ");
  });

  it("大きさは N×N", () => {
    expect(sizeLabel(2)).toBe("2×2");
    expect(sizeLabel(3)).toBe("3×3");
  });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `cd frontend && npx vitest run src/components/world/gifts.test.ts`
Expected: FAIL

- [ ] **Step 3: `gifts.ts` を作る**

```ts
export type GiftCandidate = { shop_item_id: number; name: string; asset_key: string | null; footprint: number };
export type PendingGift = { level: number; candidates: GiftCandidate[] };

export function giftTitle(level: number): string {
  return `Lv.${level}のごほうび`;
}

export function giftLine(): string {
  return "すきな名所を1つ えらべるよ";
}

export function sizeLabel(footprint: number): string {
  return `${footprint}×${footprint}`;
}
```

- [ ] **Step 4: 画面を作る**
  - `companion-gift.tsx`: `BornOverlay`（`born-overlay.tsx`）と同じ作りで、`new_companions` の1人目から順に「新しい仲間が来たよ！ ○○」を出す。閉じると次の人。人数分を出し終えたら閉じる。
  - `gift-picker.tsx`: `SeedGift`・`SeedPicker` と同じシートの作りで、`gifts_pending` があるときに町の画面の「ごほうび」ボタン（バッグのボタンの隣）から開く。候補をカード（絵・名前・大きさ）で並べ、1つ押して［これにする］で `POST /api/world/gifts/{level}`。成功したら、バッグに入ったことを伝えて、残りがあれば次の回へ。
  - `world-screen.tsx`: `GET /api/world` の返り値から `new_companions` を `CompanionGift` に、`gifts_pending` を ごほうびボタンの点（「選べるよ」）に使う。ほかの演出（あいさつ・季節・特別な種）が出ている間は出さない（`calm` の条件に合わせる）。

- [ ] **Step 5: 通ることを確かめる**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src/components/world`
Expected: PASS（エラーなし）

- [ ] **Step 6: ブラウザで確認**（スマホ幅375px）
  - 検証用のプロフィールを作り、レベルを3・8・14・22に変えて、町を開く。仲間の知らせ・ごほうびボタン・選ぶ画面・バッグに入ることを確かめる。確認後、検証用のプロフィールを消す。

- [ ] **Step 7: コミット**

```bash
git add frontend
git commit -m "#00539: feature(ごほうび): 新しい仲間の知らせと、名所を選ぶ画面"
```

---

### Task 7: 全体の確認とドキュメント

**Files:**
- Modify: `SPEC.md`・`TASKS.md`・設計書のステータス（実装済みに）

- [ ] **Step 1: サーバーの全テストを1つだけ流す**

Run: `./vendor/bin/sail test`
Expected: PASS（落ちたものは、原因を確かめて直す）

- [ ] **Step 2: フロントの全体確認**

Run: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint .`
Expected: PASS

- [ ] **Step 3: `SPEC.md`・`TASKS.md` を更新**
  - SPEC: 領地（7区画・Lv5ごと）、通常キャラのレベルで会える決まり、畑のふつうの種→「スプルの花」、好きな名所（Lv12・22・32）。
  - TASKS: 完了を付ける。残りを足す: LaviとSakuの透過の絵・セリフ・並びへの追加、区画の絵と道の部品（ChatGPT）、領地5〜7の目印・道、Lv30以降（第二マップ）。

- [ ] **Step 4: 自分で見直す**（設計書の4章・7章を1つずつ照らし合わせる。Review Focus の5つのテストが入っているかを確かめる）

- [ ] **Step 5: コミットして、`main` にマージする前にOwnerに知らせる**

```bash
git add SPEC.md TASKS.md docs
git commit -m "#00540: docs(町): 町の広がりとごほうびをSPECとTASKSに書く"
```
