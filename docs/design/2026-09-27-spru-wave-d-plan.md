# 今日のおつかい・町のにぎやか度・家族の町（D回）— 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**ゴール:** 毎日3つの「今日のおつかい」（やりとげると学習ポイント）、置いたアイテムと仲間で変わる「町のにぎやか度」（5段階の飾り）、同じ家族のほかのプレイヤーの町を見に行ってあいさつできる「家族の町」、期間限定の衣装のスプルの「季節のあいさつ」を作る。

**アーキテクチャ:** サーバー（Laravel）は「その日のおつかい」（`profile_errands`）と「あいさつ」（`profile_greetings`）だけを新しく持つ。おつかいの進み具合は保存せず、今ある記録（答えの記録・水やりの日・復習の日・配置の更新時刻・あいさつ）から数える（`app/Support/Errands.php`）。家族の町は、同じ `user_schema_id` のプロフィールだけを「見るだけ」の形で返す（`app/Support/Family.php`）。にぎやか度は見た目だけに使うので、画面側で置いたアイテムと仲間から計算する（`components/world/liveliness.ts`）。家族の町の絵は、町の絵（`WorldScene`）に `readOnly` を足して使い回す。リュックのスプル（mascot-7）と衣装（mascot-8）は、今ある切り抜きの道具に素材集として足す。

**技術スタック:** Laravel 13（Sail）/ Pest / MySQL、Next.js 16.2.10 / React 19 / TypeScript / Tailwind CSS / Vitest、Python 3 + Pillow（切り抜きの道具）

**設計書:** `docs/design/2026-09-27-spru-wave-d-design.md`（必ず併せて読むこと）

## 全体の制約

- 既存のバックエンドテスト（226件）とフロントのテスト（86件）はすべて通ること
- DBの更新は `./vendor/bin/sail artisan migrate`（壊さない更新）だけを使う。`migrate:fresh` は使わない
- コインで回すガチャ・コインで育つのを早める機能は作らない。あいさつ・にぎやか度にごほうびは付けない
- おつかいの名前・ひとこと・ごほうびの額、にぎやか度の数え方と段階、季節のあいさつの期間と文、あいさつのことば、422のメッセージは設計書3〜5章の文言・数値どおり
- 回答API・水やり・種まき・復習・配置のAPIの動きは変えない（おつかいは記録を読むだけ）
- 家族の町は同じ家族アカウント（同じ `user_schema_id`）の中だけ。ほかの家族のプロフィールは404
- 画面に確認用の隠し機能を作らない。時刻はテスト用ブラウザの時計（Playwrightの `page.clock`）、日付や記録は開発DBを `tinker` で調整して確かめ、確認後に元へ戻す。Playwrightで通信を書き換える（route で CORS・Origin を変える）ことはしない
- ESLint（`react-hooks`）の規則: 描画中にrefの `.current` を読まない、effectの中で直接setStateしない（setInterval・setTimeout・非同期のコールバックの中はよい）。`Date.now()`・`Math.random()` を呼ぶ関数は、それを呼び出す関数より上に書く
- 1秒ごとに描き直す画面（町・家族の町）から、タイマーを持つ部品に渡す関数は `useCallback` で固定する（描き直すたびにタイマーがやり直しにならないように）
- 新しいUIのアイコンに絵文字を使わない（lucideの `Backpack`・`HouseHeart`・`ChevronRight`、★☆は文字）。ドキュメント・コメントは日本語、コメントは「なぜ」が必要なときだけ1行
- `localStorage` の読み書きは必ず try/catch で囲み、読めなくても画面が動くようにする（季節のあいさつの「今日はもう出した」だけに使う）
- コミットは `#NNNNN: type:summary`（`git log --oneline -1` の番号+1）＋末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 作業ブランチは `feature/spru-wave-d`（作成済み）
- 開発サーバーはポート3000（すでに動いていれば新しく起動しない）。テスト用ログイン: `test@example.com` / `password`、プロフィール「町テスト」。スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` にだけ保存し、確認後に消す

## レビューで特に見る点

1. **0時をまたいで町を開いたまま［受け取る］**: 「まだおつかいが終わっていないよ」が出てカードが閉じ、新しい日のおつかいに入れ替わること（前の日のおつかいが残らない）（Task 8のブラウザ確認）
2. **［受け取る］を素早く2回押す**: ポイントは+20が1回だけで、受け取りの場面も1回だけ出ること（Task 5の押している間の止め方、Task 8のブラウザ確認）
3. **にぎやか度のお祝いが出る・出ない**: 町を開いたとき・置いてあるアイテムを動かしただけ・しまったときには出ず、置いて段階が上がったときと、仲間が生まれて段階が上がったときだけ出ること（Task 6、Task 8のブラウザ確認）
4. **お知らせが重なる日**: はじめてのプレゼント・家族のあいさつ・季節のあいさつが同じ日に来ても、この順に1つずつ出て重ならないこと（Task 6、Task 8のブラウザ確認）
5. **スマホ幅（390px）で崩れない**: 町のボタン3つ（「おつかい 3/3」＋「！」、「にぎやか度 ★★★★★」、「家族の町」）が1行に収まり、ふりがなを出しても崩れないこと。家族の町の8文字の名前の見出しとあいさつのボタンも崩れないこと（Task 8のブラウザ確認）

## ファイル構成

**サーバー（リポジトリ直下）**
- 作成: `app/Support/Family.php` — 家族のほかのプロフィール・見るだけの町・あいさつ
- 作成: `app/Support/Errands.php` — 今日のおつかいを決める・進み具合を数える・ごほうびを渡す
- 作成: `app/Models/ProfileGreeting.php`・`app/Models/ProfileErrand.php`
- 作成: `database/migrations/2026_09_27_000009_create_profile_greetings_table.php`・`2026_09_27_000010_create_profile_errands_table.php`
- 変更: `app/Models/UserProfile.php`（関連3つ）、`config/world.php`（`greeting_stamps`・`greetings_shown`・`errands`）、`routes/api.php`（町のAPI・家族・あいさつ・おつかい）
- テスト: 作成 `tests/Feature/FamilyTownTest.php`・`tests/Feature/ErrandTest.php`、変更 `tests/Pest.php`（`createFamilyMember`）

**素材**
- 変更: `tools/spru-assets/crops.json`（mascot-7・mascot-8）、`tools/spru-assets/extract.py`（`outing`・`costumes`）
- 作成（道具が書き出す）: `frontend/public/spru/outing/*.webp`・`frontend/public/spru/costumes/*.webp`、変更 `frontend/src/components/spru/spru-assets.ts`

**フロントエンド（`frontend/src/`）**
- 作成: `components/world/errands.ts`・`errands.test.ts` — おつかいの名前・ひとこと・進み具合・行き先・スプルのひとことの優先順
- 作成: `components/world/liveliness.ts`・`liveliness.test.ts` — にぎやか度の計算・段階・表示
- 作成: `components/world/season-greeting.ts`・`season-greeting.test.ts` — 季節のあいさつの期間・1日1回の記録
- 作成: `lib/motion.ts` — 動きを減らす設定
- 作成: `components/spru/outing-image.tsx` — リュックのスプルと衣装のスプルの絵
- 作成: `components/world/town-buttons.tsx`・`errand-sheet.tsx`・`errand-return.tsx`・`liveliness-card.tsx`・`festive.tsx`・`season-greeting-card.tsx`・`greetings-card.tsx`
- 作成: `app/family/page.tsx`・`app/family/[profileId]/page.tsx`、`components/family/family-town.tsx`・`greet-panel.tsx`・`outing-scene.tsx`
- 変更: `components/world/types.ts`・`world-scene.tsx`（`readOnly`）・`world-screen.tsx`、`app/globals.css`（動き）

**ドキュメント**
- 変更: `SPEC.md`・`TASKS.md`・`docs/design/2026-09-27-spru-wave-d-design.md`（計画で決めたことの反映）、`../../company/mascot/CLAUDE.md`（追記のみ）

---

### Task 1: 家族の町とあいさつ（サーバー）

**Files:**
- Create: `database/migrations/2026_09_27_000009_create_profile_greetings_table.php`、`app/Models/ProfileGreeting.php`、`app/Support/Family.php`
- Modify: `app/Models/UserProfile.php`（関連）、`config/world.php`（末尾）、`routes/api.php`（`use`・町のAPI・`world` のグループ・新しい `family` のグループ）、`tests/Pest.php`（`createFamilyMember`）
- Test: `tests/Feature/FamilyTownTest.php`

**Interfaces:**
- Produces:
  - テーブル `profile_greetings`（`from_profile_id`・`to_profile_id`・`stamp`・`greeted_on`・`seen_at`、一意 `from_profile_id`＋`to_profile_id`＋`greeted_on`）
  - `UserProfile::sentGreetings(): HasMany`・`UserProfile::receivedGreetings(): HasMany`
  - 設定 `world.greeting_stamps`（`hello`・`nice_town`・`cheer` => ことば）、`world.greetings_shown`（10）
  - `Family::others(UserProfile $p): Collection<UserProfile>`、`Family::member(UserProfile $me, UserProfile $other): UserProfile`（ほかの家族404・自分422）、`Family::greetedToday(UserProfile $from, UserProfile $to): bool`、`Family::list(UserProfile $me): array`、`Family::town(UserProfile $viewer, UserProfile $other): array`、`Family::greet(UserProfile $from, UserProfile $to, string $stamp): void`、`Family::unseenGreetings(UserProfile $p): array`、`Family::markSeen(UserProfile $p, array $ids): void`
  - API: `GET /api/family`、`GET /api/family/{profile}`、`POST /api/family/{profile}/greet`、`POST /api/world/greetings/seen`、`GET /api/world` の `greetings`・`family_count`
  - テストの共通関数 `createFamilyMember(UserProfile $profile, string $name = '家族のだれか'): UserProfile`

- [ ] **Step 1: 共通のテスト関数を足す**

`tests/Pest.php` の `use` に `use App\Models\UserSchema;` を足し、`createActiveProfile()` のすぐ後に次を足す（`UserProfile::schema()` は外部キー名の指定が無く使えないため、`UserSchema` から作る）:

```php
/** 同じ家族アカウントに、もう1人のプレイヤーを作る(家族の町・おつかいのテストで使う) */
function createFamilyMember(UserProfile $profile, string $name = '家族のだれか'): UserProfile
{
    return UserSchema::findOrFail($profile->user_schema_id)->profiles()->create(['name' => $name]);
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/Feature/FamilyTownTest.php`:

```php
<?php

use App\Models\ProfileGreeting;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Carbon;

/*
|--------------------------------------------------------------------------
| 家族の町とあいさつ(docs/design/2026-09-27-spru-wave-d-design.md 3-4)
|--------------------------------------------------------------------------
|
| 同じ家族アカウントのほかのプレイヤーの町を「見るだけ」で見に行き、
| 決まったことばで1人に1日1回あいさつを送れる。
|
*/

function createOtherFamilyProfile(): UserProfile
{
    $user = User::factory()->create();

    return $user->schema()->create(['name' => 'よその家族'])->profiles()->create(['name' => 'よその子']);
}

/** 同じログインのまま、選んでいるプロフィールを替える */
function actAsProfile(UserProfile $profile): void
{
    test()->withSession(['active_profile_id' => $profile->id]);
}

it('家族の一覧は、同じ家族の自分以外を作った順に出す', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $brother = createFamilyMember($me, 'おにいちゃん');
    createOtherFamilyProfile();

    $this->getJson('/api/family')->assertOk()->assertExactJson([
        ['id' => $sister->id, 'name' => 'いもうと', 'level' => 1, 'greeted_today' => false],
        ['id' => $brother->id, 'name' => 'おにいちゃん', 'level' => 1, 'greeted_today' => false],
    ]);
});

it('町のAPIに、家族のほかのプレイヤーの数が出る', function () {
    $me = createActiveProfile();
    $this->getJson('/api/world')->assertJsonPath('family_count', 0);

    createFamilyMember($me);

    $this->getJson('/api/world')->assertJsonPath('family_count', 1);
});

it('家族の町は、置いたアイテム・仲間・スプル・畑の見た目だけを見せる', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    $sister->update(['level' => 5, 'bloom_base_level' => 4, 'points' => 500]);
    $bench = createDecoration();
    $placed = $sister->worldItems()->create(['shop_item_id' => $bench->id, 'x' => 5, 'y' => 5]);
    $sister->worldItems()->create(['shop_item_id' => $bench->id]);
    $sister->seeds()->create(['result_key' => 'momo', 'waterings' => 1]);
    $sister->companions()->create(['companion_key' => 'lumi', 'nickname' => 'ピカ']);
    $sister->update(['partner_companion_key' => 'lumi']);

    $response = $this->getJson("/api/family/{$sister->id}")->assertOk()
        ->assertJsonPath('profile', ['id' => $sister->id, 'name' => 'いもうと', 'level' => 5])
        ->assertJsonCount(1, 'items')
        ->assertJsonPath('items.0.id', $placed->id)
        ->assertJsonPath('spru.growth', 1)
        ->assertJsonPath('garden', ['x' => 1, 'y' => 2, 'state' => 'sprout'])
        ->assertJsonPath('companions.0.name', 'ピカ')
        ->assertJsonPath('companions.0.is_partner', true)
        ->assertJsonPath('land.size', 7)
        ->assertJsonPath('greeted_today', false);

    expect(array_keys($response->json()))->toEqualCanonicalizing(['profile', 'land', 'items', 'spru', 'garden', 'companions', 'greeted_today'])
        ->and($response->getContent())->not->toContain('momo');
});

it('ほかの家族の町は見つからず、自分の町は開けない', function () {
    $me = createActiveProfile();
    $other = createOtherFamilyProfile();

    $this->getJson("/api/family/{$other->id}")->assertNotFound();
    $this->getJson("/api/family/{$me->id}")->assertStatus(422)->assertJsonPath('message', '自分の町だよ');
    $this->getJson('/api/family/999999')->assertNotFound();
});

it('あいさつは1人に1日1回で、送ると一覧と町に印が付く', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);

    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk()->assertJsonPath('greeted_today', true);
    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'cheer'])
        ->assertStatus(422)
        ->assertJsonPath('message', '今日はもうあいさつしたよ');

    $this->getJson('/api/family')->assertJsonPath('0.greeted_today', true);
    $this->getJson("/api/family/{$sister->id}")->assertJsonPath('greeted_today', true);
    expect(ProfileGreeting::query()->count())->toBe(1);
});

it('あいさつは日本時間の0時を過ぎると、また送れる', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);

    $this->travelTo(Carbon::parse('2026-09-27 14:59:00', 'UTC')); // 日本時間 23:59
    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk();

    $this->travelTo(Carbon::parse('2026-09-27 15:00:00', 'UTC')); // 日本時間 翌日の0:00
    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk();
});

it('決まったことば以外・自分宛て・ほかの家族へは送れない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    $other = createOtherFamilyProfile();

    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'こんにちは'])->assertStatus(422);
    $this->postJson("/api/family/{$sister->id}/greet", [])->assertStatus(422);
    $this->postJson("/api/family/{$me->id}/greet", ['stamp' => 'hello'])->assertStatus(422);
    $this->postJson("/api/family/{$other->id}/greet", ['stamp' => 'hello'])->assertNotFound();

    expect(ProfileGreeting::query()->count())->toBe(0);
});

it('届いたあいさつは受け取った人の町のAPIに出て、見た印を付けると出なくなる', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me, 'いもうと');
    actAsProfile($sister);
    $this->postJson("/api/family/{$me->id}/greet", ['stamp' => 'nice_town'])->assertOk();

    actAsProfile($me);
    $greeting = $this->getJson('/api/world')->assertJsonCount(1, 'greetings')->json('greetings.0');
    expect($greeting)->toMatchArray([
        'from' => ['id' => $sister->id, 'name' => 'いもうと'],
        'stamp' => 'nice_town',
        'text' => 'すてきな町だね！',
    ]);

    $this->postJson('/api/world/greetings/seen', ['ids' => [$greeting['id']]])->assertOk()->assertJsonPath('greetings', []);
    $this->getJson('/api/world')->assertJsonPath('greetings', []);
});

it('ほかの人宛てのあいさつには、見た印を付けられない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk();
    $greeting = ProfileGreeting::query()->firstOrFail();

    $this->postJson('/api/world/greetings/seen', ['ids' => [$greeting->id]])->assertOk();

    expect($greeting->fresh()->seen_at)->toBeNull();
});

it('町のAPIに出すあいさつは、新しい順に10件まで', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    foreach (range(1, 12) as $day) {
        ProfileGreeting::create([
            'from_profile_id' => $sister->id,
            'to_profile_id' => $me->id,
            'stamp' => 'hello',
            'greeted_on' => sprintf('2026-09-%02d', $day),
        ]);
    }

    $greetings = $this->getJson('/api/world')->assertJsonCount(10, 'greetings')->json('greetings');

    expect($greetings[0]['greeted_on'])->toBe('2026-09-12');
});
```

- [ ] **Step 3: テストが失敗することを確かめる**

Run: `./vendor/bin/sail artisan test --filter=FamilyTownTest`
Expected: FAIL（`Class "App\Models\ProfileGreeting" not found`、または `/api/family` が404）

- [ ] **Step 4: テーブルとモデルを作る**

`database/migrations/2026_09_27_000009_create_profile_greetings_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_greetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_profile_id')->constrained('user_profiles')->cascadeOnDelete();
            $table->foreignId('to_profile_id')->constrained('user_profiles')->cascadeOnDelete();
            $table->string('stamp', 16);
            $table->date('greeted_on');
            $table->timestamp('seen_at')->nullable();
            $table->timestamps();

            // 送る人と受け取る人の組み合わせで1日1回(同時に送っても1回だけになる)
            $table->unique(['from_profile_id', 'to_profile_id', 'greeted_on']);
            $table->index(['to_profile_id', 'seen_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_greetings');
    }
};
```

`app/Models/ProfileGreeting.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileGreeting extends Model
{
    protected $fillable = ['from_profile_id', 'to_profile_id', 'stamp', 'greeted_on', 'seen_at'];

    protected function casts(): array
    {
        return [
            'greeted_on' => 'date',
            'seen_at' => 'datetime',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'from_profile_id');
    }
}
```

`app/Models/UserProfile.php` の `companions()` の後に足す:

```php
    public function sentGreetings(): HasMany
    {
        return $this->hasMany(ProfileGreeting::class, 'from_profile_id');
    }

    public function receivedGreetings(): HasMany
    {
        return $this->hasMany(ProfileGreeting::class, 'to_profile_id');
    }
