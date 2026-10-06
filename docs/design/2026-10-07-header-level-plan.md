# ヘッダーのレベルの輪・状態パネル・ショップの表示の直し — 実装計画

- 設計書: `docs/design/2026-10-07-header-level-design.md`（Owner合意済み: 100から始めるレベル曲線・状態パネルの中身・ヘッダーの置き方）
- ブランチ: `feature/header-level`。実行はインライン（サブエージェントなし）、最後に自分で見直す
- テスト: サーバーは `./vendor/bin/sail test`（Pest。全体は他のテストと同時に流さない。同じ testing DB でデッドロックする）、フロントは `cd frontend && npx vitest run`・`npx tsc --noEmit`・`npx eslint src`。TDD（先に失敗するテストを書く）

## 今のコードで分かっていること

- レベルの曲線は `app/Support/LevelCurve.php`（`config('world.level_curve')` = base 100・step 20・max 300）。`UserProfile::applyEconomy` が `levelForXp` で上げる（下げない）。`LevelCurve::progress($level)` が `{floor, next}`（合計XP）を返す。
- 答えのAPIは `level_xp`（`progress`）を返す。町のAPIも。**`GET /api/profiles/active` は `level_xp` を返さない**（`profile->toArray()` のみ）。フロントの `Profile`（`ProfileProvider`）には `xp`・`level` はあるが `level_xp` がない。
- パスポートAPI（`GET /api/passport`）は `country_levels`・`language_levels`（各 `{name, level, max}` の列）を返す。状態パネルはこれを使う（新しいAPIは作らない）。
- 下のメニュー「じぶん」は `components/app/me-sheet.tsx`。ヘッダーは `components/app/app-header.tsx`。ショップは `app/shop/page.tsx`。戻るボタンは `components/app/back-link.tsx`。

## タスク

### 1. レベルの上がり方（#00516）
- `config/world.php` の `level_curve` を `['base' => 100, 'linear' => 10, 'square' => 0.5, 'round' => 5]` に変える。`LevelCurve::xpToNext` を `round5(base + linear×(L−1) + square×(L−1)²)`（`max` はなくす）にする。
- `GET /api/profiles/active` に `level_xp`（`LevelCurve::progress($profile->level)`）を足す（ヘッダーの輪が使う）。
- テスト: `tests/Feature/LevelCurveTest.php` を新しい数字に直す（合計XPの表: Lv.2=100・Lv.3=210・Lv.6=615・Lv.11=1,595・Lv.16=3,060・Lv.21=5,140・Lv.31=11,635・Lv.51=37,475）。頭打ちがない（Lv.50でも次までが増え続ける）。`levelForXp` と `totalXpFor` が境目で一致。前の計算で上がっていたレベルは下がらない（既存のテストを残す）。`profiles/active` が `level_xp` を返す。`CatchGameFinishTest` のレベルアップのテストが、新しい数字でも通ることを確認（通らなければ直す）。

### 2. ヘッダーのレベルの輪と、絵だけのPT・コイン（#00517）
- `lib/level-ring.ts`（新）: `ringFraction(xp, {floor, next})`（0〜1、範囲外は丸める。`next <= floor` は0）、`xpToNextText(xp, {floor, next})`（「あと 120 XP」）。と、Vitest のテスト（0%・50%・100%・次のレベルに届いた直後・不正な範囲）。
- `components/app/level-ring.tsx`（新）: 直径40pxのSVG。輪は12時から時計回り（`stroke-dasharray`。`rotate(-90)`）。中にレベルの数字（2桁・3桁でも収まる文字サイズ）。`prefers-reduced-motion` のときは伸びの動きなし。`aria-label`「レベル5。次のレベルまであと120 XP」。
- `Profile` 型に `level_xp: { floor: number; next: number }` を足す。`applyPartial` で答えのAPIの `level_xp` も反映（答えると輪が伸びる）。`quiz-session.tsx` など、`applyPartial` を呼んでいる所で `level_xp`・`xp`・`level` を渡す。
- `app-header.tsx`: 右の列を、上の段「輪＋体力ゲージ」・下の段「連続日数・PTの絵・コインの絵」にする。PT・コインは `LearnPointsBadge`・`PointsBadge` ではなく、絵だけの小さな丸バッジ（`components/app/currency-icon.tsx`・新。`title` と `aria-label` を付ける）。
- テスト: Vitest（`level-ring.ts`）。tsc・eslint。

### 3. 「じぶんの状態」パネル（#00518）
- `components/app/status-sheet.tsx`（新）: 下から出るシート（`me-sheet.tsx` と同じ `DialogPrimitive` の作り）。アバター・名前・レベル（大）・次のレベルまでの棒と「あと◯ XP で Lv.◯」・PT／コインの2枚のカード（絵＋名前＋数字）・連続日数・国レベル／言語レベルの上位3つ（`GET /api/passport` を開いたときに読み込む。クリアの多い順。0のものは出さない）・「パスポートを見る」ボタン。読み込み中・失敗のときは、その部分だけ控えめに出す。
- `lib/status-sheet.ts`（新）: `topLevels(rows, 3)`（level の多い順・0を除く・同数は元の順）と、そのテスト。
- `app-header.tsx`: 輪をボタンにして、タップでパネルを開く。
- テスト: Vitest（`topLevels`）。tsc・eslint。

### 4. ショップの表示と戻るボタン（#00519）
- `back-link.tsx`: `whitespace-nowrap` を付け、狭い画面でも1行に収める（`shrink-0`。必要なら文字を狭い画面だけ短くする）。
- `shop/page.tsx`: タイトルの右にあった PT・コインのバッジをなくし、タイトルの下に2枚のカード（`wallet-cards.tsx`・新。絵・名前・数字。横幅が足りなければ縦に積む）を出す。タイトルは1行。
- `status-sheet.tsx` の PT・コインのカードも、同じ部品を使う。
- テスト: tsc・eslint（見た目は5章の確認）。

### 5. 下のメニュー「じぶん」に単語帳（#00520）
- `me-sheet.tsx`: バッグ・パスポート・ずかんの並びに「単語帳」（`/words`）を足す。名前の下の「Lv.5」は、そのまま。
- テスト: tsc・eslint。

### 6. 確認・文書・マージ（#00521）
- 開発サーバーを再起動（固まっていたら `pkill -f next-server`、`rm -rf frontend/.next`、`npm run dev`）。確認用アカウント（`ui-verify@example.test`）で、375px・320px: ヘッダー（輪・絵だけのPT・コイン）、輪のタップ → 状態パネル、ショップ（カード・戻るボタン・タイトル）、下のメニューの「じぶん」、答えたあとの輪の伸び。**前回、未確認だった単語帳の画面**（絞り込み・検索・解説からのリンク・保存ボタン）もあわせて確認。確認後、確認用アカウントを消す。
- `SPEC.md`・`TASKS.md` を更新。全テスト（サーバーは単独で）・Pint・tsc・eslint、最終の見直し、`main` へマージ（Ownerの確認のあと）。
