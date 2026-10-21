# Tane 連携のための依頼（Spra Go 側の作業）

- 作成: 2026-10-21（Tane 側のチャットから）
- これは依頼メモ。実装の詳細設計は Spra Go 側のチャットで決めてよい。中身が仕様と食い違う場合は、このメモより `company/spra/tane/docs/2026-10-21-account-sync-design.md` を優先する

## 背景

Tane から、Spra Go のアカウントでログイン・登録し、プロフィールごとの Tane の記録を Spra Go のサーバーに持たせたい（Owner 承認済み・案A：ユーザーアカウントだけ共有、Tane 専用サーバーは作らない）。すでに Spra Go 側にある `docs/design/2026-10-14-multi-app-accounts-design.md`（共通アカウント設計。段階1は実装済み）を土台に、段階2・3の一部を先に進めたい。

参照（同じマシン上。絶対パス）:
- 設計書: `/Users/katsuhiro.k1215/SmartSprouts/company/spra/tane/docs/2026-10-21-account-sync-design.md`
- 実装計画（Tane 側チャットが作成。Spra Go 側はこのまま使ってよいし、作り直してもよい）: `/Users/katsuhiro.k1215/SmartSprouts/docs/superpowers/plans/2026-10-21-tane-account-sync-a-spra-go.md`

## お願いしたいこと（6つ、優先順）

1. **トークンのログイン・ログアウト**
   - `POST /api/auth/token`（`email, password, device_name` → Sanctum のパーソナルアクセストークン、90日、`Authorization: Bearer` で使う）
   - `DELETE /api/auth/token`（今のトークンだけ失効）
   - パスワードが無い（Google だけで登録した）人は 422 で、Spra Go の設定でパスワードを決めるよう案内
   - パスワード再設定のあと、その人のトークンは全部失効
   - 既定で **無効**（`TANE_LOGIN_ENABLED` のような設定、既定 off）。Tane の規約・プライバシーポリシーの更新（下記6）が済むまで、本番で 403 を返し続けたい
   - 既存のクッキーのログイン（`/login`・`/register`）はいっさい変えない

2. **Tane からの登録**
   - 既存の `RegisteredUserController` と同じ処理（招待制・招待コード・登録のおやすみ・同意の記録・家族アカウントの作成）を使って、トークンを返すだけの入口を1つ追加
   - `POST /api/auth/register-token` のようなもの。**Spra Go と同じ招待制に従う**（Owner 決定：誰でも登録できるようにはしない）
   - `GET /api/registration`（既存）をそのまま Tane からも呼べれば、追加は不要

3. **Tane 専用の表（3つ）と、記録の入口**
   - `tane_stage_records`（`user_profile_id, stage_id, stars, best_score, updated_at`。`user_profile_id` 削除で一緒に消える）
   - `tane_profile_states`（`user_profile_id` 一意, `challenge_best, endless_best, garden, garden_changed_at, last_mode, updated_at` の JSON 群）
   - `tane_play_days`（`user_profile_id, played_on` 一意）
   - `GET /api/tane/profiles/{profile}/progress`・`PUT /api/tane/profiles/{profile}/progress`（まるごと受け取り、サーバーの記録と「大きいほう」で合わせて保存。合わせ方の決まりは設計書6章）
   - プロフィールが、ログインした人の家族のものかを毎回確認（403）
   - Tane 側は Spra Go のステージの一覧を知らないので、**ステージIDの形と★1〜5の範囲だけ**確認してほしい（実在するかの確認は Tane 側で行う）

4. **保護者の確認と、家族の記録の入口**
   - 既存のランキング機能にある「パスワードで保護者を確認する」仕組み（`app/.../ranking` 内）と同じやり方でよい
   - `POST /api/auth/confirm-password` → 15分だけ「確認済み」
   - `GET /api/tane/parent/records` → 確認済みのときだけ、家族の全プロフィールの Tane の記録を返す

5. **CORS**
   - `allowed_origins` に Tane の画面の場所（`TANE_URL` のような環境変数）を追加

6. **法務（並行で進めたい）**
   - 規約・プライバシーポリシーに「Tane とアカウントを共有すること」「利用アプリ・記録の保存目的」「アプリごとに学習記録を分離すること」「アカウント削除で全アプリの記録が消えること」を追記
   - 既存ユーザーへの同意しなおし（版を上げて、ログイン後に確認画面）
   - アカウント削除の確認文に「Tane の記録も消えます」を追記

## 確認したいこと

- 上記の実装は、Spra Go 側のチャットで新しいブランチを切って進めてよいか（`feature/tane-account-sync` などの名前を想定）
- `TANE_LOGIN_ENABLED` のような設定の名前・置き場所（`config/tane.php` 新設 or 既存の `AppSettings` に寄せる、どちらが馴染むか）
- 本番に出すタイミング（設定が off なら無害なので、6（法務）より先にデプロイしてよいと考えている）

## 完了の目安

- 計画Aのテストがすべて通る（Pest）
- 既存の認証・登録・CORS のテストが壊れない
- `SPEC.md` の4-1に、Tane 連携の実装状況を追記