```

`config/world.php` の `companion_spots` の後（配列の最後）に足す:

```php

    /*
    | 家族の町のあいさつ。自由には書けず、この3つから選ぶ(docs/design/2026-09-27-spru-wave-d-design.md 3-4)。
    | 画面の components/family/greet-panel.tsx と必ず一致させる
    */

    'greeting_stamps' => [
        'hello' => 'やっほー！',
        'nice_town' => 'すてきな町だね！',
        'cheer' => 'いっしょにがんばろう！',
    ],

    // 町を開いたときに出す、まだ見ていないあいさつの数の上限
    'greetings_shown' => 10,
```

- [ ] **Step 5: `Family` を作る**

`app/Support/Family.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfileGreeting;
use App\Models\UserProfile;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;

/**
 * 家族の町とあいさつ(docs/design/2026-09-27-spru-wave-d-design.md 3-4)。
 * 見られるのは同じ家族アカウント(同じ user_schema_id)のほかのプロフィールだけ。
 */
class Family
{
    /** @return Collection<int, UserProfile> 同じ家族の自分以外(作った順) */
    public static function others(UserProfile $profile): Collection
    {
        return UserProfile::query()
            ->where('user_schema_id', $profile->user_schema_id)
            ->whereKeyNot($profile->id)
            ->orderBy('id')
            ->get();
    }

    /** 同じ家族のほかのプロフィールか確かめる。ほかの家族は404、自分は422 */
    public static function member(UserProfile $profile, UserProfile $other): UserProfile
    {
        abort_unless($other->user_schema_id === $profile->user_schema_id, 404);
        abort_if($other->id === $profile->id, 422, '自分の町だよ');

        return $other;
    }

    public static function greetedToday(UserProfile $from, UserProfile $to): bool
    {
        return $from->sentGreetings()->where('to_profile_id', $to->id)->where('greeted_on', Garden::today())->exists();
    }

    /** @return list<array{id: int, name: string, level: int, greeted_today: bool}> */
    public static function list(UserProfile $profile): array
    {
        $greeted = $profile->sentGreetings()
            ->where('greeted_on', Garden::today())
            ->pluck('to_profile_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return self::others($profile)->map(fn (UserProfile $other) => [
            'id' => $other->id,
            'name' => $other->name,
            'level' => $other->level,
            'greeted_today' => in_array($other->id, $greeted, true),
        ])->all();
    }

    /** その人の町を「見るだけ」の形で返す。ポイント・HP・バッグ・おつかいなどは出さない */
    public static function town(UserProfile $viewer, UserProfile $other): array
    {
        $garden = Garden::state($other);

        return [
            'profile' => ['id' => $other->id, 'name' => $other->name, 'level' => $other->level],
            'land' => WorldLand::toArray(),
            'items' => $other->worldItems()->with('shopItem')->whereNotNull('x')->whereNotNull('y')->orderBy('id')->get()
                ->map->toWorldArray()->values()->all(),
            'spru' => ['growth' => Garden::growth($other)],
            'garden' => ['x' => $garden['x'], 'y' => $garden['y'], 'state' => $garden['state']],
            'companions' => Garden::companions($other),
            'greeted_today' => self::greetedToday($viewer, $other),
        ];
    }

    public static function greet(UserProfile $from, UserProfile $to, string $stamp): void
    {
        abort_unless(array_key_exists($stamp, config('world.greeting_stamps')), 422, 'そのことばは送れないよ');
        abort_if(self::greetedToday($from, $to), 422, '今日はもうあいさつしたよ');

        try {
            $from->sentGreetings()->create(['to_profile_id' => $to->id, 'stamp' => $stamp, 'greeted_on' => Garden::today()]);
        } catch (UniqueConstraintViolationException) {
            // 同時に2回送られたとき
            abort(422, '今日はもうあいさつしたよ');
        }
    }

    /** @return list<array{id: int, from: array{id: int, name: string}, stamp: string, text: string, greeted_on: string}> まだ見ていない自分宛て(新しい順) */
    public static function unseenGreetings(UserProfile $profile): array
    {
        return $profile->receivedGreetings()
            ->with('sender')
            ->whereNull('seen_at')
            ->orderByDesc('id')
            ->limit(config('world.greetings_shown'))
            ->get()
            ->map(fn (ProfileGreeting $greeting) => [
                'id' => $greeting->id,
                'from' => ['id' => $greeting->sender->id, 'name' => $greeting->sender->name],
                'stamp' => $greeting->stamp,
                'text' => config("world.greeting_stamps.{$greeting->stamp}", ''),
                'greeted_on' => $greeting->greeted_on->toDateString(),
            ])
            ->all();
    }

    /** @param  list<int>  $ids  画面に出したあいさつ。自分宛てのものだけに印を付ける */
    public static function markSeen(UserProfile $profile, array $ids): void
    {
        $profile->receivedGreetings()->whereIn('id', $ids)->whereNull('seen_at')->update(['seen_at' => now()]);
    }
}
```

- [ ] **Step 6: APIをつなぐ**

`routes/api.php` の `use App\Support\ContinueStage;` の後に `use App\Support\Family;` を足す（アルファベット順）。

町のAPI（`Route::get('/', ...)->name('show')` の中）の戻り値の `'review' => Review::state($profile),` の後に足す:

```php
            'greetings' => Family::unseenGreetings($profile),
            'family_count' => Family::others($profile)->count(),
```

`world` のグループの `Route::post('/partner', ...)->name('partner');` の後に足す:

```php
    Route::post('/greetings/seen', function (Request $request) {
        $profile = ActiveProfile::require($request);
        $data = $request->validate(['ids' => ['required', 'array'], 'ids.*' => ['integer']]);
        Family::markSeen($profile, $data['ids']);

        return ['greetings' => Family::unseenGreetings($profile)];
    })->name('greetings.seen');
```

`review` のグループ（`Route::middleware(['auth:sanctum'])->prefix('review')...`）の後に足す:

```php
Route::middleware(['auth:sanctum'])->prefix('family')->name('family.')->group(function () {
    Route::get('/', function (Request $request) {
        return Family::list(ActiveProfile::require($request));
    })->name('index');

    Route::get('/{profile}', function (Request $request, UserProfile $profile) {
        $me = ActiveProfile::require($request);

        return Family::town($me, Family::member($me, $profile));
    })->whereNumber('profile')->name('show');

    Route::post('/{profile}/greet', function (Request $request, UserProfile $profile) {
        $me = ActiveProfile::require($request);
        $data = $request->validate(['stamp' => ['required', 'string']]);
        Family::greet($me, Family::member($me, $profile), $data['stamp']);

        return ['greeted_today' => true];
    })->whereNumber('profile')->name('greet');
});
```

- [ ] **Step 7: DBを更新してテストが通ることを確かめる**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail artisan test --filter=FamilyTownTest`
Expected: マイグレーション1件が実行され、PASS（10件）

- [ ] **Step 8: 全体のテストとコミット**

Run: `./vendor/bin/sail artisan test`
Expected: PASS（236件）

```bash
git add database/migrations/2026_09_27_000009_create_profile_greetings_table.php app/Models/ProfileGreeting.php app/Models/UserProfile.php app/Support/Family.php config/world.php routes/api.php tests/Pest.php tests/Feature/FamilyTownTest.php
git commit -m "#00121: feature:家族の町を見るだけで見に行くAPIと、1日1回のあいさつを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 今日のおつかい（サーバー）

**Files:**
- Create: `database/migrations/2026_09_27_000010_create_profile_errands_table.php`、`app/Models/ProfileErrand.php`、`app/Support/Errands.php`
- Modify: `app/Models/UserProfile.php`（関連）、`config/world.php`（`errands`）、`routes/api.php`（`use`・町のAPI・おつかいの受け取り）
- Test: `tests/Feature/ErrandTest.php`

**Interfaces:**
- Consumes: `Family::others()`（Task 1）、`UserProfile::sentGreetings()`（Task 1）、`Bond::partner()`・`Bond::displayName()`・`Bond::addToPartner()`（C回）、`Review::state()`（C回）、`Garden::today()`・`Garden::activeSeed()`・`Garden::TIMEZONE`（B回）
- Produces:
  - テーブル `profile_errands`（`user_profile_id`・`errand_on`・`slot`・`kind`・`target`・`giver`・`claimed_at`、一意 `user_profile_id`＋`errand_on`＋`slot`）
  - `UserProfile::errands(): HasMany`
  - 設定 `world.errands.first_target`（5）・`fallback_target`（10）・`reward`（20）・`bonus`（30）・`partner_bond`（3）
  - `Errands::today(UserProfile $p): Collection<ProfileErrand>`、`Errands::progress(UserProfile $p, ProfileErrand $e): int`、`Errands::state(UserProfile $p): array`（`{ date, items: [{ slot, kind, target, progress, claimed, giver: { kind, key, name } }], bonus: { amount, claimed } }`）、`Errands::claim(UserProfile $p, int $slot): array`（`{ errands, points, gained: { points, bonus, bond }, partner }`）
  - API: `GET /api/world` の `errands`、`POST /api/errands/{slot}/claim`
  - 答えの記録の理由 `errand`・`errand_bonus`（`type=point`）

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/ErrandTest.php`:

```php
<?php

use App\Models\UserProfile;
use App\Support\Garden;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;

/*
|--------------------------------------------------------------------------
| 今日のおつかい(docs/design/2026-09-27-spru-wave-d-design.md 3-1)
|--------------------------------------------------------------------------
|
| 1日3つ。1つ目は「問題に5問正解する」、2つ目・3つ目はその日に出せるものから選ぶ。
| 進み具合は今ある記録から数え、やりとげたら［受け取る］で学習ポイントがもらえる。
|
*/

/** 回答APIが正解1問ごとに付ける経験値の行を、答えの記録に付ける */
function recordErrandCorrect(UserProfile $profile, int $times = 1): void
{
    foreach (range(1, $times) as $_) {
        $profile->currencyLedger()->create(['type' => 'xp', 'delta' => 10, 'reason' => 'answer_correct']);
    }
}

function recordErrandStageClear(UserProfile $profile): void
{
    $profile->currencyLedger()->create(['type' => 'point', 'delta' => 50, 'reason' => 'stage_clear']);
}

/** @return list<string> */
function errandKinds(TestResponse $response): array
{
    return collect($response->json('errands.items'))->pluck('kind')->all();
}

/** @return array<string, mixed> */
function errandOf(TestResponse $response, string $kind): array
{
    return collect($response->json('errands.items'))->firstWhere('kind', $kind);
}

it('おつかいは1日3つで、1つ目は「問題に5問正解する」。同じ日に何度開いても変わらない', function () {
    $profile = createActiveProfile();

    $first = $this->getJson('/api/world')->assertOk()
        ->assertJsonCount(3, 'errands.items')
        ->assertJsonPath('errands.items.0.kind', 'correct')
        ->assertJsonPath('errands.items.0.target', 5)
        ->json('errands.items');

    expect($this->getJson('/api/world')->json('errands.items'))->toBe($first)
        ->and($profile->errands()->count())->toBe(3);
});

it('出せるものがステージクリアだけの日は、残りを「問題に10問正解する」にする', function () {
    createActiveProfile();

    $items = $this->getJson('/api/world')->json('errands.items');

    expect(collect($items)->map(fn (array $e) => [$e['kind'], $e['target'], $e['giver']['kind']])->all())
        ->toBe([['correct', 5, 'spru'], ['stage_clear', 1, 'spru'], ['correct', 10, 'spru']]);
});

it('出す条件を満たすおつかいが、2つ目・3つ目に出る', function (string $kind) {
    $profile = createActiveProfile();
    match ($kind) {
        'water' => $profile->seeds()->create(['result_key' => 'momo']),
        'review' => $profile->currencyLedger()->create([
            'type' => 'hp', 'delta' => -2, 'reason' => 'answer_wrong', 'question_id' => createQuestionWithChoices()[0]->id,
        ]),
        'decorate' => $profile->worldItems()->create(['shop_item_id' => createDecoration()->id]),
        'family_greet' => createFamilyMember($profile),
    };

    $kinds = array_slice(errandKinds($this->getJson('/api/world')), 1);
    sort($kinds);
    $expected = ['stage_clear', $kind];
    sort($expected);

    expect($kinds)->toBe($expected);
})->with(['water', 'review', 'decorate', 'family_greet']);

it('今日もう水をあげた芽では、水やりのおつかいは出ない', function () {
    $profile = createActiveProfile();
    $profile->seeds()->create(['result_key' => 'momo', 'waterings' => 1, 'last_watered_on' => Garden::today()]);

    expect(errandKinds($this->getJson('/api/world')))->toBe(['correct', 'stage_clear', 'correct']);
});

it('3つ目は相棒が頼み、1つ目・2つ目はスプルが頼む', function () {
    $profile = createActiveProfile();
    $profile->companions()->create(['companion_key' => 'momo', 'nickname' => 'モモ']);
    $profile->update(['partner_companion_key' => 'momo']);

    $this->getJson('/api/world')
        ->assertJsonPath('errands.items.0.giver', ['kind' => 'spru', 'key' => null, 'name' => 'スプル'])
        ->assertJsonPath('errands.items.1.giver.kind', 'spru')
        ->assertJsonPath('errands.items.2.giver', ['kind' => 'partner', 'key' => 'momo', 'name' => 'モモ']);
});

it('おつかいは日本時間の0時で新しくなる', function () {
    $profile = createActiveProfile();

    $this->travelTo(Carbon::parse('2026-09-27 14:59:00', 'UTC')); // 日本時間 23:59
    $this->getJson('/api/world')->assertJsonPath('errands.date', '2026-09-27');

    $this->travelTo(Carbon::parse('2026-09-27 15:00:00', 'UTC')); // 日本時間 翌日の0:00
    $this->getJson('/api/world')->assertJsonPath('errands.date', '2026-09-28');

    expect($profile->errands()->count())->toBe(6);
});

it('正解の数は今日の分だけ数え、やり直しは数えない', function () {
    $profile = createActiveProfile();
    [$question, $correct] = createQuestionWithChoices();

    $this->travelTo(Carbon::parse('2026-09-27 14:30:00', 'UTC')); // 日本時間 23:30
    recordErrandCorrect($profile);
    $this->travelTo(Carbon::parse('2026-09-27 15:30:00', 'UTC')); // 日本時間 翌日の0:30
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id])->assertOk();
    $this->postJson("/api/questions/{$question->id}/answer", ['choice_id' => $correct->id, 'practice' => true])->assertOk();

    $this->getJson('/api/world')->assertJsonPath('errands.items.0.progress', 1);
});

it('進み具合は目標で止まる', function () {
    $profile = createActiveProfile();
    recordErrandCorrect($profile, 7);

    $this->getJson('/api/world')
        ->assertJsonPath('errands.items.0.progress', 5)
        ->assertJsonPath('errands.items.2.progress', 7);
});

it('ステージクリアと水やりを数える', function () {
    $profile = createActiveProfile();
    $seed = $profile->seeds()->create(['result_key' => 'momo']);
    $before = $this->getJson('/api/world');
    expect(errandOf($before, 'water')['progress'])->toBe(0)
        ->and(errandOf($before, 'stage_clear')['progress'])->toBe(0);

    recordErrandStageClear($profile);
    $seed->update(['waterings' => 1, 'last_watered_on' => Garden::today()]);

    $after = $this->getJson('/api/world');
    expect(errandOf($after, 'water')['progress'])->toBe(1)
        ->and(errandOf($after, 'stage_clear')['progress'])->toBe(1);
});

it('復習をやりきると数える', function () {
    $profile = createActiveProfile();
    [$question] = createQuestionWithChoices();
    $profile->currencyLedger()->create(['type' => 'hp', 'delta' => -2, 'reason' => 'answer_wrong', 'question_id' => $question->id]);
    $this->getJson('/api/world');

    $this->postJson('/api/review/complete')->assertOk();

    expect(errandOf($this->getJson('/api/world'), 'review')['progress'])->toBe(1);
});

it('家族の町にあいさつすると数える', function () {
    $profile = createActiveProfile();
    $sister = createFamilyMember($profile);
    $this->getJson('/api/world');

    $this->postJson("/api/family/{$sister->id}/greet", ['stamp' => 'hello'])->assertOk();

    expect(errandOf($this->getJson('/api/world'), 'family_greet')['progress'])->toBe(1);
});

it('もようがえは置く・動かすを数え、バッグにしまっただけは数えない', function () {
    $profile = createActiveProfile();
    $this->travelTo(Carbon::parse('2026-09-26 03:00:00', 'UTC')); // 前の日に置いておく
    $item = $profile->worldItems()->create(['shop_item_id' => createDecoration()->id, 'x' => 5, 'y' => 5]);
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC'));
    expect(errandOf($this->getJson('/api/world'), 'decorate')['progress'])->toBe(0);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => null, 'y' => null])->assertOk();
    expect(errandOf($this->getJson('/api/world'), 'decorate')['progress'])->toBe(0);

    $this->patchJson("/api/world/items/{$item->id}", ['x' => 5, 'y' => 4])->assertOk();
    expect(errandOf($this->getJson('/api/world'), 'decorate')['progress'])->toBe(1);
});

it('やりとげていないおつかいは受け取れない', function () {
    createActiveProfile();

    $this->postJson('/api/errands/1/claim')->assertStatus(422)->assertJsonPath('message', 'まだおつかいが終わっていないよ');
});

it('受け取ると学習ポイント+20と記録が付き、2回目は受け取れない', function () {
    $profile = createActiveProfile();
    recordErrandCorrect($profile, 5);

    $this->postJson('/api/errands/1/claim')->assertOk()
        ->assertJsonPath('points', 20)
        ->assertJsonPath('gained', ['points' => 20, 'bonus' => 0, 'bond' => 0])
        ->assertJsonPath('partner', null)
        ->assertJsonPath('errands.items.0.claimed', true);

    $this->postJson('/api/errands/1/claim')->assertStatus(422)->assertJsonPath('message', 'もう受け取ったよ');
    expect($profile->fresh()->points)->toBe(20)
        ->and((int) $profile->currencyLedger()->where('reason', 'errand')->sum('delta'))->toBe(20);
});

it('相棒のおつかいは、受け取った時点の相棒のなかよし度も+3する', function () {
    $profile = createActiveProfile();
    $momo = $profile->companions()->create(['companion_key' => 'momo', 'bond' => 18]);
    $lumi = $profile->companions()->create(['companion_key' => 'lumi', 'bond' => 18]);
    $profile->update(['partner_companion_key' => 'momo']);
    $this->getJson('/api/world')->assertJsonPath('errands.items.2.giver.key', 'momo');
    $this->postJson('/api/world/partner', ['key' => 'lumi'])->assertOk();
    recordErrandCorrect($profile, 10);

    $this->postJson('/api/errands/3/claim')->assertOk()
        ->assertJsonPath('gained.bond', 3)
        ->assertJsonPath('partner.key', 'lumi')
        ->assertJsonPath('partner.hearts_up', true);

    expect($lumi->fresh()->bond)->toBe(21)
        ->and($momo->fresh()->bond)->toBe(18);
});

it('3つ目を受け取ると、おまけの+30も付く', function () {
    $profile = createActiveProfile();
    recordErrandCorrect($profile, 10);
    recordErrandStageClear($profile);

    $this->postJson('/api/errands/1/claim')->assertJsonPath('gained.bonus', 0);
    $this->postJson('/api/errands/2/claim')->assertJsonPath('gained.bonus', 0);
    $this->postJson('/api/errands/3/claim')->assertOk()
        ->assertJsonPath('gained.bonus', 30)
        ->assertJsonPath('errands.bonus', ['amount' => 30, 'claimed' => true]);

    expect($profile->fresh()->points)->toBe(90)
        ->and($profile->currencyLedger()->where('reason', 'errand_bonus')->count())->toBe(1);
});

it('ほかのプロフィールの記録やおつかいには触れない', function () {
    $me = createActiveProfile();
    $sister = createFamilyMember($me);
    recordErrandCorrect($sister, 5);

    $this->postJson('/api/errands/1/claim')->assertStatus(422);

    $this->withSession(['active_profile_id' => $sister->id]);
    $this->postJson('/api/errands/1/claim')->assertOk();
    expect($me->errands()->whereNotNull('claimed_at')->count())->toBe(0);
});

it('日が変わった後の受け取りは、新しい日のおつかいで確かめる', function () {
    $profile = createActiveProfile();
    $this->travelTo(Carbon::parse('2026-09-27 03:00:00', 'UTC'));
    recordErrandCorrect($profile, 5);
    $this->getJson('/api/world');

    $this->travelTo(Carbon::parse('2026-09-28 03:00:00', 'UTC'));
    $this->postJson('/api/errands/1/claim')->assertStatus(422)->assertJsonPath('message', 'まだおつかいが終わっていないよ');

    expect($profile->errands()->where('errand_on', '2026-09-28')->count())->toBe(3);
});

it('無い番号のおつかいは見つからない', function () {
    createActiveProfile();

    $this->postJson('/api/errands/4/claim')->assertNotFound();
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `./vendor/bin/sail artisan test --filter=ErrandTest`
Expected: FAIL（`errands.items` が無い、または `Call to undefined method App\Models\UserProfile::errands()`）

- [ ] **Step 3: テーブル・モデル・設定を作る**

`database/migrations/2026_09_27_000010_create_profile_errands_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profile_errands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_profile_id')->constrained()->cascadeOnDelete();
            $table->date('errand_on');
            $table->unsignedTinyInteger('slot');
            $table->string('kind', 32);
            $table->unsignedSmallInteger('target');
            $table->string('giver', 16);
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();

            // 同時に町を開いても、その日のおつかいは1組だけになる
            $table->unique(['user_profile_id', 'errand_on', 'slot']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_errands');
    }
};
```

`app/Models/ProfileErrand.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileErrand extends Model
{
    protected $fillable = ['errand_on', 'slot', 'kind', 'target', 'giver', 'claimed_at'];

    protected function casts(): array
    {
        return [
            'errand_on' => 'date',
            'slot' => 'integer',
            'target' => 'integer',
            'claimed_at' => 'datetime',
        ];
    }

    public function profile(): BelongsTo
    {
        return $this->belongsTo(UserProfile::class, 'user_profile_id');
    }
}
```

`app/Models/UserProfile.php` の `receivedGreetings()` の後に足す:

```php
    public function errands(): HasMany
    {
        return $this->hasMany(ProfileErrand::class);
    }
