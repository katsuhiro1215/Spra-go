# 国の道 — 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。手順は `- [ ]` で追う。

**Goal:** 旅した国の道のデザインを、旅のハブから選んで、町（と家族の町）の道に使えるようにする。

**Architecture:** プロフィールに `road_style` を1つ持ち、選ぶ窓口 `PUT /api/world/road` を足す。町・旅・家族の町の返事に `road_style` を足す。画面は、道の絵を `GROUND_ART["road_" + style]` から選ぶ。絵（5枚）は取り込み済み（#00390）。

**Tech Stack:** Laravel（Pest）、Next.js/TypeScript（Vitest）

**Spec:** `docs/design/2026-10-05-road-style-design.md`

ブランチ: `feature/road-style`（設計書 #00387、地面の絵 #00388・#00389、道の絵 #00390 はコミット済み）。この計画 #00391、実装は #00392 から。コミットの形式は `#NNNNN: type:要約`＋Co-Authored-By。

## Global Constraints

- 道の位置・マスは変えない。変えるのは絵だけ
- 道のキーは、日本 `jp` と、`config/travel.php` の行き先のキー（`id`・`kr`・`us`・`gb`・`fr`）。絵のキーは `road_{キー}`
- まだ着いていない国の道は選べない。日本はいつでも選べる
- 絵がない国の道は、画面で選ぶボタンを出さない（サーバーは、着いていればどの国でも選べる）
- 既存のテスト（旅・町・家族の町）の中身を壊さない。返事に足すだけ
- テスト: `./vendor/bin/sail test`（`--parallel` なし）、`cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
- 開発用データベース: プロフィール7を元の状態に戻す（`road_style` は null、`profile_trips` は元の件数、`world_items` 4件など。`migrate:fresh` は使わない。追加の `migrate` はよい）

## Review Focus

- まだ着いていない国の道を、窓口で直接送っても選べない（画面のボタンの有無に頼らない）
- 選んだ道が、町・家族の町の両方で、その場で変わる（家族の町は、持ち主の選択）
- 日本の道に戻すと、今までの道の絵に戻る
- 絵がない国（今回は全5か国に絵がある。`GROUND_ART` から消した場合）でも、町が壊れず、日本の道で描かれる
- 他人のプロフィールの `road_style` は、変わらない

## Task 1: 計画のコミット

- [ ] この計画を #00391 でコミットする

## Task 2: サーバー（先にテスト）

**Files:** `database/migrations/2026_10_05_000003_add_road_style_to_user_profiles_table.php`、`app/Models/UserProfile.php`、`app/Support/Travel.php`、`app/Support/Family.php`、`routes/api.php`、`tests/Feature/RoadStyleTest.php`

**Interfaces:**
- Produces: `Travel::roadStyle(UserProfile $profile): string`、`Travel::roadKeys(): array`（`['jp', ...行き先のキー]`）、`PUT /api/world/road` `{style}` → `{road_style}`、`GET /api/world`・`GET /api/travel`・家族の町の返事の `road_style`

- [ ] 先にテストを書く（RED）。`tests/Feature/RoadStyleTest.php`:
  - 既定は `jp`（`GET /api/world` の `road_style`）
  - 着いた国（`profile_trips` に行を作る）の道を選べて、`GET /api/world` と `GET /api/travel` に出る。`jp` に戻せる
  - まだ着いていない国の道を選ぶと422（メッセージ「まだ着いていない国の道は、選べないよ」）。一覧にないキー（`xx`）は422。`style` なしも422
  - 着いている国の記録が消えた（`profile_trips` から削除した）ら、保存してあっても `jp` で返る（`roadStyle` の確かめ）
  - ほかのプロフィールの `road_style` は変わらない
  - 家族の町（`/api/family/{id}/town` など、既存の家族の町のテストと同じ窓口）の返事に、持ち主の `road_style` が出る
  - 未ログインは401
  - 実行 `./vendor/bin/sail test --filter=RoadStyleTest` **Expected:** 失敗する
- [ ] マイグレーション（`user_profiles.road_style` `string(8)` null可、`world_plots_seen` の後ろ）、`UserProfile::$fillable` に `road_style`
- [ ] `Travel::roadKeys()`（`['jp'] + 行き先のキー`）、`Travel::roadStyle()`（保存値が `jp` か、着いた国のキーならそれ、そうでなければ `jp`）
- [ ] `PUT /api/world/road`: `ActiveProfile::require`、`style` を検証（`required|string`）。`roadKeys` にない → 422（検証エラー）。`jp` 以外で、着いていなければ422（`abort(422, 'まだ着いていない国の道は、選べないよ')`）。成功したら `road_style` を保存して `['road_style' => ...]`
- [ ] `GET /api/world` の返事（`routes/api.php` の `'land' => WorldLand::toArray(...)` の近く）に `'road_style' => Travel::roadStyle($profile)`。`Travel::overview` に `'road_style'`。`Family::town` に `'road_style' => Travel::roadStyle($other)`
- [ ] `php artisan migrate`（開発用データベース。追加のみ）。`./vendor/bin/sail test --filter="RoadStyleTest|TravelTest|TravelActionsTest|WorldApiTest|FamilyTest"` **Expected:** 通る。サーバー全体 `./vendor/bin/sail test`
- [ ] コミット `#00392: feat:町の道のデザイン(road_style)を選ぶ窓口と、町・旅・家族の町の返事への追加`

## Task 3: 画面の純粋な関数（先にテスト）

