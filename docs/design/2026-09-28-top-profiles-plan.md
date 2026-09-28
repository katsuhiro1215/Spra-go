# トップとプロフィール選びをスプルの家にする 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 未ログインのトップとプロフィール選びを、スプルの家を真ん中にした画面に作り直し、プレイヤーごとにアバター（6種）を選べるようにする。

**Architecture:** 家の絵は既存の切り抜きの道具（`tools/spru-assets/extract.py`）に背景を抜く処理を足して作り、`SpruHouse` で出す。アバターはサーバーに `user_profiles.avatar`（`avatar-1`〜`avatar-6` の名前だけ）を足し、画面側の対応表（`avatars.ts`）で絵に変える。トップ（`guest-landing.tsx`）とプロフィール選び（`profiles/page.tsx`）は `SkyPage` の上に作り直し、追加・編集は下から出るパネル（`profile-sheet.tsx`）にまとめる。

**Tech Stack:** Laravel 13（Sail）+ Pest、Next.js 16 + React 19 + TypeScript + Tailwind v4、Vitest、radix-ui（Dialog・AlertDialog）、Python + Pillow（切り抜きの道具）

**Spec:** `docs/design/2026-09-28-top-profiles-design.md`

## Global Constraints

- ブランチは `feature/top-profiles`。コミットは `#NNNNN: type:要約`（日本語）で、この計画のコミットは #00194、タスクは #00195 から順に。本文の最後に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- キャッチコピーは「学ぶほど、世界が広がる。」
- タブの題名は「SpraGo — 学ぶほど、世界が広がる。」、説明は「言葉を学ぶと町が育ち、世界を旅できるようになる、家族で遊べる学習ゲーム。」
- アバターの名前は `avatar-1`〜`avatar-6`（サーバーの `UserProfile::AVATARS` と画面の `AVATAR_KEYS` は同じ並び）
- 仮のアバターの絵: `avatar-1`〜`avatar-5` は仲間（Lumi・Momo・Kuru・Piko・Ruru）、`avatar-6` は笑顔のスプル
- 家の絵は入口（トップ・プロフィール選び）だけで使い、町のマスには置かない
- 季節の風景の背景（`SceneBackground`）と前の配色のボタン（`classic-button.tsx`）は、トップでは使わない（紹介ページ・Owner/管理のログインでは今のまま）
- Tailwind のこのプロジェクトでは `data-open:` が使えないので、`data-[state=open]:` を使う
- 開発用データベースは非破壊の `migrate` だけ（`migrate:fresh` はしない）
- 画面の文字・コメント・ドキュメントは日本語

## Review Focus

- 名前が長いプレイヤー（例: 「おじいちゃんとおばあちゃん」）→ 名前の札がはみ出さず、省略（…）される。Task 5 の手順で、ブラウザで長い名前を追加して確かめる
- 幅320pxの小さいスマホ → 家とスプルが画面からはみ出さず、横にスクロールしない。Task 4・Task 5 の手順で320px幅でも確かめる
- 「追加する」「保存する」の連打 → 送っている間はボタンが押せず、プレイヤーは1人だけ増える。Task 5 のパネルで `disabled={submitting}` を付け、ブラウザで確かめる
- プレイヤーが6人を超える家族 → 7人目のアバターは `avatar-1`（重なってよい）。Task 2 のテスト「6つ全部使われていたら avatar-1」で確かめる
- 列を足す前からいるプレイヤー（アバターが空）→ 作った順に割り当てられ、画面は空でも1つ目の絵を出して壊れない。Task 2 の割り当てのテストと Task 3 の `avatarImage(null)` のテストで確かめる

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `tools/spru-assets/extract.py`（変更） | 背景が透明でない絵のとき、四隅から背景を抜く処理。「house」の組を書き出す |
| `tools/spru-assets/crops.json`（変更） | 元の絵 `house: image1.png` と「house」の組 |
| `frontend/public/spru/house/home.webp`（生成） | スプルの家の絵 |
| `frontend/src/components/spru/spru-assets.ts`（生成） | `HOUSE_IMAGES` が増える |
| `frontend/src/components/spru/spru-house.tsx`（新規） | スプルの家を出す部品 `SpruHouse` |
| `database/migrations/2026_09_28_000001_add_avatar_to_user_profiles_table.php`（新規） | `avatar` 列と、今いるプレイヤーへの割り当て |
| `app/Models/UserProfile.php`（変更） | `AVATARS`・`nextAvatarFor`・`assignAvatarsByCreationOrder`・作るときの自動割り当て |
| `routes/api.php`（変更） | プロフィールの追加・変更で `avatar` を受け取る |
| `tests/Feature/ProfileAvatarTest.php`（新規） | アバターのテスト |
| `frontend/src/components/app/avatars.ts`（新規）＋テスト | アバターの名前と絵の対応表 |
| `frontend/src/components/app/avatar-badge.tsx`（新規） | アバターの丸い枠 `AvatarBadge` |
| `frontend/src/components/app/guest-landing.tsx`（作り直し） | トップ |
| `frontend/src/app/layout.tsx`（変更） | タブの題名と説明 |
| `frontend/src/components/app/profile-list.ts`（新規）＋テスト | 保存したプレイヤーを一覧に反映する |
| `frontend/src/components/app/profile-sheet.tsx`（新規） | 追加・編集のパネル |
| `frontend/src/app/profiles/page.tsx`（作り直し） | プロフィール選び |
| `frontend/src/components/app/character-placeholder.tsx`（削除） | 仮のキャラクター |

---

### Task 1: スプルの家の絵を切り抜いて出す

**Files:**
- Modify: `tools/spru-assets/extract.py`
- Modify: `tools/spru-assets/crops.json`
- Generate: `frontend/public/spru/house/home.webp`、`frontend/src/components/spru/spru-assets.ts`
- Create: `frontend/src/components/spru/spru-house.tsx`

**Interfaces:**
- Produces: `HOUSE_IMAGES.home: SpruImage`（`spru-assets.ts`）、`SpruHouse({ width: number; eager?: boolean; className?: string })`

この道具は画像を書き出すだけの生成スクリプトで、既存の道具にもテストはない（TDDの対象外。出力の絵を目で確かめる）。

- [ ] **Step 1: 背景を抜く処理を足す**

`tools/spru-assets/extract.py` の import を直す:

```python
from PIL import Image, ImageChops, ImageDraw, ImageFilter
```

定数の並び（`TIP_ROWS` の下）に足す:

```python
BG_THRESH = 55  # 背景を抜くとき、四隅の色からどれだけ離れた色まで背景とみなすか
```

