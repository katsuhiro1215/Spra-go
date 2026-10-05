# パスポートの「日本のバッジ」— 実装計画

> **実行方法:** ネイティブ（サブエージェントは使わず、インラインで実装し、最後に自分で見直す）。

**Goal:** パスポートに、47県のバッジ（もらった数・地方ごとの一覧・押すとコースへ）を出す。
**Spec:** `docs/design/2026-10-06-passport-prefecture-badges-design.md`
ブランチ: `feature/prefecture-badges-passport`。設計書 #00434、この計画 #00435、実装は #00436 から。

## Global Constraints
- `GET /api/passport` の今の項目は変えない。新しい表・窓口は作らない
- テスト: `./vendor/bin/sail test`（`--parallel` なし）、`cd frontend && npx vitest run && npx tsc --noEmit && npm run lint`
- 開発データベース: 確認のあと、プロフィール7を元の状態に戻す（Ownerのプロフィール id 2 には触らない）

## Review Focus
- 別のプレイヤーの称号で、もらったことにならない
- コースが見つからない県でも、返事が壊れない（`course_id` が null）
- スマホ幅で、バッジが切れず、県名が重ならない

## Task 1: サーバー（先にテスト）
**Files:** `app/Support/Prefecture/PrefectureBadges.php`、`routes/api.php`、`tests/Feature/PassportTest.php`
- [ ] 先にテスト（RED）。**Expected:** 失敗
- [ ] `PrefectureBadges::list(array $titles): array` と、返事への `prefecture_badges` の追加 **Expected:** 通る
- [ ] コミット `#00436: feat:パスポートの返事に、47県のバッジ(もらったか・コースの番号)を足す`

## Task 2: 画面（先にテスト）
**Files:** `frontend/src/lib/prefecture-badges.ts`・`.test.ts`、`frontend/src/app/passport/page.tsx`
- [ ] 先にテスト（RED）: `groupBadgesByRegion`・`badgeCountText`。**Expected:** 失敗
- [ ] 関数と、パスポートの「日本のバッジ」の節 **Expected:** 通る（`tsc`・lint も）
- [ ] コミット `#00437: feat:パスポートに「日本のバッジ」(地方ごと・もらった数・コースへのリンク)を出す`

## Task 3: ブラウザで確かめて、ドキュメントと全体のテスト
- [ ] パスポートで、地方ごとに並ぶ・白黒/カラー・押すとコースへ・スマホ幅。確認のあと、プロフィール7を元に戻す
- [ ] `SPEC.md`・`TASKS.md`（段階4を完了）、全体のテスト、自分で見直す（自分によるもの）、Ownerに報告してマージの確認