```

`config/world.php` の `rewards` の配列の後（`level_curve` の前）に足す:

```php

    /*
    | 今日のおつかい(docs/design/2026-09-27-spru-wave-d-design.md 3-1)。1日で最大 reward×3＋bonus
    */

    'errands' => [
        'first_target' => 5,     // 1つ目「問題に5問正解する」
        'fallback_target' => 10, // 候補が足りない日の「問題に10問正解する」
        'reward' => 20,          // 1つにつき
        'bonus' => 30,           // 3つそろったおまけ
        'partner_bond' => 3,     // 相棒のおつかいのなかよし度
    ],
```

- [ ] **Step 4: `Errands` を作る**

`app/Support/Errands.php`:

```php
<?php

namespace App\Support;

use App\Models\ProfileErrand;
use App\Models\UserProfile;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * 今日のおつかい(docs/design/2026-09-27-spru-wave-d-design.md 3-1)。
 * 進み具合は保存せず、今ある記録(答えの記録・水やりの日・復習の日・配置の更新時刻・あいさつ)から数える。
 */
class Errands
{
    /** 2つ目・3つ目の候補(「問題に5問正解する」は1つ目に必ず出す) */
    private const CHOICES = ['stage_clear', 'water', 'review', 'decorate', 'family_greet'];

    /** @return Collection<int, ProfileErrand> 今日のおつかい。まだ無ければ決める */
    public static function today(UserProfile $profile): Collection
    {
        $today = Garden::today();
        $errands = self::forDate($profile, $today);
        if ($errands->isNotEmpty()) {
            return $errands;
        }

        try {
            DB::transaction(function () use ($profile, $today) {
                foreach (self::plan($profile) as $i => $errand) {
                    $profile->errands()->create([...$errand, 'errand_on' => $today, 'slot' => $i + 1]);
                }
            });
        } catch (UniqueConstraintViolationException) {
            // 同時に開いて先に作られたときは、そちらを使う
        }

        return self::forDate($profile, $today);
    }

    /** 今日数えた進み具合(目標で止める) */
    public static function progress(UserProfile $profile, ProfileErrand $errand): int
    {
        $date = $errand->errand_on->toDateString();
        // 記録の時刻はUTCで保存しているので、日本時間の0時をUTCに直して比べる
        $since = Carbon::parse($date, Garden::TIMEZONE)->utc();

        $count = match ($errand->kind) {
            'correct' => self::ledgerCount($profile, 'answer_correct', 'xp', $since),
            'stage_clear' => self::ledgerCount($profile, 'stage_clear', 'point', $since),
            'water' => (int) $profile->seeds()->where('last_watered_on', $date)->exists(),
            'review' => (int) ($profile->last_review_on?->toDateString() === $date),
            'decorate' => (int) $profile->worldItems()->whereNotNull('x')->where('updated_at', '>=', $since)->exists(),
            'family_greet' => (int) $profile->sentGreetings()->where('greeted_on', $date)->exists(),
            default => 0,
        };

        return min($count, $errand->target);
    }

    /** @return array{date: string, items: list<array<string, mixed>>, bonus: array{amount: int, claimed: bool}} */
    public static function state(UserProfile $profile): array
    {
        $errands = self::today($profile);
        $partner = Bond::partner($profile);

        return [
            'date' => Garden::today(),
            'items' => $errands->map(fn (ProfileErrand $errand) => [
                'slot' => $errand->slot,
                'kind' => $errand->kind,
                'target' => $errand->target,
                'progress' => self::progress($profile, $errand),
                'claimed' => $errand->claimed_at !== null,
                'giver' => $errand->giver === 'partner' && $partner
                    ? ['kind' => 'partner', 'key' => $partner->companion_key, 'name' => Bond::displayName($partner)]
                    : ['kind' => 'spru', 'key' => null, 'name' => 'スプル'],
            ])->values()->all(),
            'bonus' => [
                'amount' => config('world.errands.bonus'),
                'claimed' => $errands->every(fn (ProfileErrand $errand) => $errand->claimed_at !== null),
            ],
        ];
    }

    /**
     * おつかいのごほうびを渡す。呼び出し側で、プロフィールを lockForUpdate してから呼ぶ。
     *
     * @return array{errands: array, points: int, gained: array{points: int, bonus: int, bond: int}, partner: ?array}
     */
    public static function claim(UserProfile $profile, int $slot): array
    {
        $errand = self::today($profile)->firstWhere('slot', $slot);
        abort_unless($errand, 404);
        abort_if($errand->claimed_at !== null, 422, 'もう受け取ったよ');
        abort_if(self::progress($profile, $errand) < $errand->target, 422, 'まだおつかいが終わっていないよ');

        $errand->update(['claimed_at' => now()]);
        $reward = config('world.errands.reward');
        $profile->applyEconomy(['point' => $reward], 'errand');

        $bonus = 0;
        if (self::today($profile)->every(fn (ProfileErrand $e) => $e->claimed_at !== null)) {
            $bonus = config('world.errands.bonus');
            $profile->applyEconomy(['point' => $bonus], 'errand_bonus');
        }

        // 相棒のなかよし度は、受け取った時点の相棒に足す
        $partner = $errand->giver === 'partner' ? Bond::addToPartner($profile, config('world.errands.partner_bond')) : null;

        return [
            'errands' => self::state($profile),
            'points' => $profile->points,
            'gained' => ['points' => $reward, 'bonus' => $bonus, 'bond' => $partner ? config('world.errands.partner_bond') : 0],
            'partner' => $partner,
        ];
    }

    /** @return Collection<int, ProfileErrand> */
    private static function forDate(UserProfile $profile, string $date): Collection
    {
        return $profile->errands()->where('errand_on', $date)->orderBy('slot')->get();
    }

    /** @return list<array{kind: string, target: int, giver: string}> */
    private static function plan(UserProfile $profile): array
    {
        $choices = array_values(array_filter(self::CHOICES, fn (string $kind) => self::available($profile, $kind)));
        shuffle($choices);
        $fallback = ['kind' => 'correct', 'target' => config('world.errands.fallback_target')];
        $second = isset($choices[0]) ? ['kind' => $choices[0], 'target' => 1] : $fallback;
        $third = isset($choices[1]) ? ['kind' => $choices[1], 'target' => 1] : $fallback;

        return [
            ['kind' => 'correct', 'target' => config('world.errands.first_target'), 'giver' => 'spru'],
            [...$second, 'giver' => 'spru'],
            [...$third, 'giver' => Bond::partner($profile) ? 'partner' : 'spru'],
        ];
    }

    /** おつかいが決まる時点で、その日に出せるか(設計書3-1の表) */
    private static function available(UserProfile $profile, string $kind): bool
    {
        return match ($kind) {
            'stage_clear' => true,
            'water' => self::canWaterToday($profile),
            'review' => Review::state($profile)['available'],
            'decorate' => $profile->worldItems()->exists(),
            'family_greet' => Family::others($profile)->isNotEmpty(),
            default => false,
        };
    }

    /** 畑に種か芽があり、今日まだ水をあげていない(今日正解したかは見ない) */
    private static function canWaterToday(UserProfile $profile): bool
    {
        $seed = Garden::activeSeed($profile);

        return $seed !== null && $seed->last_watered_on?->toDateString() !== Garden::today();
    }

    private static function ledgerCount(UserProfile $profile, string $reason, string $type, Carbon $since): int
    {
        return $profile->currencyLedger()
            ->where('reason', $reason)
            ->where('type', $type)
            ->where('created_at', '>=', $since)
            ->count();
    }
}
```

- [ ] **Step 5: APIをつなぐ**

`routes/api.php` の `use App\Support\ContinueStage;` の後に `use App\Support\Errands;` を足す（`Family` の前、アルファベット順）。

町のAPIの戻り値の `'review' => Review::state($profile),` の後（Task 1で足した `'greetings'` の前）に足す:

```php
            'errands' => Errands::state($profile),
```

`family` のグループ（Task 1で足した）の後に足す:

```php
Route::middleware(['auth:sanctum'])->post('/errands/{slot}/claim', function (Request $request, int $slot) {
    $activeProfile = ActiveProfile::require($request);

    // 二重に押しても1回分だけになるよう、プロフィールをロックしてから渡す
    return DB::transaction(function () use ($activeProfile, $slot) {
        $profile = UserProfile::query()->whereKey($activeProfile->id)->lockForUpdate()->firstOrFail();

        return Errands::claim($profile, $slot);
    });
})->whereNumber('slot')->name('errands.claim');
```

- [ ] **Step 6: DBを更新してテストが通ることを確かめる**

Run: `./vendor/bin/sail artisan migrate && ./vendor/bin/sail artisan test --filter=ErrandTest`
Expected: マイグレーション1件が実行され、PASS（22件。「出す条件を満たす…」は4件に分かれる）

- [ ] **Step 7: 全体のテストとコミット**

Run: `./vendor/bin/sail artisan test`
Expected: PASS（258件）

```bash
git add database/migrations/2026_09_27_000010_create_profile_errands_table.php app/Models/ProfileErrand.php app/Models/UserProfile.php app/Support/Errands.php config/world.php routes/api.php tests/Feature/ErrandTest.php
git commit -m "#00122: feature:今日のおつかい(1日3つ)を決めて進み具合を数え、ごほうびを受け取るAPIを追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: リュックのスプルと衣装のスプルの切り抜き

**Files:**
- Modify: `tools/spru-assets/crops.json`（`sources`・新しい `outing`・`costumes`）、`tools/spru-assets/extract.py`（docstring・`write_ts`・`main`）
- Create（道具が書き出す）: `frontend/public/spru/outing/{walk,run,back,apple,heart,star}.webp`、`frontend/public/spru/costumes/{halloween,christmas,valentine,summer}.webp`
- Modify（道具が書き出す）: `frontend/src/components/spru/spru-assets.ts`

**Interfaces:**
- Produces: `OUTING_IMAGES`（キー `walk`・`run`・`back`・`apple`・`heart`・`star`）、`COSTUME_IMAGES`（キー `halloween`・`christmas`・`valentine`・`summer`）、型 `OutingKey`・`CostumeKey`（`components/spru/spru-assets.ts`）

- [ ] **Step 1: 切り抜く範囲を足す**

`tools/spru-assets/crops.json` の `sources` に足す:

```json
    "m7": "mascot-7.png",
    "m8": "mascot-8.png"
```

`companions` の配列の後に足す（範囲は素材集の上で、不透明な部分の塊を調べて決めた。mascot-8は大きいので0.4倍にする）:

```json
  "outing": [
    { "key": "walk", "source": "m7", "box": [88, 14, 178, 170] },
    { "key": "run", "source": "m7", "box": [1058, 814, 1136, 922] },
    { "key": "back", "source": "m7", "box": [562, 924, 626, 1016] },
    { "key": "apple", "source": "m7", "box": [842, 662, 920, 794] },
    { "key": "heart", "source": "m7", "box": [966, 662, 1044, 794] },
    { "key": "star", "source": "m7", "box": [1100, 664, 1186, 796] }
  ],
  "costumes": [
    { "key": "halloween", "source": "m8", "box": [48, 218, 430, 846], "scale": 0.4 },
    { "key": "christmas", "source": "m8", "box": [426, 246, 776, 866], "scale": 0.4 },
    { "key": "valentine", "source": "m8", "box": [812, 238, 1114, 864], "scale": 0.4 },
    { "key": "summer", "source": "m8", "box": [1136, 234, 1490, 852], "scale": 0.4 }
  ]
```

- [ ] **Step 2: 道具に2つのまとまりを足す**

`tools/spru-assets/extract.py`:

docstring の出力の行を次にする:

```python
- 出力: frontend/public/spru/{group}/{key}.webp、表情の顔アイコン faces/、シーン scenes/、
  つぼみ・花 bloom/、畑の種・芽 garden/、仲間 companions/、リュックのスプル outing/、季節の衣装 costumes/
```

`write_ts` の引数と書き出しを次にする（`companions` の後に2つ足す）:

```python
def write_ts(
    images: dict, faces: dict, scenes: dict, bloom: dict, garden: dict, companions: dict,
    outing: dict, costumes: dict, tips: dict,
) -> None:
```

