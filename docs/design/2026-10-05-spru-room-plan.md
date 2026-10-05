# スプルの家の中（見るだけの部屋）— 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。手順は `- [ ]` で追う。

**Goal:** 町のスプルの家をタップすると、家の中の部屋が開き、起きているスプル（手を振る・座る）か、ベッドで眠るスプルが見える。寝ているスプルは、町の道の上ではなく、家の中にいる。

**Architecture:** サーバーは変えない（画面だけ）。素材を変換するスクリプトと、位置・動きの純粋な関数（`room-layout.ts`・`room-state.ts`）を作り、部屋のカード（`RoomView`）を町の画面から開く。町では、寝ているスプルを描かず、家のしるしを出す。

**Tech Stack:** Next.js/TypeScript（Vitest）、Python（Pillow）

**Spec:** `docs/design/2026-10-05-spru-room-design.md`

ブランチ: `feature/spru-room`（設計書 #00399 はコミット済み）。この計画 #00400、実装は #00401 から。コミットの形式は `#NNNNN: type:要約`＋Co-Authored-By。

## Global Constraints

- サーバー・データベース・窓口は変えない
- 部屋の昼・夜は、町が持っているスプルの様子 `spru.sleeping`（`components/spru/mood.ts`）を、そのまま受け取る。部屋で時刻を計算しない
- 寝ているスプルは、これまでどおり、タップで起きる（`handleSpruTap` の寝ている分岐と同じ処理を、部屋のスプルをタップしたときに呼ぶ）。夜に起こすと、その夜は起きたまま（`setNightWokenAt`）
- 配置は、元の絵の1254×1254の座標（足元の中心 `cx`・`bottom` と倍率 `scale`）で書く。奥から手前の順に描く
- 追加の画像は合計400KB以内（WebP）
- テスト: `cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`。サーバーは触らないが、最後に `./vendor/bin/sail test` も流す
- 開発用データベース: 確認のあと、プロフィール7を元の状態に戻す（この機能はデータを変えないが、起こす操作でプロフィールの記録が変わらないことも確かめる）

## Review Focus

- 部屋を開いたまま、スプルが寝る・起きると、部屋の絵が入れ替わる（古い絵が残らない）
- 寝ているスプルを部屋でタップすると、町のスプルも起きる（町と部屋が食い違わない）
- 町の寝ているスプルが出ない間も、町のほかのタップ（畑・アイテム・仲間・家）が、今までどおり動く
- 家のタップの範囲が、近くのアイテム・畑のタップをじゃましない（家の周りのマスに置いたアイテムがタップできる）
- スマホ幅で、部屋の絵・家具・スプルが切れず、「もどる」が押せる

## Task 1: 計画のコミット

- [ ] この計画を #00400 でコミットする（設計書の直し〈寝ているかで決める〉も一緒に）

## Task 2: 動きの純粋な関数（先にテスト）

**Files:** `frontend/src/components/room/room-state.ts`、`frontend/src/components/room/room-state.test.ts`

**Interfaces:**
- Produces:
  - `roomMode(sleeping: boolean): "day" | "night"`
  - `roomSpruPose(state: { openedAt: number; lastTapAt: number | null }, now: number): "idle" | "wave" | "sit"` — `lastTapAt` から1600ms未満は `wave`。それ以外で、`lastTapAt`（なければ `openedAt`）から8000ms以上たっていれば `sit`。それ以外は `idle`
  - `ROOM_WAVE_MS = 1600`、`ROOM_SIT_AFTER_MS = 8000`
  - `roomLine(mode: "day" | "night", tapCount: number): string` — 昼は「やっほー！」「おかえり！」「きょうも いい日だね」を `tapCount` 回目で順に回す。夜は「すやすや…」

- [ ] 先にテスト（RED）: `roomMode(true)` が `night`・`(false)` が `day`、`roomSpruPose`（開いた直後は `idle`・7999msで `idle`・8000msで `sit`・タップの1599ms後は `wave`・1600ms後は（8秒たっていなければ）`idle`・タップ後8000msで `sit`・タップするとまた `wave`）、`roomLine`（昼の3つが順に回り4回目で戻る・夜は常に「すやすや…」）。**Expected:** 失敗
- [ ] 実装 **Expected:** 通る
- [ ] コミット `#00401: feat:部屋のスプルの様子を決める純粋な関数(roomMode・roomSpruPose・roomLine)を足す`

## Task 3: 素材の変換と配置（先にテスト）

**Files:** `tools/room-assets/make_room.py`、`frontend/public/spru/room/*.webp`、`frontend/src/components/room/room-assets.ts`（スクリプトが書き出す。手で直さない）、`frontend/src/components/room/room-layout.ts`、`frontend/src/components/room/room-layout.test.ts`

**Interfaces:**
- Produces:
  - `ROOM_ASSETS: Record<RoomAssetKey, { src: string; x: number; y: number; width: number; height: number; outWidth: number; outHeight: number }>` — `x`・`y`・`width`・`height` は、元の1254×1254の中の、透明な余白を詰めた範囲（切り抜きの位置と大きさ）。`outWidth`・`outHeight` は、書き出したWebPの大きさ。キー: `room`・`bed`・`bed_sleeping`・`table`・`chair`・`spru_idle`・`spru_wave`・`spru_sit`
  - `ROOM_CANVAS = 1254`
  - `roomItems(mode, pose): { key: RoomAssetKey; left: number; top: number; width: number; height: number }[]` — 奥から手前の順（部屋→ベッド〈夜は眠るスプル入り〉→テーブル→椅子→スプル〈昼のみ〉）。`left`・`top`・`width`・`height` は、元の1254×1254の座標での、描く位置と大きさ（`scale` と足元の中心から計算）

