# Tane のダッシュボードについての依頼（Spra Go 側の作業）

- 作成: 2026-10-22（Tane 側のチャットから）
- これは依頼メモ。実装の詳細設計は Spra Go 側のチャットで決めてよい
- 前提: `2026-10-21-tane-account-sync-request.md`（アカウント連携の依頼。実装済み）・引き継ぎ文書 `company/spra/tane/docs/2026-10-22-spra-go-side-done-handoff.md`

## 背景

Tane には、運営側が全体の利用状況を見るための管理ダッシュボードが無い。Tane は Spra Go のアカウント・プロフィールを共有しているだけなので、**ダッシュボードは Spra Go 側に1つだけ置く**方針にしたい（Tane 側にも Tane 専用の規約・プライバシーポリシーは作らない方針と同じ考え方）。

すでに `GET /api/owner/dashboard/summary`（`routes/api.php`）に `apps.counts` として、アプリ別（go・tane・world）の利用者数が出る仕組みがある（`App\Support\AppUsage::summary()`、`config/apps.php`）。これは「Tane を使った人が何人いるか」までは分かるが、**Tane の中でどこまで遊んでいるか**は分からない。

## お願いしたいこと

優先度は Owner が決めてよい。Tane 側で「これなら用意できる」と判断したものだけを挙げる。

1. **Tane の集計を1つのAPIにまとめる**（例: `GET /api/owner/dashboard/tane`、`auth:owner` 必須）
   - Tane のプロフィール数（`tane_profile_states` などの行数。アカウント連携の設計書・引き継ぎ文書を参照）
   - 直近7日に Tane で遊んだ日がある人数（`tane_play_days` を使う）
   - あそびごとの★の合計・最大（たしざん・ひきざん・かけざん・わりざん・フラッシュ・そろばん・たねまき）。Tane 側の `src/lib/account/parent-summary.ts` に、1人分の同じ計算をする関数があるので、考え方はそこを参考にしてよい（全体の合計を取るだけなので、計算そのものは Spra Go 側で SQL に落としてよい）
   - 「ログインしてから最初のプロフィールを選んだ人」のうち、実際に1回以上遊んだ人の割合（引き継ぎがうまくいっているかの目安）
2. **既存の Owner Dashboard 画面（`frontend/src/app/owner/dashboard/page.tsx`）に、Tane のカードを1〜2枚足す**
   - 既存の `KpiCard` コンポーネントの使い回しでよい
   - 「もっと詳しく」の折りたたみ・別ページにするかは、Spra Go 側の画面の作りに合わせて決めてよい

## 確認したいこと

- 上の集計のうち、今すぐ要るもの・あとでよいものがあれば教えてほしい（Tane 側は急いでいない）
- `tane_profile_states` ・`tane_play_days` ・`tane_stage_records` の正確なカラム名は、Spra Go 側の実装（アカウント連携のときに作成ずみ）を見てもらえば分かるはずなので、ここでは名前を仮で書いている

## 完了の目安

- 既存の `owner/dashboard/summary` のテストが壊れない
- 新しい集計に、Pest のテストがある

## 本番への反映

Spra Go 側だけの変更（API・画面）なので、いつもの Spra Go のデプロイ手順（`scripts/deploy.sh`・`docs/ops/production-runbook.md`）にまとめて含めてよい。Tane 側の本番設定（`TANE_LOGIN_ENABLED`・`NEXT_PUBLIC_TANE_LOGIN`。今はどちらも off）には関係しない
