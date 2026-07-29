# 開発プロセス・Git運用ルール

## 開発フロー

思いつきでいきなり実装に入らず、以下のフェーズを順に踏む。

1. **仕様** — 何を作るか、企画意図の整理
2. **要件定義** — 機能要件・非機能要件の明文化
3. **基本設計** — 画面構成、API、DB設計の大枠
4. **詳細設計** — テーブル定義、API仕様、処理フローの詳細
5. **開発** — 実装
6. **テスト** — 単体・結合・受け入れテスト

各フェーズの成果物は `docs/` 配下にMarkdown（日本語）で残す。`docs/StageDesign.md` はこのフローの「基本設計〜詳細設計」の実例。

## フェーズ別SKILLS（今後整備）

フェーズごとに専用のSKILLを用意すると、毎回同じ観点で仕様〜設計〜テストを進められる。以下は必要になったタイミングでCEO主導で整備する（現時点では未作成）：

- 仕様整理SKILL
- 要件定義SKILL
- 基本設計SKILL
- 詳細設計SKILL
- 開発（実装）SKILL
- テストSKILL

## 技術スタック

- Frontend: Next.js（`frontend/`、React / TypeScript / Tailwind CSS）
- Backend: Laravel（Laravel Sail、PHP）
- DB: MySQL
- コンテナ: Docker（Laravel Sail）
- 本番環境: AWS（想定）
- コード管理: GitHub（`katsuhiro1215/Spra-go`、接続済み）

## コミット前チェック

型チェック自体はセキュリティ対策ではないが、AIエージェントも含めた実装の安定性を保つための最低限のコストが低い保険として、変更した側は必ず実行する。

- Backend（`app/`, `routes/`, `database/` 等を変更した場合）: `php artisan test`（Sailコンテナ内で実行。例: `docker exec <laravel.testコンテナ名> php artisan test`）
- Frontend（`frontend/` を変更した場合）: `frontend/`配下で `npm run lint` と `npm run typecheck`

## Git運用ルール

- コミットメッセージは `.gitmessage` のフォーマットに従う：`<type>(日本語用途): <summary>`
  - type: feature / fix / style / refactor / chore / docs / test / perf / security / ci / data / a11y / spike / ai
  - 1コミット1目的、現在形、要約は50字以内
- 既存の運用として `#00014: feature:Shop追加` のように連番＋typeを付与する形式が定着している。これを踏襲する。
- 機能ごとにブランチを切る（例: `OwnerDashboard`, `Quiz`, `Category` など）
- コミットはこまめにpushする
- **マージはPull Requestを経由し、慎重に行う**（featureブランチ → 対象ブランチ → 最終的に`main`）
  - 動作確認・レビューを経てからマージする
  - `main`への直接pushは行わない