- [ ] `make_room.py`: 元の絵を `company/spra/spra-world/assets/approved/` から読み、透明な余白を詰めて（アルファ>24の範囲）、長い方の辺が、部屋1024・家具と眠るスプル512・スプル384になるようWebPにする。`frontend/public/spru/room/{キー}.webp` に出し、`room-assets.ts` を書き出す。合計が400KB以内か表示する
- [ ] 先にテスト（RED）: `room-layout.test.ts`: すべての物が、1254×1254の中に収まる・昼は `bed` が入り `bed_sleeping` は入らない／夜は逆でスプル（`spru_*`）が入らない・描く順が、部屋が最初・昼のスプルが最後・倍率どおりの大きさ（`width = ROOM_ASSETS[key].width × scale`）・`pose` が `wave`・`sit`・`idle` で、スプルの絵が切り替わる。**Expected:** 失敗
- [ ] 実装（初期値は設計書4章の表。ベッド 0.34・眠るスプル入りベッド 0.30・テーブル 0.27・椅子 0.19・スプル 0.20。座る・手を振るスプルは、待機と、足元の中心をそろえる。座る絵は、座面接地点を足元の中心にする） **Expected:** 通る
- [ ] コミット `#00402: feat:部屋の素材(部屋・家具・眠るスプル・スプルの3つのポーズ)の変換と、配置を決める関数を足す`

## Task 4: 部屋のカードと、町の変更

**Files:** `frontend/src/components/room/room-view.tsx`、`frontend/src/components/world/world-scene.tsx`、`frontend/src/components/world/world-screen.tsx`

- [ ] `RoomView`（全画面のカード。`BornOverlay` などと同じ作り。`z-[60]`）: `ROOM_CANVAS` を `aspect-ratio: 1 / 1` の、幅いっぱい（最大480px）の入れ物にし、`roomItems` の各絵を `position: absolute` で、`left / 1254 * 100%` などの割合で置く（スマホ幅でも拡大縮小に追随する）。昼のスプルは、タップできるボタンにする（見えない当たり判定は、絵と同じ大きさ）。`roomMode`・`roomSpruPose`・`roomLine` を使い、`pose` は `setInterval`（200ms）で見直す。夜は全体に `brightness(0.8) saturate(0.9)`。夜は、窓の位置に、あたたかい色の光の輪（半透明の円）を重ねる。ふきだし（ひとこと）をスプルの上に出す。「もどる」ボタン。`prefers-reduced-motion` のときは、手を振る動きだけにする（座る・戻るは、今のまま）
- [ ] 寝ているスプルをタップしたら、`onWake` を呼ぶ（呼び出し側が `handleSpruTap` の寝ている分岐と同じ処理を行う）。起きたら、部屋は `day` になり、ひとこと「ふぁ…」を出す
- [ ] `world-scene.tsx`: スプルの家（`landmarks` の `spru_house`）に、タップの範囲（`onHouseTap`）を足す（畑の `gardenTarget` と同じ作り）。`readOnly`（家族の町）では、足さない。範囲は、家の絵の大きさ（`halfWidth: 30`、`up: 52`、`down: 8`）で、近くのアイテム・畑のタップをじゃましないよう、`byDepth` の並びで、ほかのタップの後ろに置く
- [ ] `world-scene.tsx`: `spru.sleeping` のとき、町のスプル（`kind: "spru"`）を描かず、家の上に「z z z」（小さな文字、ふわふわ動く）を出す
- [ ] `world-screen.tsx`: `roomOpen` の状態を持つ。`onHouseTap` で開く。`RoomView` に `sleeping={mood.sleeping}`・`onWake`（`handleSpruTap` の寝ている分岐）・`onClose` を渡す
- [ ] `cd frontend && npx tsc --noEmit && npm run lint && npx vitest run` **Expected:** すべて通る
- [ ] コミット `#00403: feat:町のスプルの家をタップすると部屋が開く(寝ているスプルは家の中・町には出さない)`

## Task 5: ブラウザで確かめる

- [ ] ログイン `test@example.com`／プロフィール7（町テスト）。スクリーンショットは `.playwright-mcp/` の下だけ
- [ ] 昼: 町の家をタップ→部屋。スプルが立っている→タップで手を振る・ひとこと→8秒で座る。スマホ幅（375px）とデスクトップ幅で、切れない・「もどる」が押せる
- [ ] 寝ているとき: `Date` を、手元で22時台に差し替えて（`browser_evaluate`）、町にスプルがいない・家に「z z z」・部屋でベッドで眠る・タップで起きる（町にスプルが現れる、部屋が昼の絵になる）
- [ ] 家の周りに置いたアイテム・畑のタップが、今までどおり動く
- [ ] 確かめたあと、プロフィール7を元の状態に戻す（変わっていないことを確かめる。xp 20、coins 60、points 95、ledger 最大668、`world_items` 4件など）。スクリーンショットと、その日の `page-*.yml`・`console-*.log` を消す
- [ ] 直しがあればコミット `#00404: fix:…`

## Task 6: ドキュメントと全体の確認、マージの確認

- [ ] `SPEC.md`（スプルの家の中）、`TASKS.md`（第3段階を完了、ルミのポーズ・仲間の家・家具を置く部屋をあとの案に）を更新して、コミット
- [ ] 全体のテスト（画面、サーバー）
- [ ] Review Focus の5点を、1つずつ確かめる
- [ ] 自分で見直す（最終見直しは自分によるもの）
- [ ] Ownerに報告して、マージの確認をとる。プッシュはOwner