テンプレートの `export const COMPANION_IMAGES = {{ ... }} as const satisfies Record<string, SpruImage>;` の後に足す:

```python

export const OUTING_IMAGES = {{
{entries(outing)}
}} as const satisfies Record<string, SpruImage>;

export const COSTUME_IMAGES = {{
{entries(costumes)}
}} as const satisfies Record<string, SpruImage>;
```

`export type CompanionKey = keyof typeof COMPANION_IMAGES;` の後に足す:

```python
export type OutingKey = keyof typeof OUTING_IMAGES;
export type CostumeKey = keyof typeof COSTUME_IMAGES;
```

`main()` のまとまりのループと、書き出し・表示を次にする:

```python
    parts: dict = {}
    for group in ("bloom", "garden", "companions", "outing", "costumes"):
        parts[group] = {}
        for part in spec[group]:
            img = cut_figure(sources[part["source"]], part["box"], part.get("scale", 1.0), part.get("mode", "largest"))
            parts[group][part["key"]] = save(img, f'{group}/{part["key"]}.webp')

    write_ts(
        images, faces, scenes, parts["bloom"], parts["garden"], parts["companions"],
        parts["outing"], parts["costumes"], tips,
    )
    print(
        f"画像 {len(images)}・顔 {len(faces)}・シーン {len(scenes)}・花 {len(parts['bloom'])}"
        f"・畑 {len(parts['garden'])}・仲間 {len(parts['companions'])}"
        f"・お出かけ {len(parts['outing'])}・衣装 {len(parts['costumes'])} を書き出しました"
    )
```

- [ ] **Step 3: 道具を動かす**

Run（リポジトリ直下で）: `python3 tools/spru-assets/extract.py ../../company/mascot/assets`
Expected: `画像 26・顔 11・シーン 2・花 2・畑 2・仲間 5・お出かけ 6・衣装 4 を書き出しました`

- [ ] **Step 4: 切り抜いた絵を目で確かめる**

`frontend/public/spru/outing/` の6枚と `costumes/` の4枚を1枚ずつ開いて見る（Readツールで画像として読む）。確かめること:
- `apple`・`heart`・`star` で、手に持っているもの（りんご・ハート・星）が消えていない
- 体の一部が欠けていない。周りに緑の光（mascot-7）や白い帯（mascot-8）のふちが目立って残っていない
- `run` は右向きに走っている（スピードの線は消えていてよい）、`back` は後ろ姿

持っているものが消えていたら、その行に `"mode": "all"` を足して Step 3 をやり直す。光や帯のふちが目立つときは、その行の `box` を内側に4pxずつ狭めてやり直す。

- [ ] **Step 5: 今までの画像が変わっていないことを確かめる**

Run: `git status --short frontend/public/spru`
Expected: `?? frontend/public/spru/outing/` と `?? frontend/public/spru/costumes/` だけ。今までの画像に ` M` が出たら、次で見た目が同じか確かめる（同じなら `git checkout -- <そのファイル>` で戻す）:

```bash
python3 - <<'EOF'
import io, subprocess
from PIL import Image, ImageChops
paths = subprocess.run(["git", "diff", "--name-only", "--", "frontend/public/spru"], capture_output=True, text=True).stdout.split()
for p in paths:
    old = Image.open(io.BytesIO(subprocess.run(["git", "show", f"HEAD:{p}"], capture_output=True).stdout)).convert("RGBA")
    new = Image.open(p).convert("RGBA")
    same = old.size == new.size and ImageChops.difference(old, new).getbbox() is None
    print(p, "同じ" if same else "ちがう")
EOF
```

- [ ] **Step 6: 型を確かめてコミット**

Run（`frontend/` で）: `npm run typecheck`
Expected: エラーなし（`spru-assets.ts` に `OUTING_IMAGES`・`COSTUME_IMAGES`・`OutingKey`・`CostumeKey` が増えている）

```bash
git add tools/spru-assets/crops.json tools/spru-assets/extract.py frontend/public/spru/outing frontend/public/spru/costumes frontend/src/components/spru/spru-assets.ts
git commit -m "#00123: feature:リュックのスプル(mascot-7)と季節の衣装のスプル(mascot-8)を切り抜く

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: おつかい・にぎやか度・季節のあいさつの計算（画面側）

**Files:**
- Create: `frontend/src/components/world/errands.ts`・`errands.test.ts`、`liveliness.ts`・`liveliness.test.ts`、`season-greeting.ts`・`season-greeting.test.ts`
- Modify: `frontend/src/components/world/types.ts`

**Interfaces:**
- Consumes: `gardenPrompt()`（`components/world/garden.ts`）、`reviewPrompt()`（`components/world/companions.ts`）、`CostumeKey`（Task 3）、Task 1・2のAPIの形
- Produces:
  - 型（`types.ts`）: `ErrandKind`、`WorldErrand`、`WorldErrands`、`WorldGreeting`、`ErrandClaimResult`、`FamilyMember`、`FamilyTown`。`WorldData` に `errands`・`greetings`・`family_count`
  - `errands.ts`: `errandTitle(e)`・`errandLine(e)`・`isErrandDone(e)`・`errandProgressText(e)`・`claimableErrands(list)`・`claimedCount(list)`・`errandGo(e, ctx): ErrandGo`・`errandPrompt(list)`・`townPrompt({ errands, garden, review })`
  - `liveliness.ts`: `LIVELINESS_LEVELS`・`LIVELINESS_HINTS`・`livelinessScore(items, companionCount)`・`levelForScore(score): Liveliness`・`liveliness(items, companionCount): Liveliness`・`livelinessStars(level)`・`livelinessNextText(l)`・`livelinessUpLine(label)`
  - `season-greeting.ts`: `SeasonGreeting`・`seasonGreeting(date)`・`localDateString(date)`・`shouldShowSeasonGreeting(date, lastShown)`・`readSeasonShown(profileId)`・`writeSeasonShown(profileId, date)`

- [ ] **Step 1: 型を足す**

`frontend/src/components/world/types.ts` の `WorldData` に3つ足す（`review: WorldReview;` の後）:

```ts
  errands: WorldErrands;
  greetings: WorldGreeting[];
  family_count: number;
```

ファイルの最後に足す:

```ts
export type ErrandKind = "correct" | "stage_clear" | "water" | "review" | "decorate" | "family_greet";

/** 今日のおつかい(設計書4-4) */
export type WorldErrand = {
  slot: number;
  kind: ErrandKind;
  target: number;
  progress: number;
  claimed: boolean;
  giver: { kind: "spru" | "partner"; key: string | null; name: string };
};

export type WorldErrands = { date: string; items: WorldErrand[]; bonus: { amount: number; claimed: boolean } };

export type ErrandClaimResult = {
  errands: WorldErrands;
  points: number;
  gained: { points: number; bonus: number; bond: number };
  partner: AnswerPartner | null;
};

/** 家族から届いた、まだ見ていないあいさつ */
export type WorldGreeting = { id: number; from: { id: number; name: string }; stamp: string; text: string; greeted_on: string };

export type FamilyMember = { id: number; name: string; level: number; greeted_today: boolean };

/** 家族の町(見るだけ)。ポイント・HP・バッグなどは含まない */
export type FamilyTown = {
  profile: { id: number; name: string; level: number };
  land: WorldLand;
  items: WorldItem[];
  spru: { growth: number };
  garden: Pick<WorldGarden, "x" | "y" | "state">;
  companions: WorldCompanion[];
  greeted_today: boolean;
};
```

- [ ] **Step 2: 失敗するテストを書く**

`frontend/src/components/world/errands.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  claimableErrands,
  claimedCount,
  errandGo,
  errandLine,
  errandProgressText,
  errandTitle,
  townPrompt,
} from "./errands";
import type { WorldErrand, WorldErrands, WorldGarden, WorldReview } from "./types";

const errand = (overrides: Partial<WorldErrand> = {}): WorldErrand => ({
  slot: 1,
  kind: "correct",
  target: 5,
  progress: 0,
  claimed: false,
  giver: { kind: "spru", key: null, name: "スプル" },
  ...overrides,
});
const errands = (items: WorldErrand[]): WorldErrands => ({ date: "2026-09-27", items, bonus: { amount: 30, claimed: false } });
const garden: WorldGarden = {
  x: 1,
  y: 2,
  state: "empty",
  waterings: 0,
  learned_today: false,
  watered_today: false,
  can_sow: false,
  can_water: false,
};
const noReview: WorldReview = { available: false, count: 0, giver: { kind: "spru", key: null, name: "スプル" } };

describe("おつかいの名前とひとこと", () => {
  it("正解のおつかいは目標の数を入れる", () => {
    expect(errandTitle(errand({ target: 10 }))).toBe("問題に10問正解する");
    expect(errandLine(errand({ target: 5 }))).toBe("問題に5問正解してきてね");
  });

  it("種類ごとの名前とひとこと", () => {
    expect(errandTitle(errand({ kind: "stage_clear", target: 1 }))).toBe("ステージを1つクリアする");
    expect(errandTitle(errand({ kind: "decorate", target: 1 }))).toBe("町のもようがえ（置く・動かす）");
    expect(errandTitle(errand({ kind: "family_greet", target: 1 }))).toBe("家族の町にあいさつに行く");
    expect(errandLine(errand({ kind: "water", target: 1 }))).toBe("芽に水をあげてほしいな");
    expect(errandLine(errand({ kind: "review", target: 1 }))).toBe("この前まちがえた問題、復習してみよう");
    expect(errandLine(errand({ kind: "family_greet", target: 1 }))).toBe("家族の町に、あいさつに行ってみよう");
  });
});

describe("進み具合と受け取り", () => {
  it("進み具合は目標で止めて出す", () => {
    expect(errandProgressText(errand({ progress: 3 }))).toBe("3/5");
    expect(errandProgressText(errand({ progress: 7 }))).toBe("5/5");
  });

  it("受け取れるのは、やりとげて受け取っていないものだけ", () => {
    const list = errands([
      errand({ slot: 1, progress: 5 }),
      errand({ slot: 2, progress: 5, claimed: true }),
      errand({ slot: 3, progress: 4 }),
    ]);

    expect(claimableErrands(list).map((e) => e.slot)).toEqual([1]);
    expect(claimedCount(list)).toBe(1);
  });
});

describe("［やりに行く］の行き先", () => {
  const ctx = { continueHref: "/quiz/12", learnedToday: false, bagCount: 0 };

  it("正解・ステージは「つづきから学ぶ」と同じ行き先", () => {
    expect(errandGo(errand(), ctx)).toEqual({ kind: "link", href: "/quiz/12" });
    expect(errandGo(errand({ kind: "stage_clear", target: 1 }), ctx)).toEqual({ kind: "link", href: "/quiz/12" });
  });

  it("復習と家族はそのページへ", () => {
    expect(errandGo(errand({ kind: "review", target: 1 }), ctx)).toEqual({ kind: "link", href: "/review" });
    expect(errandGo(errand({ kind: "family_greet", target: 1 }), ctx)).toEqual({ kind: "link", href: "/family" });
  });

  it("水やりは、今日まだ正解していなければ先に1問", () => {
    expect(errandGo(errand({ kind: "water", target: 1 }), ctx)).toEqual({ kind: "say", line: "1問正解したら、水をあげられるよ" });
    expect(errandGo(errand({ kind: "water", target: 1 }), { ...ctx, learnedToday: true })).toEqual({
      kind: "say",
      line: "畑をタップして水をあげよう",
    });
  });

  it("もようがえは、バッグにアイテムがあればバッグへ", () => {
    expect(errandGo(errand({ kind: "decorate", target: 1 }), ctx)).toEqual({ kind: "say", line: "アイテムをタップすると動かせるよ" });
    expect(errandGo(errand({ kind: "decorate", target: 1 }), { ...ctx, bagCount: 2 })).toEqual({ kind: "link", href: "/bag" });
  });
});

describe("スプルのふだんのひとことの優先順", () => {
  it("受け取れるおつかいが一番上", () => {
    expect(
      townPrompt({ errands: errands([errand({ progress: 5 })]), garden: { ...garden, can_sow: true }, review: noReview }),
    ).toBe("おつかいができたね！受け取ろう");
  });

  it("受け取れるおつかいが無ければ、畑、復習の順", () => {
    const none = errands([errand()]);
    expect(townPrompt({ errands: none, garden: { ...garden, can_water: true }, review: noReview })).toBe("芽に水をあげよう！");
    expect(
      townPrompt({
        errands: none,
        garden,
        review: { available: true, count: 2, giver: { kind: "companion", key: "momo", name: "モモ" } },
      }),
    ).toBe("モモが復習を用意してるよ");
    expect(townPrompt({ errands: none, garden, review: noReview })).toBeNull();
  });
});
```

`frontend/src/components/world/liveliness.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { levelForScore, liveliness, livelinessNextText, livelinessScore, livelinessStars, livelinessUpLine } from "./liveliness";

const item = (shopItemId: number, placed = true) => ({ shop_item_id: shopItemId, x: placed ? 0 : null, y: placed ? 0 : null });

describe("にぎやか度の数え方", () => {
  it("種類ごとに1つ目は+3、同じ種類の2つ目からは+1", () => {
    expect(livelinessScore([item(1), item(1), item(1), item(2)], 0)).toBe(3 + 1 + 1 + 3);
  });

  it("バッグのアイテムは数えない", () => {
    expect(livelinessScore([item(1, false)], 0)).toBe(0);
  });

  it("仲間は1人+3", () => {
    expect(livelinessScore([item(1)], 2)).toBe(3 + 6);
  });
});

describe("にぎやか度の段階", () => {
  it("境目の数で段階が上がる", () => {
    expect([0, 5, 6, 14, 15, 26, 27, 41, 42, 68].map((score) => levelForScore(score).level)).toEqual([
      1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    ]);
    expect(levelForScore(15).label).toBe("にぎやか");
  });

  it("アイテムと仲間から段階を出す", () => {
    expect(liveliness([item(1), item(2), item(3)], 0)).toMatchObject({ score: 9, level: 2, label: "すこしにぎやか" });
  });

  it("次の段階まで、と★の並び", () => {
    expect(livelinessNextText(levelForScore(23))).toBe("とってもにぎやかまで あと4");
    expect(livelinessNextText(levelForScore(42))).toBe("町はおまつり！");
    expect(livelinessStars(3)).toBe("★★★☆☆");
  });

  it("段階が上がったときのひとこと", () => {
    expect(livelinessUpLine("にぎやか")).toBe("町がにぎやかになったね！『にぎやか』になったよ");
  });
});
```

`frontend/src/components/world/season-greeting.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { localDateString, seasonGreeting, shouldShowSeasonGreeting } from "./season-greeting";

const on = (month: number, day: number) => new Date(2026, month - 1, day, 12, 0, 0);

describe("季節のあいさつの期間", () => {
  it.each([
    [9, 30, null],
    [10, 1, "halloween"],
    [10, 31, "halloween"],
    [11, 1, null],
    [11, 30, null],
    [12, 1, "christmas"],
    [12, 25, "christmas"],
    [12, 26, null],
    [1, 31, null],
    [2, 1, "valentine"],
    [2, 14, "valentine"],
    [2, 15, null],
    [7, 19, null],
    [7, 20, "summer"],
    [8, 31, "summer"],
    [9, 1, null],
  ])("%i月%i日は %s", (month, day, costume) => {
    expect(seasonGreeting(on(month, day))?.costume ?? null).toBe(costume);
  });

  it("あいさつの文は設計書のとおり", () => {
    expect(seasonGreeting(on(10, 5))?.line).toBe(
      "ハッピーハロウィン！ハロウィンは、アイルランドなどに昔から伝わるお祭りがもとなんだって",
    );
    expect(seasonGreeting(on(8, 1))?.line).toBe("なつやすみだね！沖縄の言葉で「めんそーれ」は「ようこそ」っていう意味だよ");
  });
});

describe("1日1回", () => {
  it("端末の日付を年-月-日にする", () => {
    expect(localDateString(on(2, 3))).toBe("2026-02-03");
  });

  it("期間中で、今日まだ出していなければ出す", () => {
    expect(shouldShowSeasonGreeting(on(10, 5), null)).toBe(true);
    expect(shouldShowSeasonGreeting(on(10, 5), "2026-10-04")).toBe(true);
    expect(shouldShowSeasonGreeting(on(10, 5), "2026-10-05")).toBe(false);
    expect(shouldShowSeasonGreeting(on(11, 5), null)).toBe(false);
  });
});
```

- [ ] **Step 3: テストが失敗することを確かめる**

Run（`frontend/` で）: `npm test -- errands liveliness season-greeting`
Expected: FAIL（`Failed to resolve import "./errands"` など）

- [ ] **Step 4: 計算を書く**

`frontend/src/components/world/errands.ts`:

```ts
import { reviewPrompt } from "./companions";
import { gardenPrompt } from "./garden";
import type { WorldErrand, WorldErrands, WorldGarden, WorldReview } from "./types";

type ErrandText = Pick<WorldErrand, "kind" | "target">;

/** おつかいの名前(設計書3-1) */
export function errandTitle(errand: ErrandText): string {
  switch (errand.kind) {
    case "correct":
      return `問題に${errand.target}問正解する`;
    case "stage_clear":
      return "ステージを1つクリアする";
    case "water":
      return "芽に水をあげる";
    case "review":
      return "仲間の復習をやりきる";
    case "decorate":
      return "町のもようがえ（置く・動かす）";
    case "family_greet":
      return "家族の町にあいさつに行く";
  }
}