`cut_figure` の上に関数を足す:

```python
def clear_background(img: Image.Image) -> Image.Image:
    """背景が透明でない絵(スプルの家 image1 など)から、四隅につながる背景色を透明にする。
    もともと透明な所がある絵はそのまま返す(背景を消した絵に差し替えたときは何もしない)"""
    if img.getchannel("A").getextrema()[0] < 255:
        return img
    rgb = img.convert("RGB")
    marked = rgb.copy()
    w, h = marked.size
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(marked, corner, (255, 0, 255), thresh=BG_THRESH)
    diff = ImageChops.difference(marked, Image.new("RGB", marked.size, (255, 0, 255))).convert("L")
    alpha = diff.point(lambda v: 255 if v > 0 else 0).filter(ImageFilter.GaussianBlur(1.2))
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out
```

- [ ] **Step 2: 「house」の組を書き出す**

`main()` の部品の組のループを、次のように直す（`"house"` を足し、`background: "flood"` のときだけ背景を抜く）:

```python
    parts: dict = {}
    for group in ("bloom", "garden", "companions", "outing", "costumes", "badges", "stamps", "house"):
        parts[group] = {}
        for part in spec[group]:
            src = sources[part["source"]]
            if part.get("background") == "flood":
                src = clear_background(src)
            img = cut_figure(src, part["box"], part.get("scale", 1.0), part.get("mode", "largest"))
            parts[group][part["key"]] = save(img, f'{group}/{part["key"]}.webp')

    write_ts(
        images, faces, scenes, parts["bloom"], parts["garden"], parts["companions"],
        parts["outing"], parts["costumes"], parts["badges"], parts["stamps"], parts["house"], tips,
    )
    print(
        f"画像 {len(images)}・顔 {len(faces)}・シーン {len(scenes)}・花 {len(parts['bloom'])}"
        f"・畑 {len(parts['garden'])}・仲間 {len(parts['companions'])}"
        f"・お出かけ {len(parts['outing'])}・衣装 {len(parts['costumes'])}・バッジ {len(parts['badges'])}"
        f"・スタンプ {len(parts['stamps'])}・家 {len(parts['house'])} を書き出しました"
    )
```

`write_ts` の引数に `house: dict` を `stamps` の次に足し、`STAMP_IMAGES` の後ろと型の並びに足す:

```python
/** スプルの家(入口の1枚の絵)。町のマスには置かない */
export const HOUSE_IMAGES = {{
{entries(house)}
}} as const satisfies Record<string, SpruImage>;
```

```python
export type HouseImageKey = keyof typeof HOUSE_IMAGES;
```

ファイル冒頭の説明の「出力:」に `スプルの家 house/(背景が透明でない絵は四隅から背景を抜く)` を足す。

- [ ] **Step 3: crops.json に元の絵と組を足す**

`sources` に `"house": "image1.png"` を足し、いちばん後ろに組を足す（絵全体を、離れた煙も残して切り、幅約600pxに縮める）:

```json
  "house": [
    { "key": "home", "source": "house", "box": [0, 0, 1254, 1254], "mode": "all", "scale": 0.48, "background": "flood" }
  ]
```

- [ ] **Step 4: 道具を流す（数分かかるので、ほかの作業の裏で）**

Run: `python3 tools/spru-assets/extract.py ../../company/mascot/assets`（リポジトリ直下で）
Expected: 最後に `…・スタンプ 7・家 1 を書き出しました`。`git status` で増えたのは `frontend/public/spru/house/home.webp` と `spru-assets.ts` の変更だけ（ほかの画像は変わらない。変わっていたら差分を確かめる）

- [ ] **Step 5: 出力の絵を確かめる**

`frontend/public/spru/house/home.webp` を開き、背景が透明で、家・煙・地面が残っていることを目で確かめる（左下に小さな影が残るのは、今夜の背景を消した画像で直る）。

- [ ] **Step 6: SpruHouse を作る**

`frontend/src/components/spru/spru-house.tsx`:

```tsx
import Image from "next/image";

import { HOUSE_IMAGES } from "./spru-assets";

/**
 * スプルの家(入口の1枚の絵、設計書6-1)。幅を決めて出し、狭い画面では画面の幅に縮む。
 * 高さは縦横の比から決まる(枠に合わせて広げるので、Next.js の幅・高さの警告も出ない)
 */
export function SpruHouse({ width, eager = false, className }: { width: number; eager?: boolean; className?: string }) {
  const asset = HOUSE_IMAGES.home;
  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{ width: `min(${width}px, 100%)`, aspectRatio: `${asset.width} / ${asset.height}` }}
    >
      <Image
        src={asset.src}
        alt=""
        fill
        sizes={`${width}px`}
        loading={eager ? "eager" : undefined}
        className="object-contain"
        aria-hidden
      />
    </div>
  );
}
```

- [ ] **Step 7: 型チェックとlint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: エラー・警告なし

- [ ] **Step 8: コミット**

```bash
git add tools/spru-assets/extract.py tools/spru-assets/crops.json frontend/public/spru/house frontend/src/components/spru/spru-assets.ts frontend/src/components/spru/spru-house.tsx
git commit -m "#00195: feat:スプルの家の絵を切り抜く道具と、家を出す部品を足す" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: アバターの保存（バックエンド）

**Files:**
- Create: `database/migrations/2026_09_28_000001_add_avatar_to_user_profiles_table.php`
- Modify: `app/Models/UserProfile.php`
- Modify: `routes/api.php`（プロフィールの `store`・`update`、1502〜1554行あたり）
- Test: `tests/Feature/ProfileAvatarTest.php`

**Interfaces:**
- Produces: `UserProfile::AVATARS: string[]`、`UserProfile::nextAvatarFor(?int $schemaId): string`、`UserProfile::assignAvatarsByCreationOrder(): void`。プロフィールのAPIの返り値に `avatar: string|null`。`POST /api/profiles` と `PATCH /api/profiles/{id}` が `avatar`（任意）を受け取る

- [ ] **Step 1: 失敗するテストを書く**

`tests/Feature/ProfileAvatarTest.php`:

```php
<?php

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| プレイヤーのアバター(docs/design/2026-09-28-top-profiles-design.md 5章)
|--------------------------------------------------------------------------
*/

it('追加のとき、選んだアバターで作られる', function () {
    createActiveProfile();

    $response = $this->postJson('/api/profiles', ['name' => 'ゆうと', 'avatar' => 'avatar-4']);

    $response->assertCreated()->assertJsonPath('avatar', 'avatar-4');
});