**Files:** `frontend/src/components/travel/road.ts`、`frontend/src/components/travel/road.test.ts`

**Interfaces:**
- Produces:
  - `roadArtKey(style: string): "path" | "road_id" | ...` — `jp` は `path`、それ以外は `road_{style}`
  - `roadArt(style, art = GROUND_ART)` — その道の絵、なければ `path` の絵（日本の道）
  - `roadChoice(style: string, selected: string, hasArt: boolean): "select" | "selected" | "none"` — 絵が無ければ `none`、選んでいれば `selected`、そうでなければ `select`
  - `roadName(style)` — 「インドネシアの道」などの表示名（`jp` は「日本の道」）
  - `ROAD_STYLE_NAMES: Record<string, string>`（`jp: "日本"`、`id: "インドネシア"`、`kr: "韓国"`、`us: "アメリカ"`、`gb: "イギリス"`、`fr: "フランス"`）

- [ ] 先にテスト（RED）: `roadArtKey("jp")` が `path`・`roadArtKey("fr")` が `road_fr`、`roadArt` が絵を引き、無いキーは日本の道の絵、`roadChoice`（絵なし→none、選択中→selected、そうでなければ select）、`roadName("gb")` が「イギリスの道」。**Expected:** 失敗
- [ ] `road.ts` を実装 **Expected:** 通る
- [ ] コミット `#00393: feat:道の絵を選ぶ純粋な関数(roadArtKey・roadArt・roadChoice)を足す`

## Task 4: 町・家族の町の描き方

**Files:** `frontend/src/components/world/types.ts`、`world-scene.tsx`、`world-screen.tsx`、`components/family/family-town.tsx`、`components/travel/types.ts`

- [ ] 型: 町の返事（`WorldData`）・家族の町の返事・旅の返事（`TravelData`）に `road_style: string` を足す（既存のテストの型の直しも含む）
- [ ] `WorldScene` に `roadStyle?: string`（既定 `jp`）を足す。道の絵を `roadArt(roadStyle)` にする（`GROUND_ART.path` の代わり）。`<defs>` の `pattern` は、使う道の絵のぶんを描く（`artKeys` は、`GROUND_ART` の全部のままでよい）。道のふち・すき間を消すふちも、選んだ絵に合わせる（`url(#ground-{選んだキー})`）
- [ ] `world-screen.tsx`・`family-town.tsx` から、`roadStyle` を渡す
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npx vitest run` **Expected:** すべて通る
- [ ] コミット `#00394: feat:町と家族の町の道を、選んだ国の道の絵で描く`

## Task 5: 旅のハブで選ぶ

**Files:** `frontend/src/components/travel/destination-sheet.tsx`、`frontend/src/app/trip/page.tsx`、`frontend/src/components/travel/departure-scene.tsx`

- [ ] `DestinationSheet`: 着いた国（`state === "visited"`）のカードに、`roadChoice(destination.key, roadStyle, !!GROUND_ART["road_" + destination.key])` に応じて出す。`select`: 道の絵の小さなサムネイル（`GROUND_ART` の絵を、菱形に切らず、小さな丸い角の正方形で）と［この国の道にする］ボタン。`selected`: 「いまの町の道」の印と［日本の道にもどす］ボタン。`none`: 何も出さない。ボタンは、通信中は押せない。成功したら「町の道を、○○の道にしたよ」を、カード内に出す
- [ ] `trip/page.tsx`: 旅の返事の `road_style` を状態に持ち、`PUT /api/world/road` を呼ぶ関数を作って、`DestinationSheet` に渡す。失敗したら、エラーを出す
- [ ] `departure-scene.tsx`: 着いたときの表示の最後に、`GROUND_ART["road_" + destination.key]` があれば、「○○の道が、町で使えるようになったよ」を足す
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npx vitest run` **Expected:** すべて通る
- [ ] コミット `#00395: feat:旅のハブの着いた国のカードで、町の道を選べるようにする`

## Task 6: ブラウザで確かめる

- [ ] ログイン `test@example.com`／プロフィール7（町テスト）。スクリーンショットは `.playwright-mcp/` の下だけ
- [ ] 確かめる間だけ、プロフィール7が、2か国（例: インドネシア・イギリス）に着いた状態にする（`profile_trips` に行を足す。終わったら消す）
- [ ] 旅のハブ: 着いた国のカードに［この国の道にする］が出る。まだの国には出ない。押すと「町の道を、…にしたよ」。町に戻ると道の絵が変わる（デスクトップ幅・スマホ幅）。［日本の道にもどす］で戻る
- [ ] 家族の町: 別のプロフィールから見ると、持ち主の道で見える（家族のプロフィールがある場合。なければ、API の返事で確認）
- [ ] 確かめたあと、プロフィール7を元の状態に戻す（`road_style` を null、足した `profile_trips` を削除。xp 20、coins 60、points 95、ledger 最大668、`world_items` 4件など）。スクリーンショットと、その日の `page-*.yml`・`console-*.log` を消す
- [ ] 直しがあればコミット `#00396: fix:…`

## Task 7: ドキュメントと全体の確認、マージの確認

- [ ] `SPEC.md`（国の道）、`TASKS.md`（6を完了）を更新して、コミット
- [ ] 全体のテスト（画面、サーバー）
- [ ] Review Focus の5点を、1つずつ確かめる
- [ ] 自分で見直す（最終見直しは自分によるもの）
- [ ] Ownerに報告して、マージの確認をとる。このブランチには、地面の絵（#00388・#00389）と道の絵（#00390）も入っている。プッシュはOwner