/** 頼む人のひとこと(設計書5-2) */
export function errandLine(errand: ErrandText): string {
  switch (errand.kind) {
    case "correct":
      return `問題に${errand.target}問正解してきてね`;
    case "stage_clear":
      return "ステージを1つクリアしてこよう！";
    case "water":
      return "芽に水をあげてほしいな";
    case "review":
      return "この前まちがえた問題、復習してみよう";
    case "decorate":
      return "町のもようがえをしてみない？";
    case "family_greet":
      return "家族の町に、あいさつに行ってみよう";
  }
}

export function isErrandDone(errand: Pick<WorldErrand, "progress" | "target">): boolean {
  return errand.progress >= errand.target;
}

export function errandProgressText(errand: Pick<WorldErrand, "progress" | "target">): string {
  return `${Math.min(errand.progress, errand.target)}/${errand.target}`;
}

export function claimableErrands(errands: WorldErrands): WorldErrand[] {
  return errands.items.filter((errand) => !errand.claimed && isErrandDone(errand));
}

export function claimedCount(errands: WorldErrands): number {
  return errands.items.filter((errand) => errand.claimed).length;
}

export type ErrandGo = { kind: "link"; href: string } | { kind: "say"; line: string };

/** ［やりに行く］の行き先。水やりともようがえ(バッグが空)は、カードを閉じてスプルが教える(設計書5-2) */
export function errandGo(
  errand: Pick<WorldErrand, "kind">,
  ctx: { continueHref: string; learnedToday: boolean; bagCount: number },
): ErrandGo {
  switch (errand.kind) {
    case "correct":
    case "stage_clear":
      return { kind: "link", href: ctx.continueHref };
    case "review":
      return { kind: "link", href: "/review" };
    case "family_greet":
      return { kind: "link", href: "/family" };
    case "water":
      return { kind: "say", line: ctx.learnedToday ? "畑をタップして水をあげよう" : "1問正解したら、水をあげられるよ" };
    case "decorate":
      return ctx.bagCount > 0 ? { kind: "link", href: "/bag" } : { kind: "say", line: "アイテムをタップすると動かせるよ" };
  }
}

/** 受け取れるおつかいがあるときのひとこと(設計書3-5) */
export function errandPrompt(errands: WorldErrands): string | null {
  return claimableErrands(errands).length > 0 ? "おつかいができたね！受け取ろう" : null;
}

/** スプルのふだんのひとことの優先順: おつかい → 畑 → 復習(設計書3-5) */
export function townPrompt({
  errands,
  garden,
  review,
}: {
  errands: WorldErrands;
  garden: WorldGarden;
  review: WorldReview;
}): string | null {
  return errandPrompt(errands) ?? gardenPrompt(garden) ?? reviewPrompt(review);
}
```

`frontend/src/components/world/liveliness.ts`:

```ts
import type { WorldItem } from "./types";

/** にぎやか度の段階(設計書3-2)。E回で土地が広がったら見直す */
export const LIVELINESS_LEVELS = [
  { need: 0, label: "しずか" },
  { need: 6, label: "すこしにぎやか" },
  { need: 15, label: "にぎやか" },
  { need: 27, label: "とってもにぎやか" },
  { need: 42, label: "おまつり" },
] as const;

export const LIVELINESS_HINTS = ["ちがう種類のアイテムを置くと、ぐんとにぎやかになるよ", "仲間が増えても、にぎやかになるよ"];

const FIRST_OF_KIND = 3;
const SAME_KIND = 1;
const PER_COMPANION = 3;

export type Liveliness = { score: number; level: number; label: string; next: { label: string; remaining: number } | null };

/** 置いたアイテムは種類ごとに1つ目+3・2つ目から+1、仲間は1人+3。バッグのアイテムは数えない */
export function livelinessScore(items: Pick<WorldItem, "shop_item_id" | "x" | "y">[], companionCount: number): number {
  const perKind = new Map<number, number>();
  for (const item of items) {
    if (item.x === null || item.y === null) continue;
    perKind.set(item.shop_item_id, (perKind.get(item.shop_item_id) ?? 0) + 1);
  }
  let score = companionCount * PER_COMPANION;
  for (const count of perKind.values()) score += FIRST_OF_KIND + (count - 1) * SAME_KIND;
  return score;
}

export function levelForScore(score: number): Liveliness {
  let index = 0;
  LIVELINESS_LEVELS.forEach((level, i) => {
    if (score >= level.need) index = i;
  });
  const next = LIVELINESS_LEVELS[index + 1];
  return {
    score,
    level: index + 1,
    label: LIVELINESS_LEVELS[index].label,
    next: next ? { label: next.label, remaining: next.need - score } : null,
  };
}

export function liveliness(items: Pick<WorldItem, "shop_item_id" | "x" | "y">[], companionCount: number): Liveliness {
  return levelForScore(livelinessScore(items, companionCount));
}