it('追加のときアバターを送らなければ、家族でまだ使われていないものの1つ目になる', function () {
    $profile = createActiveProfile(); // avatar-1
    createFamilyMember($profile); // avatar-2

    $response = $this->postJson('/api/profiles', ['name' => 'さくら']);

    $response->assertCreated()->assertJsonPath('avatar', 'avatar-3');
});

it('6つ全部使われていたら、avatar-1 になる', function () {
    $profile = createActiveProfile();
    foreach (range(2, 6) as $n) {
        createFamilyMember($profile, "家族{$n}");
    }

    $response = $this->postJson('/api/profiles', ['name' => '7人目']);

    $response->assertCreated()->assertJsonPath('avatar', 'avatar-1');
});

it('追加のとき、6種以外のアバターは受け付けない', function () {
    createActiveProfile();

    $this->postJson('/api/profiles', ['name' => 'ゆうと', 'avatar' => 'avatar-7'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');
});

it('名前と一緒にアバターを変えられる', function () {
    $profile = createActiveProfile();

    $this->patchJson("/api/profiles/{$profile->id}", ['name' => 'お父さん', 'avatar' => 'avatar-6'])
        ->assertOk()
        ->assertJsonPath('avatar', 'avatar-6');

    expect($profile->fresh()->avatar)->toBe('avatar-6');
});

it('変更のとき、6種以外のアバターは受け付けない', function () {
    $profile = createActiveProfile();

    $this->patchJson("/api/profiles/{$profile->id}", ['name' => 'お父さん', 'avatar' => 'dragon'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('avatar');

    expect($profile->fresh()->avatar)->toBe('avatar-1');
});

it('ほかの家族のプレイヤーのアバターは変えられない', function () {
    createActiveProfile();
    $other = User::factory()->create()->schema()->create(['name' => 'よその家族'])->profiles()->create(['name' => 'よその子']);

    $this->patchJson("/api/profiles/{$other->id}", ['name' => 'よその子', 'avatar' => 'avatar-5'])
        ->assertStatus(403);

    expect($other->fresh()->avatar)->toBe('avatar-1');
});

it('プレイヤーの一覧にアバターが入っている', function () {
    createActiveProfile();

    $this->getJson('/api/profiles')->assertOk()->assertJsonPath('0.avatar', 'avatar-1');
});

it('今いるプレイヤーに、家族ごとに作った順でアバターを割り当てる(7人目からは1つ目に戻る)', function () {
    $a = User::factory()->create()->schema()->create(['name' => 'A家']);
    $b = User::factory()->create()->schema()->create(['name' => 'B家']);
    $a1 = $a->profiles()->create(['name' => 'a1']);
    $b1 = $b->profiles()->create(['name' => 'b1']);
    $rest = collect(range(2, 7))->map(fn ($n) => $a->profiles()->create(['name' => "a{$n}"]));
    DB::table('user_profiles')->update(['avatar' => null]); // 列を足した直後(まだ空)の状態にする

    UserProfile::assignAvatarsByCreationOrder();

    expect($a1->fresh()->avatar)->toBe('avatar-1')
        ->and($b1->fresh()->avatar)->toBe('avatar-1')
        ->and($rest->map(fn ($p) => $p->fresh()->avatar)->all())
        ->toBe(['avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6', 'avatar-1']);
});

it('割り当てのとき、すでにアバターがあるプレイヤーは変えない', function () {
    $family = User::factory()->create()->schema()->create(['name' => 'C家']);
    $first = $family->profiles()->create(['name' => 'c1']);
    $second = $family->profiles()->create(['name' => 'c2']);
    DB::table('user_profiles')->where('id', $first->id)->update(['avatar' => null]);
    DB::table('user_profiles')->where('id', $second->id)->update(['avatar' => 'avatar-5']);

    UserProfile::assignAvatarsByCreationOrder();

    expect($first->fresh()->avatar)->toBe('avatar-1')
        ->and($second->fresh()->avatar)->toBe('avatar-5');
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `./vendor/bin/sail test --filter=ProfileAvatarTest`
Expected: FAIL（`avatar` 列がない・`assignAvatarsByCreationOrder` がない など）

- [ ] **Step 3: マイグレーションを書く**

`database/migrations/2026_09_28_000001_add_avatar_to_user_profiles_table.php`:

```php
<?php

use App\Models\UserProfile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            // プレイヤーのアバターの名前(avatar-1〜6)。絵は画面側で対応させる(トップとプロフィール選びの設計書5章)
            $table->string('avatar', 20)->nullable()->after('name');
        });

        // 今いるプレイヤーに、家族ごとに作った順で割り当てる(今の色違いの並び順と同じ)
        UserProfile::assignAvatarsByCreationOrder();
    }

    public function down(): void
    {
        Schema::table('user_profiles', function (Blueprint $table) {
            $table->dropColumn('avatar');
        });
    }
};
```

- [ ] **Step 4: モデルを直す**

`app/Models/UserProfile.php`:
- `use Illuminate\Support\Facades\DB;` を足す
- `$fillable` の `'name',` の次に `'avatar',` を足す
- `STREAK_MILESTONES` の下に足す:

```php
    /**
     * プレイヤーのアバターの名前。絵は画面側(frontend/src/components/app/avatars.ts)で対応させるので、
     * 絵を替えてもデータは変わらない(docs/design/2026-09-28-top-profiles-design.md 5章)
     */
    public const AVATARS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6'];

    protected static function booted(): void
    {
        // アバターを決めずに作ったプレイヤーには、家族でまだ使われていないものを入れる
        static::creating(function (UserProfile $profile) {
            $profile->avatar ??= self::nextAvatarFor($profile->user_schema_id);
        });
    }

    /** 家族の中でまだ誰も使っていないアバターの1つ目。全部使われていたら1つ目 */
    public static function nextAvatarFor(?int $schemaId): string
    {
        $used = $schemaId === null
            ? []
            : DB::table('user_profiles')->where('user_schema_id', $schemaId)->pluck('avatar')->all();

        foreach (self::AVATARS as $avatar) {
            if (! in_array($avatar, $used, true)) {
                return $avatar;
            }
        }

        return self::AVATARS[0];
    }

    /**
     * アバターが空のプレイヤーに、家族ごとに作った順(id順)で割り当てる(7人目からは1つ目に戻る)。
     * avatar 列を足すマイグレーションから呼ぶので、モデルの属性に頼らずテーブルを直接読む
     */
    public static function assignAvatarsByCreationOrder(): void
    {
        $counts = [];
        DB::table('user_profiles')
            ->orderBy('user_schema_id')
            ->orderBy('id')
            ->get(['id', 'user_schema_id', 'avatar'])
            ->each(function ($row) use (&$counts) {
                $index = $counts[$row->user_schema_id] ?? 0;
                $counts[$row->user_schema_id] = $index + 1;
                if ($row->avatar === null) {
                    DB::table('user_profiles')
                        ->where('id', $row->id)
                        ->update(['avatar' => self::AVATARS[$index % count(self::AVATARS)]]);
                }
            });
    }
```

- [ ] **Step 5: APIを直す**

`routes/api.php` の `profiles.store`:

```php
    Route::post('/', function (Request $request) {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'avatar' => ['nullable', Rule::in(UserProfile::AVATARS)],
        ]);

        $schema = $request->user()->schema ?? $request->user()->schema()->create();

        // avatar が無ければ、モデルが家族でまだ使われていないものを入れる
        return $schema->profiles()->create([
            'name' => $data['name'],
            'avatar' => $data['avatar'] ?? null,
        ]);
    })->name('store');
```

`profiles.update` の validate に `avatar` を足す:

```php
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'avatar' => ['sometimes', Rule::in(UserProfile::AVATARS)],
        ]);
```

- [ ] **Step 6: テストが通るのを確かめる**

Run: `./vendor/bin/sail test --filter=ProfileAvatarTest`
Expected: PASS（10件）

- [ ] **Step 7: すべてのテストと、開発用データベースへの反映**

Run: `./vendor/bin/sail test`
Expected: すべてPASS（332＋10件）

Run: `./vendor/bin/sail artisan migrate`（非破壊。`migrate:fresh` はしない）
Expected: `2026_09_28_000001_add_avatar_to_user_profiles_table ... DONE`。町テスト（id 7）の家族のプレイヤーに id 順で `avatar-1` から入っていること（`./vendor/bin/sail artisan tinker --execute 'echo App\Models\UserProfile::where("user_schema_id", App\Models\UserProfile::find(7)->user_schema_id)->orderBy("id")->pluck("avatar", "name");'`）

- [ ] **Step 8: コミット**

```bash
git add database/migrations/2026_09_28_000001_add_avatar_to_user_profiles_table.php app/Models/UserProfile.php routes/api.php tests/Feature/ProfileAvatarTest.php
git commit -m "#00196: feat:プレイヤーのアバターを保存し、追加・変更で選べるようにする(今いるプレイヤーには作った順で割り当てる)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: アバターの対応表と丸い枠（フロントエンド）

**Files:**
- Create: `frontend/src/components/app/avatars.ts`
- Test: `frontend/src/components/app/avatars.test.ts`
- Create: `frontend/src/components/app/avatar-badge.tsx`

**Interfaces:**
- Consumes: `COMPANION_IMAGES`・`SPRU_IMAGES`・`SpruImage`（`spru-assets.ts`）、`fixedImageSize(asset, height)`（`image-size.ts`）
- Produces: `AVATAR_KEYS`、`type AvatarKey`、`avatarKeyOf(key: string | null): AvatarKey`、`avatarImage(key: string | null): SpruImage`、`firstUnusedAvatar(used: (string | null)[]): AvatarKey`、`AvatarBadge({ avatar: string | null; size: number; selected?: boolean; className?: string })`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/app/avatars.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { AVATAR_KEYS, avatarImage, avatarKeyOf, firstUnusedAvatar } from "./avatars";

describe("アバターの絵", () => {
  it("6つの名前で、それぞれ別の絵", () => {
    const srcs = AVATAR_KEYS.map((key) => avatarImage(key).src);
    expect(new Set(srcs).size).toBe(6);
  });

  it("空・知らない名前は、1つ目の絵", () => {
    expect(avatarImage(null)).toEqual(avatarImage("avatar-1"));
    expect(avatarImage("avatar-9")).toEqual(avatarImage("avatar-1"));
  });
});

describe("名前をアバターの名前にそろえる", () => {
  it("6種の名前はそのまま", () => {
    expect(avatarKeyOf("avatar-3")).toBe("avatar-3");
  });

  it("空・知らない名前は1つ目", () => {
    expect(avatarKeyOf(null)).toBe("avatar-1");
    expect(avatarKeyOf("dragon")).toBe("avatar-1");
  });
});

describe("追加のときに最初から選ぶアバター", () => {
  it("家族でまだ使われていないものの1つ目", () => {
    expect(firstUnusedAvatar(["avatar-1", "avatar-2"])).toBe("avatar-3");
  });

  it("間があいていれば、そこを選ぶ", () => {
    expect(firstUnusedAvatar(["avatar-1", "avatar-3"])).toBe("avatar-2");
  });

  it("全部使われていたら1つ目", () => {
    expect(firstUnusedAvatar([...AVATAR_KEYS])).toBe("avatar-1");
  });

  it("空の値は、使っていない扱い", () => {
    expect(firstUnusedAvatar([null, "avatar-1"])).toBe("avatar-2");
    expect(firstUnusedAvatar([])).toBe("avatar-1");
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/avatars.test.ts`
Expected: FAIL（`./avatars` が無い）

- [ ] **Step 3: 対応表を書く**

`frontend/src/components/app/avatars.ts`:

```ts
import { COMPANION_IMAGES, SPRU_IMAGES, type SpruImage } from "@/components/spru/spru-assets";

/** アバターの名前(サーバーの UserProfile::AVATARS と同じ並び。設計書5章) */
export const AVATAR_KEYS = ["avatar-1", "avatar-2", "avatar-3", "avatar-4", "avatar-5", "avatar-6"] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

// Ownerのアバター6種が届くまでの仮の絵(設計書6-2)。届いたらここだけ替える
const AVATAR_IMAGES: Record<AvatarKey, SpruImage> = {
  "avatar-1": COMPANION_IMAGES.lumi,
  "avatar-2": COMPANION_IMAGES.momo,
  "avatar-3": COMPANION_IMAGES.kuru,
  "avatar-4": COMPANION_IMAGES.piko,
  "avatar-5": COMPANION_IMAGES.ruru,
  "avatar-6": SPRU_IMAGES.smile,
};

/** サーバーの値をアバターの名前にそろえる。空・知らない名前は1つ目 */
export function avatarKeyOf(key: string | null): AvatarKey {
  return AVATAR_KEYS.find((k) => k === key) ?? AVATAR_KEYS[0];
}

/** アバターの絵。空・知らない名前は1つ目の絵 */
export function avatarImage(key: string | null): SpruImage {
  return AVATAR_IMAGES[avatarKeyOf(key)];
}

/** 家族の中でまだ誰も使っていないアバターの1つ目。全部使われていたら1つ目(サーバーの nextAvatarFor と同じ決め方) */
export function firstUnusedAvatar(used: (string | null)[]): AvatarKey {
  return AVATAR_KEYS.find((k) => !used.includes(k)) ?? AVATAR_KEYS[0];
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/avatars.test.ts`
Expected: PASS（8件）

- [ ] **Step 5: 丸い枠の部品を書く**

`frontend/src/components/app/avatar-badge.tsx`:

```tsx
import Image from "next/image";

import { avatarImage } from "@/components/app/avatars";
import { fixedImageSize } from "@/components/app/image-size";

/** プレイヤーのアバター(丸い枠、設計書6-2)。絵は枠の下にそろえる。selected は選んでいる印(緑の輪) */
export function AvatarBadge({
  avatar,
  size,
  selected = false,
  className,
}: {
  avatar: string | null;
  size: number;
  selected?: boolean;
  className?: string;
}) {
  const asset = avatarImage(avatar);
  const { width, height } = fixedImageSize(asset, Math.round(size * 0.88));
  return (
    <span
      className={`flex shrink-0 items-end justify-center overflow-hidden rounded-full border-[3px] bg-[#fff4df] shadow-[0_4px_10px_rgba(59,50,38,0.18)] ${
        selected ? "border-[#3b7f26] ring-4 ring-[#9fd8a0]" : "border-[#fffaf0]"
      } ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <Image src={asset.src} alt="" width={width} height={height} style={{ width, height }} aria-hidden />
    </span>
  );
}
```

- [ ] **Step 6: 型チェック・lint・すべてのテスト**

Run: `cd frontend && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: エラーなし、すべてPASS（216＋8件）

- [ ] **Step 7: コミット**

```bash
git add frontend/src/components/app/avatars.ts frontend/src/components/app/avatars.test.ts frontend/src/components/app/avatar-badge.tsx
git commit -m "#00197: feat:アバターの名前と絵の対応表と、丸い枠の部品を足す(絵が届くまでは仲間とスプルの仮の絵)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: トップの作り直しとタブの題名

**Files:**
- Modify（作り直し）: `frontend/src/components/app/guest-landing.tsx`
- Modify: `frontend/src/app/layout.tsx`（`metadata`、21〜24行）

**Interfaces:**
- Consumes: `SkyPage`・`SkyTitle`・`SkyText`（`sky-page.tsx`）、`LogoMark({ size })`、`SpruHouse({ width, eager })`（Task 1）、`SpruFigure({ image, standHeight, eager, className })`、`STAMP_IMAGES`・`StampKey`
- Produces: `GuestLanding()`（`app/page.tsx` から今までどおり呼ばれる）

画面の見た目だけの変更で、計算の部分がないためVitestのテストは足さない（ブラウザで確かめる）。

- [ ] **Step 1: トップを作り直す**

`frontend/src/components/app/guest-landing.tsx` を全部置き換える:

```tsx
import Image from "next/image";
import Link from "next/link";

import { LogoMark } from "@/components/app/logo-mark";
import { SkyPage, SkyText, SkyTitle } from "@/components/app/sky-page";
import { STAMP_IMAGES, type StampKey } from "@/components/spru/spru-assets";
import { SpruFigure } from "@/components/spru/spru-figure";
import { SpruHouse } from "@/components/spru/spru-house";

const SAMPLE_COUNTRIES: { code: StampKey; name: string }[] = [
  { code: "jp", name: "日本" },
  { code: "us", name: "アメリカ" },
  { code: "gb", name: "イギリス" },
  { code: "fr", name: "フランス" },
];

/**
 * 未ログインのトップ(docs/design/2026-09-28-top-profiles-design.md 3章)。
 * 時間帯の空の上に、スプルの家と手を振るスプル、はじめる・ログイン・お試しクイズ
 */
export function GuestLanding() {
  return (
    <SkyPage className="items-center px-4 pt-10 pb-24">
      <div className="flex items-center gap-2">
        <LogoMark size={40} />
        <SkyTitle className="text-[32px] tracking-wide">SpraGo</SkyTitle>
      </div>
      <SkyText className="mt-1 text-sm">学ぶほど、世界が広がる。</SkyText>

      <div className="relative mt-6 flex w-full max-w-[300px] justify-center">
        <SpruHouse width={300} eager />
        <SpruFigure
          image="wave"
          standHeight={104}
          eager
          className="animate-character-bounce absolute -bottom-2 left-2"
        />
      </div>

      <div className="mt-8 flex w-full max-w-[340px] flex-col items-center">
        <Link
          href="/register"
          className="flex h-[54px] w-full items-center justify-center rounded-2xl border-b-4 border-[#285a19] bg-[#3b7f26] text-lg font-black text-white hover:bg-[#438b2d] focus-visible:ring-4 focus-visible:ring-[#9fd8ff] focus-visible:outline-none active:translate-y-0.5 active:border-b-0"
        >
          はじめる
        </Link>
        <Link
          href="/login"
          className="mt-3 rounded-full bg-[#fffaf0] px-4 py-1.5 text-sm font-black text-[#2b6fa3] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
        >
          アカウントをお持ちの方はログイン
        </Link>

        <SkyText muted className="mt-5 text-xs">
          登録なしでお試しクイズ
        </SkyText>
        <ul className="mt-2 flex justify-center gap-3">
          {SAMPLE_COUNTRIES.map(({ code, name }) => (
            <li key={code}>
              <Link
                href={`/world/${code}`}
                aria-label={`${name}のお試しクイズ`}
                className="flex flex-col items-center gap-0.5 rounded-xl focus-visible:ring-4 focus-visible:ring-[#9fd8ff] focus-visible:outline-none"
              >
                <Image
                  src={STAMP_IMAGES[code].src}
                  alt=""
                  width={60}
                  height={60}
                  className="h-[60px] w-[60px] -rotate-6 object-contain transition-transform hover:rotate-0"
                />
                <SkyText as="span" className="text-[11px]">
                  {name}
                </SkyText>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SkyPage>
  );
}
```

- [ ] **Step 2: タブの題名と説明**

`frontend/src/app/layout.tsx` の `metadata` を置き換える:

```ts
export const metadata: Metadata = {
  title: "SpraGo — 学ぶほど、世界が広がる。",
  description: "言葉を学ぶと町が育ち、世界を旅できるようになる、家族で遊べる学習ゲーム。",
};
```

- [ ] **Step 3: 型チェック・lint**

Run: `cd frontend && npx tsc --noEmit && npm run lint`
Expected: エラー・警告なし

- [ ] **Step 4: ブラウザで確かめる（ログアウトした状態、390px・320px・1280px）**

- 家・手を振るスプル・コピー・はじめる・ログイン・スタンプ4つが縦に並び、重ならない。320px幅でも横にスクロールしない
- 「はじめる」→ `/register`、ログイン → `/login`、日本のスタンプ → `/world/jp`
- タブの題名が「SpraGo — 学ぶほど、世界が広がる。」
- 開発時の警告（画像の幅・高さ、LCP）が新しく出ていない
- スクリーンショットは `/Users/katsuhiro.k1215/SmartSprouts/.playwright-mcp/` に保存し、見たら消す

- [ ] **Step 5: コミット**

```bash
git add frontend/src/components/app/guest-landing.tsx frontend/src/app/layout.tsx
git commit -m "#00198: feat:未ログインのトップをスプルの家の画面に作り直し、タブの題名と説明を入れる" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: プロフィール選びと追加・編集のパネル

**Files:**
- Create: `frontend/src/components/app/profile-list.ts`
- Test: `frontend/src/components/app/profile-list.test.ts`
- Create: `frontend/src/components/app/profile-sheet.tsx`
- Modify（作り直し）: `frontend/src/app/profiles/page.tsx`
- Delete: `frontend/src/components/app/character-placeholder.tsx`

**Interfaces:**
- Consumes: `AvatarBadge`・`AVATAR_KEYS`・`AvatarKey`・`avatarKeyOf`・`firstUnusedAvatar`（Task 3）、`SpruHouse`（Task 1）、`POST /api/profiles`・`PATCH /api/profiles/{id}`（`{ name, avatar }`、Task 2）・`DELETE /api/profiles/{id}`
- Produces: `upsertById<T extends { id: number }>(list: T[], item: T): T[]`、`type SheetProfile = { id: number; name: string; avatar: string | null }`、`ProfileSheet({ open, target, usedAvatars, onClose, onSaved, onDeleted })`

- [ ] **Step 1: 失敗するテストを書く**

`frontend/src/components/app/profile-list.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { upsertById } from "./profile-list";

const a = { id: 1, name: "お父さん" };
const b = { id: 2, name: "お母さん" };

describe("保存したプレイヤーを一覧に反映する", () => {
  it("新しいプレイヤーは最後に足す", () => {
    expect(upsertById([a], b)).toEqual([a, b]);
  });

  it("同じidのプレイヤーは、並びを変えずに置き換える", () => {
    const renamed = { id: 1, name: "パパ" };
    expect(upsertById([a, b], renamed)).toEqual([renamed, b]);
  });
});
```

- [ ] **Step 2: テストが失敗するのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/profile-list.test.ts`
Expected: FAIL（`./profile-list` が無い）

- [ ] **Step 3: 実装する**

`frontend/src/components/app/profile-list.ts`:

```ts
/** 保存したプレイヤーを一覧に反映する。同じidがあれば並びを変えずに置き換え、なければ最後に足す */
export function upsertById<T extends { id: number }>(list: T[], item: T): T[] {
  return list.some((p) => p.id === item.id) ? list.map((p) => (p.id === item.id ? item : p)) : [...list, item];
}
```

- [ ] **Step 4: テストが通るのを確かめる**

Run: `cd frontend && npx vitest run src/components/app/profile-list.test.ts`
Expected: PASS（2件）

- [ ] **Step 5: 追加・編集のパネルを書く**

`frontend/src/components/app/profile-sheet.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { AlertDialog as AlertDialogPrimitive, Dialog as DialogPrimitive } from "radix-ui";

import { AvatarBadge } from "@/components/app/avatar-badge";
import { AVATAR_KEYS, avatarKeyOf, firstUnusedAvatar, type AvatarKey } from "@/components/app/avatars";
import { apiFetch } from "@/lib/api";

export type SheetProfile = { id: number; name: string; avatar: string | null };

/**
 * プレイヤーの追加・編集のパネル(設計書4-1)。target が null なら追加、あれば編集。
 * 開くたびに key を変えて作り直す前提(名前・アバターは開いたときの値から始める)
 */
export function ProfileSheet({
  open,
  target,
  usedAvatars,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  target: SheetProfile | null;
  usedAvatars: (string | null)[];
  onClose: () => void;
  onSaved: (profile: SheetProfile) => void;
  onDeleted: (id: number) => void;
}) {
  const [name, setName] = useState(target?.name ?? "");
  const [avatar, setAvatar] = useState<AvatarKey>(target ? avatarKeyOf(target.avatar) : firstUnusedAvatar(usedAvatars));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(target ? `/api/profiles/${target.id}` : "/api/profiles", {
        method: target ? "PATCH" : "POST",
        body: JSON.stringify({ name, avatar }),
      });
      if (!res.ok) {
        setError(target ? "変更に失敗しました。" : "プロフィールの作成に失敗しました。");
        return;
      }
      onSaved(await res.json());
      onClose();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!target) return;
    setError(null);
    try {
      const res = await apiFetch(`/api/profiles/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("削除に失敗しました。");
        return;
      }
      onDeleted(target.id);
      onClose();
    } catch {
      setError("通信エラーが発生しました。");
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(38,48,28,0.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[22px] bg-[#fffaf0] px-5 pt-3 pb-8 text-[#3b3226] shadow-[0_-8px_24px_rgba(0,0,0,0.2)] outline-none duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#e0d6c2]" />
          <DialogPrimitive.Title className="text-center text-lg font-black">
            {target ? "プロフィールを編集" : "プレイヤーを追加"}
          </DialogPrimitive.Title>

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col">
            <label htmlFor="profile-name" className="text-sm font-black">
              なまえ
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: お父さん"
              className="mt-1.5 h-11 rounded-xl border-2 border-[#e8dfcf] bg-white px-3 text-sm outline-none focus-visible:border-[#2b6fa3]"
            />

            <p id="avatar-label" className="mt-4 text-sm font-black">
              アバターをえらぶ
            </p>
            <div role="radiogroup" aria-labelledby="avatar-label" className="mt-2 grid grid-cols-3 gap-3">
              {AVATAR_KEYS.map((key, index) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={avatar === key}
                  aria-label={`アバター${index + 1}`}
                  onClick={() => setAvatar(key)}
                  className="flex justify-center rounded-2xl py-1 outline-none focus-visible:ring-4 focus-visible:ring-[#9fd8ff]"
                >
                  <AvatarBadge avatar={key} size={72} selected={avatar === key} />
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-sm font-bold text-[#c2402c]">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 h-[52px] rounded-2xl border-b-4 border-[#285a19] bg-[#3b7f26] text-base font-black text-white disabled:opacity-60"
            >
              {target ? "保存する" : "追加する"}
            </button>
          </form>

          {target && (
            <AlertDialogPrimitive.Root>
              <AlertDialogPrimitive.Trigger asChild>
                <button type="button" className="mx-auto mt-4 block text-sm font-bold text-[#c2402c] underline underline-offset-2">
                  このプロフィールを削除
                </button>
              </AlertDialogPrimitive.Trigger>
              <AlertDialogPrimitive.Portal>
                <AlertDialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[rgba(38,48,28,0.45)]" />
                <AlertDialogPrimitive.Content className="fixed top-1/2 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-3xl bg-[#fffaf0] p-5 text-center text-[#3b3226] shadow-[0_16px_36px_rgba(0,0,0,0.25)] outline-none">
                  <AlertDialogPrimitive.Title className="text-lg font-black">
                    「{target.name}」を削除する？
                  </AlertDialogPrimitive.Title>
                  <AlertDialogPrimitive.Description className="text-sm font-bold text-[#6b5d45]">
                    冒険の記録も消えます
                  </AlertDialogPrimitive.Description>
                  <div className="mt-1 flex gap-2">
                    <AlertDialogPrimitive.Cancel className="h-12 flex-1 rounded-2xl border-2 border-b-4 border-[#e8dfcf] bg-white text-base font-black">
                      やめる
                    </AlertDialogPrimitive.Cancel>
                    <AlertDialogPrimitive.Action
                      onClick={handleDelete}
                      className="h-12 flex-1 rounded-2xl border-b-4 border-[#8f2f1f] bg-[#c2402c] text-base font-black text-white"
                    >
                      削除する
                    </AlertDialogPrimitive.Action>
                  </div>
                </AlertDialogPrimitive.Content>
              </AlertDialogPrimitive.Portal>
            </AlertDialogPrimitive.Root>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 6: プロフィール選びを作り直す**

`frontend/src/app/profiles/page.tsx` を全部置き換える:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import { AvatarBadge } from "@/components/app/avatar-badge";
import { Furigana } from "@/components/app/furigana";
import { useProfile } from "@/components/app/profile-provider";
import { upsertById } from "@/components/app/profile-list";
import { ProfileSheet, type SheetProfile } from "@/components/app/profile-sheet";
import { SkyPage, SkyTitle } from "@/components/app/sky-page";
import { SpruLoading } from "@/components/app/spru-loading";
import { SpruHouse } from "@/components/spru/spru-house";
import { apiFetch } from "@/lib/api";

type Profile = SheetProfile;

// 追加・編集のパネル。key は開くたびに変えて、パネルを作り直す(閉じる動きの間は中身を残す)
type SheetState = { open: boolean; target: Profile | null; key: number };

const PLATE = "max-w-full truncate rounded-full bg-[#fffaf0] px-2.5 py-0.5 text-[12.5px] font-black text-[#3b3226] shadow-[0_2px_5px_rgba(59,50,38,0.14)]";

/** プロフィール選び(docs/design/2026-09-28-top-profiles-design.md 4章)。スプルの家の前の芝生に家族が並ぶ */
export default function Page() {
  const router = useRouter();
  const { refresh: refreshProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [managing, setManaging] = useState(false);
  const [sheet, setSheet] = useState<SheetState>({ open: false, target: null, key: 0 });

  useEffect(() => {
    let active = true;

    apiFetch("/api/user")
      .then(async (res) => {
        if (!active) return;

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const profilesRes = await apiFetch("/api/profiles");
        if (!active) return;
        setProfiles(await profilesRes.json());
      })
      .catch(() => {
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  function openSheet(target: Profile | null) {
    setSheet((prev) => ({ open: true, target, key: prev.key + 1 }));
  }

  async function selectProfile(profile: Profile) {
    if (managing) {
      openSheet(profile);
      return;
    }

    const res = await apiFetch(`/api/profiles/${profile.id}/select`, { method: "POST" });

    if (res.ok) {
      // ヘッダーや下のメニューに、選んだプレイヤーをすぐ出す
      await refreshProfile();
      router.push("/");
    }
  }

  function handleDeleted(id: number) {
    const next = profiles?.filter((p) => p.id !== id) ?? null;
    setProfiles(next);
    // 最後の1人を消したら、編集中の表示もやめる(「プロフィールを編集」のボタンが消えるため)
    if (next && next.length === 0) setManaging(false);
  }

  return (
    <SkyPage className="items-center">
      <div className="relative z-10 flex flex-col items-center gap-1 px-6 pt-10">
        <SkyTitle className="text-2xl">
          だれが<Furigana text="冒険" reading="ぼうけん" />する？
        </SkyTitle>
        {profiles && profiles.length > 0 && (
          <button
            type="button"
            onClick={() => setManaging((prev) => !prev)}
            className="rounded-full bg-[#fffaf0] px-3 py-1.5 text-xs font-black text-[#2b5d7a] shadow-[0_2px_6px_rgba(59,50,38,0.15)] hover:bg-white"
          >
            {managing ? "完了" : "プロフィールを編集"}
          </button>
        )}
      </div>

      <SpruHouse width={230} eager className="z-10 mt-2" />

      {/* 家の前の芝生。上の辺はゆるく丸く、画面の下まで続く */}
      <div className="relative -mt-6 flex w-full flex-1 flex-col items-center rounded-t-[50%_60px] bg-gradient-to-b from-[#8fd06a] to-[#6cb24a] px-4 pt-10 pb-24">
        {!profiles ? (
          <SpruLoading />
        ) : (
          <>
            {profiles.length === 0 && (
              <p className="mb-4 rounded-full bg-[#fffaf0] px-4 py-1.5 text-sm font-bold text-[#3b3226]">
                まだプレイヤーがいません。最初のプレイヤーを作ろう！
              </p>
            )}
            <ul className="flex max-w-md flex-wrap justify-center gap-x-2 gap-y-4">
              {profiles.map((profile) => (
                <li key={profile.id}>
                  <button
                    type="button"
                    onClick={() => selectProfile(profile)}
                    aria-label={managing ? `${profile.name}を編集` : `${profile.name}で遊ぶ`}
                    className="group flex w-[92px] flex-col items-center gap-1 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-[#9fd8ff]"
                  >
                    <span className="relative transition-transform group-hover:scale-105">
                      <AvatarBadge avatar={profile.avatar} size={76} />
                      {managing && (
                        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
                          <Pencil aria-hidden className="h-3.5 w-3.5 text-[#3b3226]" />
                        </span>
                      )}
                    </span>
                    <span className={PLATE}>{profile.name}</span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => openSheet(null)}
                  aria-label="プレイヤーを追加"
                  className="group flex w-[92px] flex-col items-center gap-1 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-[#9fd8ff]"
                >
                  <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-dashed border-[#fffaf0] bg-[rgba(255,250,240,0.55)] text-4xl font-black text-[#3b7f26] transition-transform group-hover:scale-105">
                    ＋
                  </span>
                  <span className={PLATE}>追加</span>
                </button>
              </li>
            </ul>
          </>
        )}
      </div>

      <ProfileSheet
        key={sheet.key}
        open={sheet.open}
        target={sheet.target}
        usedAvatars={profiles?.map((p) => p.avatar) ?? []}
        onClose={() => setSheet((prev) => ({ ...prev, open: false }))}
        onSaved={(saved) => setProfiles((prev) => (prev ? upsertById(prev, saved) : [saved]))}
        onDeleted={handleDeleted}
      />
    </SkyPage>
  );
}
```

- [ ] **Step 7: 仮のキャラクターを消す**

Run: `grep -rn "CharacterPlaceholder\|character-placeholder" frontend/src`
Expected: `frontend/src/components/app/character-placeholder.tsx` の中だけ

Run: `git rm frontend/src/components/app/character-placeholder.tsx`

- [ ] **Step 8: 型チェック・lint・すべてのテスト**

Run: `cd frontend && npx tsc --noEmit && npm run lint && npx vitest run`
Expected: エラーなし、すべてPASS（224＋2件）

- [ ] **Step 9: ブラウザで確かめる（ログインして、390px・320px・1280px）**

- 家の前の芝生にアバターと名前の札が並び、最後に「＋ 追加」。320px幅でも横にスクロールしない
- 「＋ 追加」→ パネルで名前「おじいちゃんとおばあちゃん」、アバターは最初から空いているものが選ばれている → 別のアバターを選んで「追加する」→ 芝生に増える。長い名前の札が省略（…）されてはみ出さない。「追加する」を素早く2回押しても1人だけ増える
- 「プロフィールを編集」→ 足したプレイヤーを押す → 名前とアバターを変えて「保存する」→ 反映される
- もう一度開いて「このプロフィールを削除」→ 確かめる画面で「やめる」→ 残る。もう一度「削除する」→ 消える
- 町テストを押すと町へ行く（そのあとの開発用データベースの確認は Task 6）
- 開発時の警告が新しく出ていない。スクリーンショットは見たら消す

- [ ] **Step 10: コミット**

```bash
git add frontend/src/components/app/profile-list.ts frontend/src/components/app/profile-list.test.ts frontend/src/components/app/profile-sheet.tsx frontend/src/app/profiles/page.tsx
git commit -m "#00199: feat:プロフィール選びをスプルの家の前に家族が並ぶ画面にし、追加・編集をアバターを選べるパネルにする(仮のキャラクターを消す)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 仕上げ（開発用データベースの確認・SPEC・TASKS）

**Files:**
- Modify: `SPEC.md`（4-1 プロフィール周り、93行あたりの2026-09-28の行、フロントエンドのテスト件数）
- Modify: `TASKS.md`（開発部門の「未ログインのトップを作り直す」「残りの仮のキャラクター」「追加の画像」）
- Append: `/Users/katsuhiro.k1215/SmartSprouts/company/mascot/CLAUDE.md`（追記のみ）

- [ ] **Step 1: 開発用データベースが元のままか確かめる**

Run: `./vendor/bin/sail artisan tinker --execute '$a = App\Models\UserProfile::find(7)->getAttributes(); echo json_encode(array_intersect_key($a, array_flip(["current_streak","best_streak","last_played_date","xp","coins","hp","points","avatar"]))), PHP_EOL; echo json_encode(DB::table("profile_errands")->where("user_profile_id",7)->pluck("id"));'`
Expected: `current_streak` 2・`best_streak` 2・`last_played_date` 2026-09-27・`xp` 20・`coins` 60・`hp` 20・`points` 75・`avatar` は割り当てられた値、おつかいは `[19,20,21]`。おつかいが増えていたら増えた分を消す。ブラウザで足した仮のプレイヤーが残っていないこと

- [ ] **Step 2: SPEC.md を直す**

- 93行の「仮のキャラクターをスプルに差し替えた」の後ろに1行足す: 「✅（2026-09-28）未ログインのトップとプロフィール選びをスプルの家の画面にした。トップは時間帯の空に家と手を振るスプル、キャッチコピー「学ぶほど、世界が広がる。」、はじめる・ログイン・お試しクイズ（スタンプの絵）。プロフィール選びは家の前の芝生に家族のアバターが並び、追加・編集は下から出るパネル（名前と6種のアバター、削除は確かめてから）。アバターは `user_profiles.avatar`（`avatar-1`〜`6`、絵は `components/app/avatars.ts` で対応。今夜のOwnerの画像が届くまでは仲間とスプルの仮の絵）。タブの題名と説明も入れた（`docs/design/2026-09-28-top-profiles-design.md`）」
- フロントエンドのテスト件数を、Task 5 の最後の件数に直す

- [ ] **Step 3: TASKS.md を直す**

- 「未ログインのトップ（`components/app/guest-landing.tsx`）を作り直す」を `[x]` にし、「（2026-09-28。設計書 `docs/design/2026-09-28-top-profiles-design.md`、実装計画 `docs/design/2026-09-28-top-profiles-plan.md`）」を付ける
- 「残りの仮のキャラクター」を `[x]` にする（`CharacterPlaceholder` は消した）
- 「追加の画像」の行に、「アバター6種は `crops.json` に avatars の組を足し、`components/app/avatars.ts` の仮の絵を替える。家の背景を消した画像は `crops.json` の house の元の絵を替えて `extract.py` を流す」を足す

- [ ] **Step 4: マスコット部の記録に追記する**

`company/mascot/CLAUDE.md` のいちばん後ろに1行足す（追記のみ）:

```markdown
  - 2026-09-28追記（入口の画面）: Spra-go の未ログインのトップとプロフィール選びで、スプルの家（image1。`tools/spru-assets/extract.py` で四隅から背景を抜いて `house/home.webp`）を使い始めた。プレイヤーのアバターは、Ownerの6種が届くまで仲間5人と笑顔のスプルを仮の絵にしている
```

- [ ] **Step 5: すべてのテスト**

Run: `./vendor/bin/sail test` と `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
Expected: すべてPASS・エラーなし

- [ ] **Step 6: コミット**

```bash
git add SPEC.md TASKS.md
git commit -m "#00200: docs:トップとプロフィール選びをスプルの家にしたことをSPEC/TASKSに反映する" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