export function livelinessStars(level: number): string {
  const filled = Math.max(1, Math.min(5, level));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

export function livelinessNextText(lively: Liveliness): string {
  return lively.next ? `${lively.next.label}まで あと${lively.next.remaining}` : "町はおまつり！";
}

/** 段階が上がったときのスプルのひとこと(設計書3-2) */
export function livelinessUpLine(label: string): string {
  return `町がにぎやかになったね！『${label}』になったよ`;
}
```

`frontend/src/components/world/season-greeting.ts`:

```ts
import type { CostumeKey } from "@/components/spru/spru-assets";

export type SeasonGreeting = { costume: CostumeKey; line: string };

// 期間は端末の日付の「月×100＋日」で持つ(設計書3-3)。あいさつの中の世界のひとことは公開前にOwnerが確かめる
const PERIODS: { costume: CostumeKey; from: number; to: number; line: string }[] = [
  {
    costume: "halloween",
    from: 1001,
    to: 1031,
    line: "ハッピーハロウィン！ハロウィンは、アイルランドなどに昔から伝わるお祭りがもとなんだって",
  },
  { costume: "christmas", from: 1201, to: 1225, line: "メリークリスマス！フィンランドには、サンタクロース村があるんだよ" },
  { costume: "valentine", from: 201, to: 214, line: "ハッピーバレンタイン！海外では、花やカードをおくり合うことも多いんだって" },
  { costume: "summer", from: 720, to: 831, line: "なつやすみだね！沖縄の言葉で「めんそーれ」は「ようこそ」っていう意味だよ" },
];

export function seasonGreeting(date: Date): SeasonGreeting | null {
  const monthDay = (date.getMonth() + 1) * 100 + date.getDate();
  const period = PERIODS.find((p) => monthDay >= p.from && monthDay <= p.to);
  return period ? { costume: period.costume, line: period.line } : null;
}

export function localDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shouldShowSeasonGreeting(date: Date, lastShown: string | null): boolean {
  return seasonGreeting(date) !== null && lastShown !== localDateString(date);
}

const storageKey = (profileId: number) => `spru-season-greeting:${profileId}`;

/** 「今日はもう出した」はブラウザにプロフィールごとに持つ。読めないときは出す */
export function readSeasonShown(profileId: number): string | null {
  try {
    return window.localStorage.getItem(storageKey(profileId));
  } catch {
    return null;
  }
}

export function writeSeasonShown(profileId: number, date: Date): void {
  try {
    window.localStorage.setItem(storageKey(profileId), localDateString(date));
  } catch {
    // 保存できなくても、次に開いたときにもう一度出るだけ
  }
}
```

- [ ] **Step 5: テストが通ることを確かめる**

Run（`frontend/` で）: `npm test -- errands liveliness season-greeting`
Expected: PASS（36件）

- [ ] **Step 6: 全体の確認とコミット**

Run（`frontend/` で）: `npm test && npm run typecheck && npm run lint`
Expected: テストPASS（122件）。`typecheck` は `world-screen.tsx` でエラーにならない（`WorldData` の新しい項目を読む所がまだ無いため）。lintは今までと同じ結果（新しい警告なし）

```bash
git add frontend/src/components/world/types.ts frontend/src/components/world/errands.ts frontend/src/components/world/errands.test.ts frontend/src/components/world/liveliness.ts frontend/src/components/world/liveliness.test.ts frontend/src/components/world/season-greeting.ts frontend/src/components/world/season-greeting.test.ts
git commit -m "#00124: feature:おつかいの名前・行き先・ひとことの優先順、にぎやか度、季節のあいさつの期間を決める計算を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 町のボタン・おつかいのカード・受け取りの場面・にぎやか度のカード

**Files:**
- Create: `frontend/src/lib/motion.ts`、`frontend/src/components/spru/outing-image.tsx`、`frontend/src/components/world/town-buttons.tsx`・`errand-sheet.tsx`・`errand-return.tsx`・`liveliness-card.tsx`
- Modify: `frontend/src/components/world/world-screen.tsx`、`frontend/src/app/globals.css`（`@layer` の中のアニメーションと、動きを減らす設定）

**Interfaces:**
- Consumes: Task 3の `OUTING_IMAGES`・`COSTUME_IMAGES`、Task 4の `errands.ts`・`liveliness.ts`・型、`CompanionImage`・`SpruFace`・`heartsText`（C回まで）
- Produces:
  - `prefersReducedMotion(): boolean`（`lib/motion.ts`）
  - `OutingImage({ image: OutingKey, height, className? })`・`CostumeImage({ costume: CostumeKey, height, className? })`（`components/spru/outing-image.tsx`）
  - `TownButtons({ errands, lively, familyCount, onErrands, onLiveliness })`、`ErrandSheet({ errands, busy, onClaim(errand), onGo(errand), onClose })`、`ErrandReturn({ errand, result, onClose })`、`LivelinessCard({ lively, onClose })`
  - CSSクラス `animate-outing-run-in`・`animate-outing-run-across`・`animate-outing-walk-away`・`animate-season-card`・`festive-fly`・`festive-flutter`・`festive-float`・`festive-firework`（Task 6・7でも使う）

- [ ] **Step 1: 動きの設定と絵の部品を作る**

`frontend/src/lib/motion.ts`:

```ts
/** 動きを減らす設定。描画中ではなく、effect や操作のときに呼ぶ */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

`frontend/src/components/spru/outing-image.tsx`:

```tsx
import Image from "next/image";

import { COSTUME_IMAGES, OUTING_IMAGES, type CostumeKey, type OutingKey } from "./spru-assets";

/** リュックのスプル(mascot-7)。おつかいの受け取りとお出かけの場面だけで使う(設計書6章) */
export function OutingImage({ image, height, className }: { image: OutingKey; height: number; className?: string }) {
  const asset = OUTING_IMAGES[image];
  return (
    <Image
      src={asset.src}
      alt=""
      width={Math.round((asset.width * height) / asset.height)}
      height={height}
      aria-hidden
      className={className}
    />
  );
}

/** 季節の衣装のスプル(mascot-8) */
export function CostumeImage({ costume, height, className }: { costume: CostumeKey; height: number; className?: string }) {
  const asset = COSTUME_IMAGES[costume];
  return (
    <Image
      src={asset.src}
      alt=""
      width={Math.round((asset.width * height) / asset.height)}
      height={height}
      aria-hidden
      className={className}
    />
  );
}
```

`frontend/src/app/globals.css` の `.animate-stage-start { ... }` の後（`@media (prefers-reduced-motion: reduce)` の前）に足す:

```css
  /* D回: おつかい・お出かけの場面、季節のあいさつ、にぎやか度の飾り */
  @keyframes outing-run-in {
    0% {
      transform: translateX(-180%);
    }
    100% {
      transform: translateX(0);
    }
  }
  .animate-outing-run-in {
    animation: outing-run-in 0.8s ease-out both;
  }

  @keyframes outing-run-across {
    0% {
      transform: translateX(-70vw);
    }
    100% {
      transform: translateX(70vw);
    }
  }
  .animate-outing-run-across {
    animation: outing-run-across 1s linear both;
  }

  @keyframes outing-walk-away {
    0% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translateY(-40px) scale(0.45);
      opacity: 0;
    }
  }
  .animate-outing-walk-away {
    animation: outing-walk-away 1s ease-in both;
  }

  @keyframes season-card {
    0% {
      opacity: 0;
      transform: translateY(-8px);
    }
    10% {
      opacity: 1;
      transform: translateY(0);
    }
    88% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  .animate-season-card {
    animation: season-card 3s ease-out both;
  }

  @keyframes festive-fly {
    0% {
      left: -8%;
    }
    100% {
      left: 108%;
    }
  }
  .festive-fly {
    animation: festive-fly 16s linear infinite both;
  }

  @keyframes festive-flutter {
    0%,
    100% {
      transform: translate(0, 0);
    }
    25% {
      transform: translate(10px, -8px);
    }
    50% {
      transform: translate(20px, 0);
    }
    75% {
      transform: translate(10px, 6px);
    }
  }
  .festive-flutter {
    animation: festive-flutter 5s ease-in-out infinite both;
  }

  @keyframes festive-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }
  .festive-float {
    animation: festive-float 4s ease-in-out infinite both;
  }

  @keyframes festive-firework {
    0% {
      transform: scale(0.2);
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    70% {
      transform: scale(1);
      opacity: 0.9;
    }
    100% {
      transform: scale(1.1);
      opacity: 0;
    }
  }
  .festive-firework {
    animation: festive-firework 3.2s ease-out infinite both;
  }
```

同じファイルの `@media (prefers-reduced-motion: reduce)` の中の `animation: none !important;` の対象の一覧に、`.animate-outing-run-in`・`.animate-outing-run-across`・`.animate-outing-walk-away`・`.animate-season-card`・`.festive-float` を足す。`display: none;` の対象（`.season-fall`・`.season-sparkle`）に `.festive-fly`・`.festive-flutter`・`.festive-firework` を足す。

- [ ] **Step 2: 町のボタンを作る**

`frontend/src/components/world/town-buttons.tsx`:

```tsx
import Link from "next/link";
import { Backpack, HouseHeart } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";

import { claimableErrands, claimedCount } from "./errands";
import { livelinessStars, type Liveliness } from "./liveliness";
import type { WorldErrands } from "./types";

const PILL =
  "relative flex h-9 items-center gap-1 rounded-full bg-[rgba(255,250,240,0.94)] px-3 text-[12.5px] font-black text-[#3b3226] shadow-[0_2px_6px_rgba(59,50,38,0.12)] focus-visible:outline-3 focus-visible:outline-[#f2b632]";

/** 町の名前の札の下に並べるボタン(設計書5-1) */
export function TownButtons({
  errands,
  lively,
  familyCount,
  onErrands,
  onLiveliness,
}: {
  errands: WorldErrands;
  lively: Liveliness;
  familyCount: number;
  onErrands: () => void;
  onLiveliness: () => void;
}) {
  const claimable = claimableErrands(errands).length > 0;
  const count = `${claimedCount(errands)}/${errands.items.length}`;
  return (
    <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1.5 px-2">
      <button
        type="button"
        onClick={onErrands}
        className={PILL}
        aria-label={`今日のおつかい ${count}${claimable ? "、受け取れるものがあるよ" : ""}`}
      >
        <Backpack className="h-4 w-4 text-[#3b7f26]" aria-hidden />
        <AutoFurigana text="おつかい" />
        <span>{count}</span>
        {claimable && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f28c28] text-[10px] font-black text-white"
          >
            !
          </span>
        )}
      </button>
      <button type="button" onClick={onLiveliness} className={PILL} aria-label={`にぎやか度 ${lively.label}`}>
        <AutoFurigana text="にぎやか度" />
        <span className="text-[#e0a100]">{livelinessStars(lively.level)}</span>
      </button>
      {familyCount > 0 && (
        <Link href="/family" className={PILL}>
          <HouseHeart className="h-4 w-4 text-[#d0467a]" aria-hidden />
          <AutoFurigana text="家族の町" />
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 3: おつかいのカードを作る**

`frontend/src/components/world/errand-sheet.tsx`:

```tsx
"use client";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CompanionImage } from "@/components/spru/companion-image";
import { SpruFace } from "@/components/spru/spru-figure";

import { errandLine, errandProgressText, errandTitle, isErrandDone } from "./errands";
import type { WorldErrand, WorldErrands } from "./types";

/** ［おつかい］で下から出るカード(設計書5-2) */
export function ErrandSheet({
  errands,
  busy,
  onClaim,
  onGo,
  onClose,
}: {
  errands: WorldErrands;
  busy: boolean;
  onClaim: (errand: WorldErrand) => void;
  onGo: (errand: WorldErrand) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="errand-sheet-title"
        className="relative flex w-full max-w-[480px] flex-col gap-3 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <h2 id="errand-sheet-title" className="text-lg font-black">
          <AutoFurigana text="今日のおつかい" />
        </h2>
        <ul className="flex flex-col gap-2">
          {errands.items.map((errand) => (
            <ErrandRow
              key={errand.slot}
              errand={errand}
              busy={busy}
              onClaim={() => onClaim(errand)}
              onGo={() => onGo(errand)}
            />
          ))}
        </ul>
        <p className="text-center text-sm font-bold text-[#8a6a1c]">
          <AutoFurigana text={errands.bonus.claimed ? "おまけも受け取ったよ" : `3つそろうと おまけ +${errands.bonus.amount}pt`} />
        </p>
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}

function ErrandRow({
  errand,
  busy,
  onClaim,
  onGo,
}: {
  errand: WorldErrand;
  busy: boolean;
  onClaim: () => void;
  onGo: () => void;
}) {
  const shown = Math.min(errand.progress, errand.target);
  return (
    <li className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-[0_2px_6px_rgba(59,50,38,0.08)]">
      <GiverFace errand={errand} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[11.5px] font-bold break-all text-[#6b5d45]">
          <AutoFurigana text={`${errand.giver.name}「${errandLine(errand)}」`} />
        </p>
        <p className="text-sm font-black">
          <AutoFurigana text={errandTitle(errand)} />
        </p>
        <div className="flex items-center gap-2">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-[#efe5cf]"
            role="progressbar"
            aria-label={errandTitle(errand)}
            aria-valuemin={0}
            aria-valuemax={errand.target}
            aria-valuenow={shown}
          >
            <div className="h-2 rounded-full bg-[#5bb33e]" style={{ width: `${Math.round((shown / errand.target) * 100)}%` }} />
          </div>
          <span className="text-xs font-black text-[#6b5d45]">{errandProgressText(errand)}</span>
        </div>
      </div>
      {errand.claimed ? (
        <span className="shrink-0 text-xs font-black text-[#3b7f26]">
          <AutoFurigana text="受け取ったよ" />
        </span>
      ) : isErrandDone(errand) ? (
        <button
          type="button"
          disabled={busy}
          onClick={onClaim}
          className="h-10 shrink-0 rounded-xl bg-[#f28c28] px-3 text-sm font-black text-white shadow-[0_3px_0_#c46a12] disabled:opacity-60"
        >
          <AutoFurigana text="受け取る" />
        </button>
      ) : (
        <button type="button" onClick={onGo} className="h-10 shrink-0 rounded-xl bg-[#efe5cf] px-3 text-sm font-black">
          <AutoFurigana text="やりに行く" />
        </button>
      )}
    </li>
  );
}

function GiverFace({ errand }: { errand: WorldErrand }) {
  if (errand.giver.kind === "partner" && errand.giver.key) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#f5efe1]">
        <CompanionImage companionKey={errand.giver.key} standHeight={52} />
      </span>
    );
  }
  return <SpruFace face="happy" size={40} />;
}
```

- [ ] **Step 4: 受け取りの場面とにぎやか度のカードを作る**

`frontend/src/components/world/errand-return.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { OutingImage } from "@/components/spru/outing-image";
import { prefersReducedMotion } from "@/lib/motion";

import { heartsText } from "./companions";
import type { ErrandClaimResult, WorldErrand } from "./types";

// 走ってくる動き(globals.css の outing-run-in)と同じ長さ
const RUN_MS = 800;

type Step = "run" | "reward" | "bonus";

const BUTTON = "mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]";

/** ［受け取る］の場面。リュックのスプルが走って帰ってきて、持っているものを見せる(設計書5-2) */
export function ErrandReturn({ errand, result, onClose }: { errand: WorldErrand; result: ErrandClaimResult; onClose: () => void }) {
  const [step, setStep] = useState<Step>("run");

  useEffect(() => {
    const timer = setTimeout(() => setStep((s) => (s === "run" ? "reward" : s)), prefersReducedMotion() ? 0 : RUN_MS);
    return () => clearTimeout(timer);
  }, []);

  const partner = result.partner;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(38,48,28,0.55)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="errand-return-title"
        className="flex w-full max-w-[340px] flex-col items-center gap-3 overflow-hidden rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        {step === "run" && (
          <button type="button" aria-label="とばす" onClick={() => setStep("reward")} className="flex flex-col items-center gap-3">
            <OutingImage image="run" height={150} className="animate-outing-run-in" />
            <h2 id="errand-return-title" className="text-lg font-black">
              <AutoFurigana text="ただいま！" />
            </h2>
          </button>
        )}
        {step === "reward" && (
          <>
            <OutingImage image={errand.giver.kind === "partner" ? "heart" : "apple"} height={150} className="animate-spru-hop" />
            <h2 id="errand-return-title" className="text-xl font-black text-[#2e6b1c]">
              <AutoFurigana text="おつかい、できたね！" />
            </h2>
            <p className="text-2xl font-black text-[#2e6b1c]">+{result.gained.points}pt</p>
            {partner && result.gained.bond > 0 && (
              <div className="flex flex-col items-center gap-1 text-sm font-bold text-[#2e6b1c]">
                <p>
                  <AutoFurigana text={`${partner.name}のなかよし度 +${result.gained.bond}`} />
                </p>
                {partner.hearts_up && (
                  <>
                    <p className="text-pink-600">
                      <AutoFurigana text={`${partner.name}とのなかよし度が上がった！`} />{" "}
                      <span aria-label={`ハート${partner.hearts}つ`}>{heartsText(partner.hearts)}</span>
                    </p>
                    {partner.new_line && (
                      <p className="text-[#6b5d45]">
                        <AutoFurigana text={`「${partner.new_line}」`} />
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
            <button type="button" onClick={() => (result.gained.bonus > 0 ? setStep("bonus") : onClose())} className={BUTTON}>
              <AutoFurigana text={result.gained.bonus > 0 ? "つぎへ" : "やったね"} />
            </button>
          </>
        )}
        {step === "bonus" && (
          <>
            <OutingImage image="star" height={150} className="animate-spru-hop" />
            <h2 id="errand-return-title" className="text-xl font-black text-[#2e6b1c]">
              <AutoFurigana text="3つそろった！" />
            </h2>
            <p className="text-2xl font-black text-[#2e6b1c]">
              <AutoFurigana text={`おまけ +${result.gained.bonus}pt`} />
            </p>
            <button type="button" onClick={onClose} className={BUTTON}>
              <AutoFurigana text="やったね" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

`frontend/src/components/world/liveliness-card.tsx`:

```tsx
import { AutoFurigana } from "@/components/app/auto-furigana";

import { LIVELINESS_HINTS, livelinessNextText, livelinessStars, type Liveliness } from "./liveliness";

/** ［にぎやか度］を押したときのカード(設計書5-3) */
export function LivelinessCard({ lively, onClose }: { lively: Liveliness; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(38,48,28,0.38)]">
      <button type="button" aria-label="閉じる" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="liveliness-title"
        className="relative flex w-full max-w-[480px] flex-col gap-2 rounded-t-[26px] bg-[#fffaf0] px-4 pt-4 pb-8 text-[#3b3226]"
      >
        <h2 id="liveliness-title" className="text-lg font-black">
          <AutoFurigana text="町のにぎやか度" />
        </h2>
        <p className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#e0a100]" aria-label={`星${lively.level}つ`}>
            {livelinessStars(lively.level)}
          </span>
          <span className="text-base font-black">
            <AutoFurigana text={lively.label} />
          </span>
        </p>
        <p className="text-sm font-bold text-[#6b5d45]">
          <AutoFurigana text={livelinessNextText(lively)} />
        </p>
        <ul className="mt-1 flex flex-col gap-1 rounded-2xl bg-[#f5efe1] p-3 text-[13px] font-bold text-[#5a4a30]">
          {LIVELINESS_HINTS.map((hint) => (
            <li key={hint}>
              <AutoFurigana text={hint} />
            </li>
          ))}
        </ul>
        <button type="button" onClick={onClose} className="h-11 text-sm font-bold text-[#6b5d45]">
          とじる
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 町の画面につなぐ**

`frontend/src/components/world/world-screen.tsx`:

import に足す・直す:

```tsx
import { ErrandReturn } from "./errand-return";
import { ErrandSheet } from "./errand-sheet";
import { errandGo, townPrompt } from "./errands";
import { liveliness } from "./liveliness";
import { LivelinessCard } from "./liveliness-card";
import { TownButtons } from "./town-buttons";
```

`./companions` からの import から `reviewPrompt` を外し、`./garden` からの import から `gardenPrompt` を外す（`townPrompt` の中で使う）。`./types` からの import に `ErrandClaimResult`・`WorldErrand` を足す。

state の最後（`partnerBusy` の後）に足す:

```tsx
  // おつかいのカード・受け取りの通信中の番号・受け取りの場面、にぎやか度のカード
  const [errandsOpen, setErrandsOpen] = useState(false);
  const [claimingSlot, setClaimingSlot] = useState<number | null>(null);
  const [errandReturn, setErrandReturn] = useState<{ errand: WorldErrand; result: ErrandClaimResult } | null>(null);
  const [livelinessOpen, setLivelinessOpen] = useState(false);
```

`const prompt = ...` の行を次にする:

```tsx
  const prompt = world && !placing ? townPrompt({ errands: world.errands, garden: world.garden, review: world.review }) : null;
```

`startReview()` の前に足す:

```tsx
  // 日付が変わった後の受け取りなど、おつかいだけを読み直す
  async function reloadErrands() {
    const res = await apiFetch("/api/world").catch(() => null);
    if (!res || !res.ok) return;
    const data: WorldData = await res.json();
    setWorld((prev) => (prev ? { ...prev, errands: data.errands } : prev));
  }

  async function claimErrand(errand: WorldErrand) {
    if (claimingSlot !== null) return;
    setClaimingSlot(errand.slot);
    try {
      const res = await apiFetch(`/api/errands/${errand.slot}/claim`, { method: "POST" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setErrandsOpen(false);
        setMessage(data.message ?? "通信エラーが発生しました。");
        setEvent({ kind: "error", at: Date.now() });
        reloadErrands();
        return;
      }
      const result: ErrandClaimResult = data;
      setWorld((prev) => (prev ? { ...prev, errands: result.errands, profile: { ...prev.profile, points: result.points } } : prev));
      applyPartial({ points: result.points });
      setMessage(null);
      setErrandsOpen(false);
      play("correct");
      setErrandReturn({ errand, result });
      // 相棒のなかよし度が変わると、仲間のカードのハートも変わる
      if (result.partner) reloadCompanions();
    } finally {
      setClaimingSlot(null);
    }
  }

  function goErrand(errand: WorldErrand) {
    if (!world) return;
    const go = errandGo(errand, {
      continueHref: world.continue_stage_id ? `/quiz/${world.continue_stage_id}` : "/learn",
      learnedToday: world.garden.learned_today,
      bagCount: world.bag.length,
    });
    if (go.kind === "link") {
      router.push(go.href);
      return;
    }
    setErrandsOpen(false);
    setEvent({ kind: "say", at: Date.now(), image: "think", line: go.line });
  }
```

`const sheetCompanion = ...` の行の後に足す:

```tsx
  const lively = liveliness(world.items, world.companions.length);
```

町の名前の札（`日本 · はじまりの町` の `<p>`）の直後に足す:

```tsx
        {!placingItem && (
          <TownButtons
            errands={world.errands}
            lively={lively}
            familyCount={world.family_count}
            onErrands={() => setErrandsOpen(true)}
            onLiveliness={() => setLivelinessOpen(true)}
          />
        )}
```

`{reviewCardOpen && ...}` の後に足す:

```tsx
      {errandsOpen && (
        <ErrandSheet
          errands={world.errands}
          busy={claimingSlot !== null}
          onClaim={claimErrand}
          onGo={goErrand}
          onClose={() => setErrandsOpen(false)}
        />
      )}

      {errandReturn && (
        <ErrandReturn errand={errandReturn.errand} result={errandReturn.result} onClose={() => setErrandReturn(null)} />
      )}

      {livelinessOpen && <LivelinessCard lively={lively} onClose={() => setLivelinessOpen(false)} />}
```

- [ ] **Step 6: 確認とコミット**

Run（`frontend/` で）: `npm test && npm run typecheck && npm run lint`
Expected: テストPASS（122件）、型エラーなし、lintに新しい警告なし

ブラウザ（ポート3000、町テスト、390px）で、町の名前の札の下にボタンが並び、［おつかい］でカードが出て、1つ目が「問題に5問正解する 0/5」と［やりに行く］になっていることだけ先に見る（受け取りの場面などは Task 8 でまとめて確かめる）。スクリーンショットは確認後に消す。

```bash
git add frontend/src/lib/motion.ts frontend/src/components/spru/outing-image.tsx frontend/src/components/world/town-buttons.tsx frontend/src/components/world/errand-sheet.tsx frontend/src/components/world/errand-return.tsx frontend/src/components/world/liveliness-card.tsx frontend/src/components/world/world-screen.tsx frontend/src/app/globals.css
git commit -m "#00125: feature:町におつかい・にぎやか度・家族の町のボタンを置き、おつかいのカードとリュックのスプルの受け取りの場面をつなぐ

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: にぎやか度の飾りとお祝い・季節のあいさつ・家族のあいさつが届いたとき

**Files:**
- Create: `frontend/src/components/world/festive.tsx`・`season-greeting-card.tsx`・`greetings-card.tsx`
- Modify: `frontend/src/components/world/world-screen.tsx`

**Interfaces:**
- Consumes: Task 4の `liveliness()`・`livelinessUpLine()`・`seasonGreeting()`・`shouldShowSeasonGreeting()`・`readSeasonShown()`・`writeSeasonShown()`・`WorldGreeting`、Task 5の `CostumeImage` とCSSクラス
- Produces: `Festive({ level, timeOfDay, quiet })`（Task 7でも使う）、`SeasonGreetingCard({ greeting, onDone })`、`GreetingsCard({ greetings, onClose })`

- [ ] **Step 1: にぎやか度の飾りを作る**

`frontend/src/components/world/festive.tsx`:

```tsx
import type { ReactNode } from "react";

import type { TimeOfDay } from "./time-of-day";

// 位置・速さは固定の値にして、描くたびに変わらないようにする(位置はブラウザで見て調整してよい)
const BIRDS = [
  { top: 7, delay: 0, duration: 16 },
  { top: 13, delay: 6, duration: 19 },
];
const BUTTERFLIES = [
  { left: 18, top: 58, delay: 0 },
  { left: 72, top: 62, delay: 1.8 },
];
const BALLOONS = [
  { left: 4, top: 30, color: "#f2685a", delay: 0 },
  { left: 88, top: 22, color: "#f6c342", delay: 1.2 },
  { left: 92, top: 44, color: "#5aa9e6", delay: 2.1 },
];
const FIREWORKS = [
  { left: 22, top: 10, color: "#ffd166", delay: 0 },
  { left: 70, top: 6, color: "#ff8fab", delay: 1.1 },
  { left: 48, top: 14, color: "#9bf6ff", delay: 2.2 },
];
const FLAG_COLORS = ["#f2685a", "#f6c342", "#5bb33e", "#5aa9e6"];

const BIRD: ReactNode = (
  <svg width="16" height="8" viewBox="0 0 16 8">
    <path d="M1 6 Q4 1 8 5 Q12 1 15 6" stroke="#3b3226" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </svg>
);

const BUTTERFLY: ReactNode = (
  <svg width="14" height="12" viewBox="0 0 14 12">
    <ellipse cx="4" cy="5" rx="3.5" ry="4" fill="#f7a8c8" />
    <ellipse cx="10" cy="5" rx="3.5" ry="4" fill="#f7a8c8" />
    <rect x="6.3" y="2" width="1.4" height="8" rx="0.7" fill="#5a4a30" />
  </svg>
);

function Balloon({ color }: { color: string }) {
  return (
    <svg width="16" height="30" viewBox="0 0 16 30">
      <ellipse cx="8" cy="8" rx="7" ry="8" fill={color} />
      <path d="M8 16 Q6 22 9 29" stroke="#8a7a5c" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

function Firework({ color }: { color: string }) {
  const dots = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    return { cx: 14 + Math.cos(angle) * 11, cy: 14 + Math.sin(angle) * 11 };
  });
  return (
    <svg width="28" height="28" viewBox="0 0 28 28">
      {dots.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={1.8} fill={color} />
      ))}
    </svg>
  );
}

// 糸は y = 2 + 20t(1-t) のゆるい弧。旗は弧の上に10個
function Bunting() {
  const flags = Array.from({ length: 10 }, (_, i) => {
    const x = 5 + i * 10;
    const t = x / 100;
    return { x, y: 2 + 20 * t * (1 - t), color: FLAG_COLORS[i % FLAG_COLORS.length] };
  });
  return (
    <svg className="absolute top-[4%] left-[6%] w-[88%]" viewBox="0 0 100 14" aria-hidden>
      <path d="M0 2 Q50 12 100 2" stroke="#8a7a5c" strokeWidth="0.5" fill="none" />
      {flags.map((flag) => (
        <polygon
          key={flag.x}
          points={`${flag.x - 2.5},${flag.y} ${flag.x + 2.5},${flag.y} ${flag.x},${flag.y + 5}`}
          fill={flag.color}
        />
      ))}
    </svg>
  );
}

/** にぎやか度の飾り(設計書3-2・5-3)。押せない。夜は小鳥・ちょうちょが寝ていて、22〜6時は動かさない */
export function Festive({ level, timeOfDay, quiet }: { level: number; timeOfDay: TimeOfDay; quiet: boolean }) {
  const night = timeOfDay === "night";
  const creatures = !night && !quiet;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {level >= 4 && <Bunting />}
      {level >= 2 &&
        creatures &&
        BIRDS.map((bird, i) => (
          <span
            key={`bird-${i}`}
            className="festive-fly absolute"
            style={{ top: `${bird.top}%`, animationDelay: `${bird.delay}s`, animationDuration: `${bird.duration}s` }}
          >
            {BIRD}
          </span>
        ))}
      {level >= 3 &&
        creatures &&
        BUTTERFLIES.map((butterfly, i) => (
          <span
            key={`butterfly-${i}`}
            className="festive-flutter absolute"
            style={{ left: `${butterfly.left}%`, top: `${butterfly.top}%`, animationDelay: `${butterfly.delay}s` }}
          >
            {BUTTERFLY}
          </span>
        ))}
      {level >= 5 &&
        BALLOONS.map((balloon, i) => (
          <span
            key={`balloon-${i}`}
            className={quiet ? "absolute" : "festive-float absolute"}
            style={{ left: `${balloon.left}%`, top: `${balloon.top}%`, animationDelay: `${balloon.delay}s` }}
          >
            <Balloon color={balloon.color} />
          </span>
        ))}
      {level >= 5 &&
        night &&
        !quiet &&
        FIREWORKS.map((firework, i) => (
          <span
            key={`firework-${i}`}
            className="festive-firework absolute"
            style={{ left: `${firework.left}%`, top: `${firework.top}%`, animationDelay: `${firework.delay}s` }}
          >
            <Firework color={firework.color} />
          </span>
        ))}
    </div>
  );
}
```

- [ ] **Step 2: 季節のあいさつと、家族のあいさつのカードを作る**

`frontend/src/components/world/season-greeting-card.tsx`:

```tsx
"use client";

import { useEffect } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { CostumeImage } from "@/components/spru/outing-image";

import type { SeasonGreeting } from "./season-greeting";

// globals.css の season-card と同じ長さ
const SHOW_MS = 3_000;

/** 期間中に町を開いたときの、衣装のスプルのあいさつ(設計書5-4)。onDone は useCallback で固定して渡す */
export function SeasonGreetingCard({ greeting, onDone }: { greeting: SeasonGreeting; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4" role="status">
      <button
        type="button"
        onClick={onDone}
        className="animate-season-card pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-2xl bg-[#fffaf0] p-3 text-left text-[#3b3226] shadow-[0_8px_22px_rgba(0,0,0,0.2)]"
      >
        <CostumeImage costume={greeting.costume} height={84} className="shrink-0" />
        <span className="text-sm leading-relaxed font-black">
          <AutoFurigana text={greeting.line} />
        </span>
      </button>
    </div>
  );
}
```

`frontend/src/components/world/greetings-card.tsx`:

```tsx
import { AutoFurigana } from "@/components/app/auto-furigana";
import { SpruFigure } from "@/components/spru/spru-figure";

import type { WorldGreeting } from "./types";

/** 家族からあいさつが届いていたとき(設計書5-6) */
export function GreetingsCard({ greetings, onClose }: { greetings: WorldGreeting[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-[rgba(38,48,28,0.45)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="greetings-title"
        className="animate-pop-in flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl bg-[#fffaf0] px-5 pt-6 pb-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)]"
      >
        <SpruFigure image="jump" standHeight={110} className="animate-spru-hop" />
        <h2 id="greetings-title" className="text-lg font-black text-[#2e6b1c]">
          <AutoFurigana text="家族が遊びに来てくれたよ！" />
        </h2>
        <ul className="flex max-h-[40vh] w-full flex-col gap-1.5 overflow-y-auto">
          {greetings.map((greeting) => (
            <li key={greeting.id} className="rounded-2xl bg-white px-3 py-2 text-sm font-bold break-all">
              <AutoFurigana text={`${greeting.from.name}が遊びに来てくれたよ！「${greeting.text}」`} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-[52px] w-full rounded-2xl bg-[#3b7f26] text-base font-black text-white shadow-[0_4px_0_#285a19]"
        >
          <AutoFurigana text="ありがとう" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 町の画面につなぐ**

`frontend/src/components/world/world-screen.tsx`:

import を直す・足す:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
```

```tsx
import { Festive } from "./festive";
import { GreetingsCard } from "./greetings-card";
import { liveliness, livelinessUpLine } from "./liveliness";
import {
  readSeasonShown,
  seasonGreeting,
  shouldShowSeasonGreeting,
  writeSeasonShown,
  type SeasonGreeting,
} from "./season-greeting";
import { SeasonGreetingCard } from "./season-greeting-card";
```

（Task 5で足した `import { liveliness } from "./liveliness";` はこの行に置き換える。）`./types` からの import に `WorldGreeting` を足す。

Task 5で足した state の後に足す:

```tsx
  // 家族から届いたあいさつ(閉じるまで出す)と、今日まだ出していない季節のあいさつ
  const [greetings, setGreetings] = useState<WorldGreeting[]>([]);
  const [season, setSeason] = useState<SeasonGreeting | null>(null);
  const profileId = world?.profile.id ?? null;
  // 町は1秒ごとに描き直すので、季節のカードのタイマーがやり直しにならないよう固定する
  const closeSeason = useCallback(() => {
    if (profileId !== null) writeSeasonShown(profileId, new Date());
    setSeason(null);
  }, [profileId]);
```

最初に町を読み込むeffectの `setWorld(data);` の直後に足す:

```tsx
        setGreetings(data.greetings);
        const opened = new Date();
        if (shouldShowSeasonGreeting(opened, readSeasonShown(data.profile.id))) setSeason(seasonGreeting(opened));
```

`reloadCompanions` を、読み直した町の情報を返す形にする:

```tsx
  // 仲間が生まれた後は、相棒・立ち位置・復習を出す人が変わるため読み直す
  async function reloadCompanions(): Promise<WorldData | null> {
    const res = await apiFetch("/api/world").catch(() => null);
    if (!res || !res.ok) return null;
    const data: WorldData = await res.json();
    applyCompanions(data);
    return data;
  }
```

`handleBornClose` の `reloadCompanions();` の行を次にする（生まれて段階が上がったらお祝い）:

```tsx
    const before = liveliness(world?.items ?? [], world?.companions.length ?? 0).level;
    reloadCompanions().then((data) => {
      if (!data) return;
      const after = liveliness(data.items, data.companions.length);
      if (after.level > before) setEvent({ kind: "say", at: Date.now(), image: "jump", line: livelinessUpLine(after.label) });
    });
```

`placeAt` を次にする（置いて段階が上がったときだけ、いつものひとことの代わりにお祝い。動かしただけでは数が変わらないので出ない）:

```tsx
  async function placeAt(x: number, y: number) {
    if (!placingItem || !world) return;
    const item = placingItem;
    const before = liveliness(world.items, world.companions.length).level;
    const after = liveliness([...world.items.filter((i) => i.id !== item.id), { ...item, x, y }], world.companions.length);
    setPlacingId(null);
    setMessage(null);
    if (await moveItem(item, x, y)) {
      play("correct");
      setPoppedItemId(item.id);
      setEvent(
        after.level > before
          ? { kind: "say", at: Date.now(), image: "jump", line: livelinessUpLine(after.label) }
          : { kind: "placed", at: Date.now(), itemName: item.name },
      );
    }
  }
```

`startReview()` の前に足す:

```tsx
  // 閉じたら、出したあいさつだけに見た印を付ける。その間に届いたものは続けて出す
  async function closeGreetings() {
    const ids = greetings.map((greeting) => greeting.id);
    setGreetings([]);
    const res = await apiFetch("/api/world/greetings/seen", { method: "POST", body: JSON.stringify({ ids }) }).catch(() => null);
    if (!res || !res.ok) return;
    const data: { greetings: WorldGreeting[] } = await res.json();
    if (data.greetings.length > 0) setGreetings(data.greetings);
  }
```

町の絵の `<Ambience ... />` の前に足す:

```tsx
          <Festive level={lively.level} timeOfDay={timeOfDay} quiet={isSpruSleepTime(new Date(now))} />
```

`{world.welcome_available && (<WelcomeGift ... />)}` の後に足す（はじめてのプレゼント → 家族のあいさつ → 季節のあいさつ の順に1つずつ）:

```tsx
      {!world.welcome_available && greetings.length > 0 && <GreetingsCard greetings={greetings} onClose={closeGreetings} />}

      {!world.welcome_available && greetings.length === 0 && season && (
        <SeasonGreetingCard greeting={season} onDone={closeSeason} />
      )}
```

- [ ] **Step 4: 確認とコミット**

Run（`frontend/` で）: `npm test && npm run typecheck && npm run lint`
Expected: テストPASS（122件）、型エラーなし、lintに新しい警告なし（`useCallback` の依存は `profileId` だけ）

```bash
git add frontend/src/components/world/festive.tsx frontend/src/components/world/season-greeting-card.tsx frontend/src/components/world/greetings-card.tsx frontend/src/components/world/world-screen.tsx
git commit -m "#00126: feature:にぎやか度の飾りと段階が上がったときのお祝い、季節のあいさつ、家族から届いたあいさつを町に出す

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 家族の町の画面

**Files:**
- Create: `frontend/src/app/family/page.tsx`、`frontend/src/app/family/[profileId]/page.tsx`、`frontend/src/components/family/family-town.tsx`・`greet-panel.tsx`・`outing-scene.tsx`
- Modify: `frontend/src/components/world/world-scene.tsx`（`readOnly`）

**Interfaces:**
- Consumes: Task 1のAPI、Task 4の型（`FamilyMember`・`FamilyTown`）と `liveliness()`・`livelinessStars()`、Task 5の `OutingImage`・`prefersReducedMotion()`・CSS、Task 6の `Festive`、`WorldScene`・`Ambience`・`pickTownMood`・`pickLine`・`bloomOf`（C回まで）
- Produces: `WorldScene` の `readOnly?: boolean`（アイテム・畑のボタンと畑の光を出さない）、`/family`・`/family/[profileId]`

- [ ] **Step 1: 町の絵に「見るだけ」を足す**

`frontend/src/components/world/world-scene.tsx`:

引数に `readOnly = false,`（`quiet,` の後）、型に `readOnly?: boolean;`（`quiet: boolean;` の後）を足す。

`const gardenGlow = ...` の行を次にする:

```tsx
  const gardenGlow = !placing && !readOnly && (garden.can_sow || garden.can_water);
```

`tapTargets` を次にする（家族の町では、アイテムと畑は押せない。仲間は押せる）:

```tsx
  // 押せる範囲は上に伸びて奥の物と重なるため、絵と同じく奥から順に並べて手前のボタンを上にする。置く場所を選んでいる間は出さない。
  // 畑は地面の上にあり、手前のアイテムの(背の高い物用に長い)範囲に隠れないよう最後に置く。見るだけ(家族の町)ではアイテムと畑は押せない
  const itemTargets: TapTarget[] = readOnly
    ? []
    : placed.map((item) => ({
        id: `item-button-${item.id}`,
        x: item.x,
        y: item.y,
        label: `${item.name}(動かす・しまう)`,
        onTap: () => onItemTap(item),
        halfWidth: HALF_W - 4,
        up: 56,
        down: 14,
      }));
  const gardenTarget: TapTarget[] = readOnly
    ? []
    : [{ id: "garden-button", x: garden.x, y: garden.y, label: "畑", onTap: onGardenTap, halfWidth: 22, up: 36, down: 12 }];
  const tapTargets: TapTarget[] = placing
    ? []
    : [
        ...itemTargets,
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
      ]
        .sort(byDepth)
        .concat(gardenTarget);
```

- [ ] **Step 2: お出かけの場面とあいさつの部品を作る**

`frontend/src/components/family/outing-scene.tsx`:

```tsx
"use client";

import { useEffect } from "react";

import { OutingImage } from "@/components/spru/outing-image";
import { prefersReducedMotion } from "@/lib/motion";

// globals.css の outing-run-across・outing-walk-away と同じ長さ
const OUTING_MS = 1_000;

/** 家族の町へのお出かけ。行くときは走って横切り、もどるときは後ろ姿で小さくなる(設計書5-5)。onDone は useCallback で固定して渡す */
export function OutingScene({ kind, onDone }: { kind: "depart" | "home"; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, prefersReducedMotion() ? 0 : OUTING_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <button
      type="button"
      aria-label="とばす"
      onClick={onDone}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#8fd4e9]"
    >
      {kind === "depart" ? (
        <OutingImage image="run" height={140} className="animate-outing-run-across" />
      ) : (
        <OutingImage image="back" height={140} className="animate-outing-walk-away" />
      )}
    </button>
  );
}
```

`frontend/src/components/family/greet-panel.tsx`:

```tsx
"use client";

import { useState } from "react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { apiFetch } from "@/lib/api";

// サーバーの config/world.php の greeting_stamps と同じ(設計書3-4)
const GREETING_STAMPS = [
  { key: "hello", text: "やっほー！" },
  { key: "nice_town", text: "すてきな町だね！" },
  { key: "cheer", text: "いっしょにがんばろう！" },
];

const ALREADY = "今日はもうあいさつしたよ";

/** 家族の町の下の「あいさつする」(設計書5-5) */
export function GreetPanel({ profileId, greeted, onGreeted }: { profileId: number; greeted: boolean; onGreeted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(stamp: string) {
    if (busy || greeted) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/family/${profileId}/greet`, { method: "POST", body: JSON.stringify({ stamp }) }).catch(
        () => null,
      );
      const data = res ? await res.json().catch(() => ({})) : {};
      // 別の画面で先に送っていたときも「あいさつした」にそろえる
      if (res?.ok || data.message === ALREADY) {
        setError(null);
        onGreeted();
        return;
      }
      setError(data.message ?? "通信エラーが発生しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="greet-title"
      className="mx-4 mt-4 flex flex-col gap-2 rounded-2xl bg-[rgba(255,250,240,0.96)] p-3 shadow-[0_2px_8px_rgba(59,50,38,0.14)]"
    >
      <h2 id="greet-title" className="text-sm font-black text-[#3b3226]">
        <AutoFurigana text={greeted ? ALREADY : "あいさつする"} />
      </h2>
      <div className="grid grid-cols-3 gap-1.5">
        {GREETING_STAMPS.map((stamp) => (
          <button
            key={stamp.key}
            type="button"
            disabled={busy || greeted}
            onClick={() => send(stamp.key)}
            className="min-h-11 rounded-xl bg-[#3b7f26] px-1.5 py-2 text-[13px] font-black text-white disabled:bg-[#cfc6b3]"
          >
            <AutoFurigana text={stamp.text} />
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs font-bold text-[#a33a22]">
          {error}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 3: 家族の町の本体を作る**

`frontend/src/components/family/family-town.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import { useSound } from "@/components/app/sound-provider";
import { bloomOf } from "@/components/spru/bloom";
import { pickTownMood, type TownEvent } from "@/components/spru/mood";
import { Ambience, TIME_THEME } from "@/components/world/ambience";
import { pickLine } from "@/components/world/companions";
import { Festive } from "@/components/world/festive";
import { liveliness, livelinessStars } from "@/components/world/liveliness";
import { getSeason, getTimeOfDay, isSpruSleepTime } from "@/components/world/time-of-day";
import type { FamilyTown as FamilyTownData, WorldGarden } from "@/components/world/types";
import { WorldScene } from "@/components/world/world-scene";
import { apiFetch } from "@/lib/api";

import { GreetPanel } from "./greet-panel";
import { OutingScene } from "./outing-scene";

// 仲間をタップしたときの吹き出しを出しておく時間(町と同じ)
const COMPANION_TALK_MS = 3_000;
const NO_TILES = new Set<string>();
const noop = () => {};

type LoadState = { kind: "ready"; town: FamilyTownData } | { kind: "missing" };

/** 家族の町(見るだけ。設計書5-5) */
export function FamilyTown({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { play } = useSound();
  const [state, setState] = useState<LoadState | undefined>(undefined);
  const [outing, setOuting] = useState<"depart" | "home" | null>("depart");
  const [now, setNow] = useState(() => Date.now());
  const [lastInteractionAt, setLastInteractionAt] = useState(() => Date.now());
  const [event, setEvent] = useState<TownEvent | null>(null);
  const [nightWokenAt, setNightWokenAt] = useState<number | null>(null);
  const [companionTalk, setCompanionTalk] = useState<{ key: string; at: number; line: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    apiFetch(`/api/family/${profileId}`)
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (res.status === 422) {
          // 自分の町なら自分の町へ、プロフィールを選んでいなければ選ぶ画面へ
          router.replace(data.message === "自分の町だよ" ? "/" : "/profiles");
          return;
        }
        if (!res.ok) {
          setState({ kind: "missing" });
          return;
        }
        const town: FamilyTownData = data;
        setState({ kind: "ready", town });
        setEvent({ kind: "say", at: Date.now(), image: "wave", line: `${town.profile.name}の町へ、ようこそ！` });
      })
      .catch(() => setState({ kind: "missing" }));
  }, [profileId, router]);

  // 町は1秒ごとに描き直すので、お出かけの場面のタイマーがやり直しにならないよう固定する
  const finishOuting = useCallback(() => {
    if (outing === "home") router.push("/");
    else setOuting(null);
  }, [outing, router]);

  const mood = pickTownMood({
    now,
    lastInteractionAt,
    event,
    nightWokenAt,
    placing: false,
    prompt: "ゆっくり見ていってね",
  });
  const talk = companionTalk && now - companionTalk.at < COMPANION_TALK_MS ? companionTalk : null;

  function handleSpruTap() {
    const at = Date.now();
    setLastInteractionAt(at);
    if (mood.sleeping) {
      if (isSpruSleepTime(new Date(at))) setNightWokenAt(at);
      setEvent({ kind: "woke", at });
      return;
    }
    setEvent({ kind: "say", at, image: "wave", line: "やっほー！来てくれてありがとう" });
  }

  function handleCompanionTap(key: string) {
    if (state?.kind !== "ready") return;
    const companion = state.town.companions.find((c) => c.key === key);
    if (!companion) return;
    setCompanionTalk({ key, at: Date.now(), line: pickLine(companion.lines, Math.random()) });
  }

  function handleGreeted() {
    if (state?.kind !== "ready") return;
    setState({ kind: "ready", town: { ...state.town, greeted_today: true } });
    play("correct");
    setEvent({ kind: "say", at: Date.now(), image: "jump", line: "あいさつしたよ！" });
  }

  const timeOfDay = getTimeOfDay(new Date(now));
  const quiet = isSpruSleepTime(new Date(now));

  return (
    <div
      className="min-h-screen transition-[background] duration-700"
      style={{ background: TIME_THEME[timeOfDay].background }}
      onPointerDown={() => setLastInteractionAt(Date.now())}
    >
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        {state === undefined && <p className="mt-16 text-center text-sm">読み込み中...</p>}

        {state?.kind === "missing" && (
          <div className="mx-4 mt-16 flex flex-col items-center gap-3 rounded-2xl bg-[#fffaf0] p-5 text-center">
            <p className="text-sm font-bold">
              <AutoFurigana text="町が見つからなかったよ" />
            </p>
            <Link href="/family" className="rounded-full bg-[#3b7f26] px-4 py-2 text-sm font-black text-white">
              <AutoFurigana text="家族の町の一覧へ" />
            </Link>
          </div>
        )}

        {state?.kind === "ready" && (
          <ReadyTown
            town={state.town}
            mood={mood}
            timeOfDay={timeOfDay}
            now={now}
            quiet={quiet}
            talk={talk}
            onSpruTap={handleSpruTap}
            onCompanionTap={handleCompanionTap}
            onGreeted={handleGreeted}
            onHome={() => setOuting("home")}
          />
        )}
      </div>

      <BottomNav />

      {outing && <OutingScene kind={outing} onDone={finishOuting} />}
    </div>
  );
}

function ReadyTown({
  town,
  mood,
  timeOfDay,
  now,
  quiet,
  talk,
  onSpruTap,
  onCompanionTap,
  onGreeted,
  onHome,
}: {
  town: FamilyTownData;
  mood: ReturnType<typeof pickTownMood>;
  timeOfDay: ReturnType<typeof getTimeOfDay>;
  now: number;
  quiet: boolean;
  talk: { key: string; at: number; line: string } | null;
  onSpruTap: () => void;
  onCompanionTap: (key: string) => void;
  onGreeted: () => void;
  onHome: () => void;
}) {
  const lively = liveliness(town.items, town.companions.length);
  // 見るだけなので、水やりなどの状態は持たない(畑の見た目だけ)
  const garden: WorldGarden = {
    ...town.garden,
    waterings: 0,
    learned_today: false,
    watered_today: false,
    can_sow: false,
    can_water: false,
  };

  return (
    <>
      <header className="flex items-center justify-between gap-2 rounded-b-[22px] bg-[#fffaf0] px-3.5 py-3 shadow-[0_4px_14px_rgba(59,50,38,0.14)]">
        <div className="min-w-0">
          <h1 className="text-lg font-black break-all text-[#2f4a22]">
            <AutoFurigana text={`${town.profile.name}の町`} />
          </h1>
          <p className="text-xs font-bold text-[#6b5d45]">
            Lv.{town.profile.level} ・ <AutoFurigana text="にぎやか度" />{" "}
            <span className="text-[#e0a100]">{livelinessStars(lively.level)}</span> <AutoFurigana text={lively.label} />
          </p>
        </div>
        <button type="button" onClick={onHome} className="shrink-0 rounded-full bg-[#3b7f26] px-3 py-2 text-sm font-black text-white">
          <AutoFurigana text="自分の町にもどる" />
        </button>
      </header>

      <div className="relative mt-3 px-1">
        <WorldScene
          readOnly
          land={town.land}
          items={town.items}
          validTiles={NO_TILES}
          placing={false}
          onTileTap={noop}
          onItemTap={noop}
          spru={mood}
          bloom={bloomOf(town.spru.growth)}
          onSpruTap={onSpruTap}
          timeOfDay={timeOfDay}
          poppedItemId={null}
          garden={garden}
          onGardenTap={noop}
          companions={town.companions}
          onCompanionTap={onCompanionTap}
          companionTalk={talk}
          reviewGiver={null}
          quiet={quiet}
        />
        <Festive level={lively.level} timeOfDay={timeOfDay} quiet={quiet} />
        <Ambience timeOfDay={timeOfDay} season={getSeason(new Date(now))} />
      </div>

      <GreetPanel profileId={town.profile.id} greeted={town.greeted_today} onGreeted={onGreeted} />
    </>
  );
}
```

- [ ] **Step 4: ページを作る**

`frontend/src/app/family/[profileId]/page.tsx`:

```tsx
"use client";

import { use } from "react";

import { FamilyTown } from "@/components/family/family-town";

export default function Page({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params);
  return <FamilyTown profileId={profileId} />;
}
```

`frontend/src/app/family/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, HouseHeart } from "lucide-react";

import { AutoFurigana } from "@/components/app/auto-furigana";
import { BottomNav } from "@/components/app/bottom-nav";
import type { FamilyMember } from "@/components/world/types";
import { apiFetch } from "@/lib/api";

/** 家族の町の一覧(設計書5-5) */
export default function FamilyPage() {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/family")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 422) {
          router.replace("/profiles");
          return;
        }
        if (!res.ok) {
          setError("通信エラーが発生しました。");
          return;
        }
        setMembers(await res.json());
      })
      .catch(() => setError("通信エラーが発生しました。"));
  }, [router]);

  return (
    <div className="min-h-screen bg-[#8fd4e9]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col pb-28 text-[#3b3226]">
        <header className="flex items-center justify-between gap-2 rounded-b-[22px] bg-[#fffaf0] px-3.5 py-3 shadow-[0_4px_14px_rgba(59,50,38,0.14)]">
          <h1 className="flex items-center gap-1.5 text-lg font-black text-[#2f4a22]">
            <HouseHeart className="h-5 w-5 text-[#d0467a]" aria-hidden />
            <AutoFurigana text="家族の町" />
          </h1>
          <Link href="/" className="shrink-0 rounded-full bg-[#efe5cf] px-3 py-1.5 text-sm font-black">
            <AutoFurigana text="自分の町にもどる" />
          </Link>
        </header>

        {error && (
          <p role="alert" className="mx-4 mt-4 rounded-xl bg-[#fdebe5] px-3 py-2 text-sm font-bold text-[#a33a22]">
            {error}
          </p>
        )}

        {members === null && !error && <p className="mt-16 text-center text-sm">読み込み中...</p>}

        {members !== null && members.length === 0 && (
          <div className="mx-4 mt-6 flex flex-col items-center gap-3 rounded-2xl bg-[#fffaf0] p-5 text-center">
            <p className="text-sm font-bold">
              <AutoFurigana text="家族のプレイヤーを増やすと、町を見に行けるよ" />
            </p>
            <Link href="/profiles" className="rounded-full bg-[#3b7f26] px-4 py-2 text-sm font-black text-white">
              <AutoFurigana text="プロフィールへ" />
            </Link>
          </div>
        )}

        {members !== null && members.length > 0 && (
          <ul className="mx-4 mt-4 flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.id}>
                <Link
                  href={`/family/${member.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-[#fffaf0] p-3 shadow-[0_2px_8px_rgba(59,50,38,0.12)]"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-black break-all">{member.name}</span>
                    <span className="text-xs font-bold text-[#6b5d45]">
                      Lv.{member.level}
                      {member.greeted_today && (
                        <>
                          {" ・ "}
                          <AutoFurigana text="あいさつしたよ" />
                        </>
                      )}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#8a7a5c]" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 5: 確認とコミット**

Run（`frontend/` で）: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: テストPASS（122件）、型エラーなし、lintに新しい警告なし、本番ビルド成功（`/family`・`/family/[profileId]` が出力に並ぶ）

```bash
git add frontend/src/components/world/world-scene.tsx frontend/src/components/family frontend/src/app/family
git commit -m "#00127: feature:家族の町の一覧と、見るだけの家族の町(お出かけの場面・あいさつ)の画面を追加

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: ブラウザでの確認とドキュメント

**Files:**
- Modify: `SPEC.md`（1章の構想の行・4-9・6-1）、`TASKS.md`（D回の行）、`../../company/mascot/CLAUDE.md`（主要な意思決定の末尾に追記）
- 画面の不具合が見つかったら、その部品のファイル（修正は1件ごとにコミット）

**Interfaces:**
- Consumes: Task 1〜7のすべて

- [ ] **Step 1: 確認の準備（開発DB）**

Run: `./vendor/bin/sail artisan tinker --execute="echo json_encode(App\Models\UserProfile::where('name','町テスト')->first()->only(['id','level','xp','hp','coins','points','bloom_base_level','last_correct_on','combo','best_combo','current_streak','best_streak','last_played_date','partner_companion_key','last_review_on']));"`

出てきた値をメモする（確認後にこの値へ戻す）。町テストの仲間・種・置いたアイテム・バッグの一覧も `->companions`・`->seeds`・`->worldItems` で同じようにメモする。

- [ ] **Step 2: おつかい（スマホ幅390px・PC幅1280px）**

ポート3000で `test@example.com` / `password` → 町テスト。
- 町の名前の札の下にボタンが3つ（家族が1人の間は2つ）。［おつかい 0/3］でカード。1つ目が「問題に5問正解する 0/5」
- 「つづきから学ぶ」でステージを解き、5問正解して町に戻る → ［おつかい］に「！」、スプルが「おつかいができたね！受け取ろう」
- ［受け取る］→ リュックのスプルが走ってきて、りんごと「+20pt」→［やったね］→ 上のポイントが+20
- **レビューで見る点2**: ［受け取る］を素早く2回押しても、ポイントは+20が1回だけ、場面も1回
- 相棒がいる状態にして（開発DBで町テストに仲間を1人作って相棒にする）、次の日のおつかい（テスト用ブラウザの時計を翌日にして町を開き直す）の3つ目に相棒の顔が出る。やりとげて受け取ると、ハートの絵と「〇〇のなかよし度 +3」
- 3つ目を受け取ると［つぎへ］→ 星と「3つそろった！ おまけ +30pt」
- **レビューで見る点1**: 町を開いたまま、テスト用ブラウザの時計を0時の直後に進めて（開発DBの記録はそのまま）［受け取る］→「まだおつかいが終わっていないよ」、カードが閉じ、もう一度開くと新しい日のおつかいになっている
- ［やりに行く］: 正解→クイズ、水やり（畑に芽がある日）→カードが閉じてスプルが教える、もようがえ→バッグが空ならスプルが教える・アイテムがあれば `/bag`

- [ ] **Step 3: にぎやか度・季節のあいさつ・届いたあいさつ**

- ［にぎやか度 ★☆☆☆☆］でカード（段階・「すこしにぎやかまで あと〇」・ヒント2行）
- 開発DBで町テストにアイテムを渡し、置いていって段階2→3→4→5の飾りが増える（小鳥・ちょうちょ・旗・風船）。夜（ブラウザの時計を20時）は小鳥・ちょうちょが出ず、段階5で花火。23時は花火が出ず、風船が止まる
- **レビューで見る点3**: 置いて段階が上がったときだけスプルがジャンプして「町がにぎやかになったね！『〇〇』になったよ」。置いてあるアイテムを動かしただけ・しまったとき・町を開き直したときは出ない
- 季節のあいさつ: テスト用ブラウザの時計を10月5日にして町を開く → ハロウィンの衣装のスプルのカードが3秒で消える。開き直しても同じ日は出ない。時計を10月6日にすると出る。11月1日は出ない
- **レビューで見る点4**: 下の家族の町の確認で作る2人目のプロフィールで、初めて町を開く前に町テストからあいさつを送っておき、時計を10月にして開く → はじめてのプレゼント → 家族のあいさつ（［ありがとう］）→ 季節のあいさつ の順に1つずつ出る

- [ ] **Step 4: 家族の町**

- プロフィールの画面で確認用の2人目「かくにん」を作る → 町テストの町に［家族の町］が出る
- ［家族の町］→ 一覧に「かくにん Lv.1」→ 押すとリュックのスプルが走って横切り、「かくにんの町」が出る。ポイント・HP・おつかいの表示が無い。アイテム・畑を押しても何も起きない。仲間がいれば吹き出しだけ。スプルを押すと手を振る
- ［やっほー！］→「あいさつしたよ！」、ボタンが押せなくなる。一覧に「あいさつしたよ」
- ［自分の町にもどる］→ 後ろ姿のスプルが小さくなって自分の町へ。おつかいに「家族の町にあいさつに行く」が出ていれば 1/1
- 「かくにん」に切り替えて町を開く → 「町テストが遊びに来てくれたよ！「やっほー！」」→［ありがとう］→ 開き直しても出ない
- `/family/{町テストのid}` を「かくにん」以外の自分で開く → 自分の町へ移る。存在しないid → 「町が見つからなかったよ」
- **レビューで見る点5**: 390pxで、町のボタン3つ（「おつかい 3/3」＋「！」・「にぎやか度 ★★★★★」・「家族の町」）が1行に収まり、ふりがなを出しても崩れない。「かくにん」の名前を長め（例: 「かくにんぷれいやーさん」の11文字）に変えて、一覧・家族の町の見出し・あいさつのボタンが崩れない
- 確認が終わったら「かくにん」を消す（あいさつ・おつかいの行も一緒に消える）

- [ ] **Step 5: 開発DBを元に戻す**

Step 1でメモした値に `tinker` で戻す（町テストの `update([...])`、確認用に足した仲間・種・アイテムを消す）。答えの記録・ステージの進み具合・おつかいの行は、B回・C回と同じく残してよい（残したものは最終報告に書く）。スクリーンショットをすべて消す。

- [ ] **Step 6: ドキュメントを更新する**

`SPEC.md`:
- 1章の「仲間と成長の構想」の行の `D: 今日のおつかい・にぎやか度・家族の町` を `D: 今日のおつかい・にぎやか度・家族の町（実装済み、`docs/design/2026-09-27-spru-wave-d-design.md`）` にする
- 4-9 の C回の行の後（「⚠️ 仲間の絵は1人1枚…」の前）に足す:

```markdown
- ✅（2026-09-27、D回）今日のおつかい: 1日3つ（日本時間0時で入れ替わり、その日に初めて町を開いたときに決まる）。1つ目は「問題に5問正解する」、2つ目・3つ目は「ステージを1つクリア」「芽に水をあげる」「仲間の復習をやりきる」「町のもようがえ」「家族の町にあいさつ」のうちその日に出せるものから（足りなければ「10問正解」）。3つ目は相棒が頼む。進み具合は答えの記録などから数え、［受け取る］で学習ポイント+20（相棒のおつかいはなかよし度+3も）、3つそろうとおまけ+30。受け取らないまま日が変わると消える。受け取るとリュックのスプル（mascot-7）が走って帰ってきて、りんご・ハート・星を持っている（`app/Support/Errands.php`、`GET /api/world` の `errands`・`POST /api/errands/{slot}/claim`）
- ✅（D回）町のにぎやか度: 置いたアイテム（種類ごとに1つ目+3・2つ目から+1）と仲間（1人+3）で5段階（しずか・すこしにぎやか・にぎやか・とってもにぎやか・おまつり、6/15/27/42）。段階ごとに小鳥・ちょうちょ・旗の飾り・風船と夜の花火が町に増え、置いて段階が上がるとスプルがお祝いする。見た目だけなので画面側で計算する（`components/world/liveliness.ts`・`festive.tsx`）
- ✅（D回）家族の町: 同じ家族アカウントのほかのプレイヤーの町を見るだけで見に行ける（`/family`・`/family/[id]`、ポイント・HP・バッグ・おつかいは見えない）。決まったことば3つから1人に1日1回あいさつでき、受け取った人は次に町を開いたときに見る。あいさつにごほうびは無い（`app/Support/Family.php`、`GET /api/family`・`GET /api/family/{profile}`・`POST /api/family/{profile}/greet`・`POST /api/world/greetings/seen`）
- ✅（D回）季節のあいさつ: ハロウィン（10月）・クリスマス（12/1〜25）・バレンタイン（2/1〜14）・夏休み（7/20〜8/31）の間に町を開くと、衣装のスプル（mascot-8）が世界のひとこと付きで1日1回あいさつする（端末の日付。「今日はもう出した」はブラウザに持つ）。あいさつの中の世界のひとことは公開前のコンテンツレビューで確かめる
```

- 4-9 の「⚠️ スプルの画像は素材集（`company/mascot/assets/mascot-4〜6.png`・`mascot-logo.png`）から…」の `mascot-4〜6.png` を `mascot-4〜8.png` にする
- 6-1 の `2026-09-27時点で86件` をフロントのテスト数（Task 7の結果、122件）にする

`TASKS.md`:
- D回の行を次にする:

```markdown
- [x] **D回: 今日のおつかい（1日3つ）、町のにぎやか度（5段階の飾り）、家族の町を見に行く（同じ家族アカウント内だけ・1日1回のあいさつ）、季節のあいさつ（期間限定の衣装）**（2026-09-27。設計書 `docs/design/2026-09-27-spru-wave-d-design.md`、実装計画 `docs/design/2026-09-27-spru-wave-d-plan.md`。リュックのスプル（mascot-7）と衣装（mascot-8）を切り抜いて使用）
```

- 「後回し: 着せ替え（国ごとの帽子）、図鑑。…」の行に「季節の衣装（mascot-8）は、D回では季節のあいさつのカードだけで使っている」を足す

`../../company/mascot/CLAUDE.md` の主要な意思決定の最後の行（B回の追記）の後に、同じ形で追記する（既存の行は変えない）:

```markdown
  - 2026-09-27追記（D回）: リュックを背負ったスプル（走る・歩く・後ろ姿・りんご／ハート／星を持つ）は mascot-7、期間限定の衣装4つ（ハロウィン・クリスマス・バレンタイン・夏）は mascot-8 から切り抜いて使用中（おつかいの受け取り・家族の町へのお出かけの場面・季節のあいさつ）。mascot-7-2 は頭の形がほかとちがうため未使用。町の道を歩き回る（コマ送り）は未実装
```

- [ ] **Step 7: 全体の確認とコミット**

Run: `./vendor/bin/sail artisan test` と（`frontend/` で）`npm test && npm run typecheck && npm run lint && npm run build`
Expected: バックエンド258件PASS、フロント122件PASS、型エラーなし、lintに新しい警告なし、本番ビルド成功

```bash
git add SPEC.md TASKS.md
git commit -m "#00128: docs:スプルのD回(今日のおつかい・にぎやか度・家族の町・季節のあいさつ)をSPEC/TASKSに反映

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`company/mascot/CLAUDE.md` はこのリポジトリの外（`SmartSprouts/company/`）にあるため、Spra-go のコミットには含めない（最終報告で追記したことを伝える）。
