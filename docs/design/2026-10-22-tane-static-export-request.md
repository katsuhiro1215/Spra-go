# Tane を静的書き出しにするための依頼（Tane 側の作業）

- 作成: 2026-10-22（Spra Go 側のチャットから）
- 目的: Tane を Spra Go と同じ Lightsail に、**静的ファイルとして**置く（Owner 決定: A案）。Caddy が `tane.spra.jp` でファイルを配るだけにして、Node のコンテナを増やさない（インスタンスは2GBで余裕が少ない）。
- Spra Go 側（Dockerfile.prod にビルド段階を足す、Caddyfile にサイトを足す）は、この依頼が終わってから行う。

## 調べて分かっていること（Spra Go 側の調査）

- サーバー側の処理は使っていない（API ルート・`use server`・cookies・ミドルウェアなし）。静的に配れる作り。
- 次の2点だけが、静的書き出し（`output: "export"`）の妨げになる。

## お願いしたいこと

1. **`next.config.ts` に `output: "export"` を足す**（`images: { unoptimized: true }` は今のまま）。`trailingSlash: true` も推奨（`/stage/add-1/` のように `index.html` を持つ形にして、Caddy の `file_server` でそのまま配れるようにする）。
2. **動的なURLに `generateStaticParams` を足す。** 対象は `src/app` の次のページ。ステージ・あそびの一覧（`@/data/stages/catalog` の `STAGES`・`MODE_IDS`）から作る。
   - `stage/[stageId]`・`seed/[stageId]`・`soroban/[stageId]`・`flash/[stageId]`（それぞれ、そのあそびのステージIDだけを返す。種類のちがうIDは `notFound()` のままでよい）
   - `mode/[modeId]`・`challenge/[modeId]`（`MODE_IDS`、または各ページが受け付けるあそびだけ）
   - `dynamicParams = false` を付けて、一覧にない URL は 404 にする。
3. **`mode/[modeId]/page.tsx` が、サーバー側で `searchParams`（`?stage=` など）を読んでいる。** 静的書き出しでは使えないので、**ブラウザ側で読む形**にする（`ModeScreenLoader` の中で `useSearchParams()` を使う。`Suspense` で包む）。`parseModeSearchParams` は今のまま使い回せるはず。画面の動き・URL の形は変えない。ほかのページで `searchParams` を読んでいる所が無いかも確かめる（調査では `mode` だけだった）。
4. **ビルドの確認。** `npm run build` で `out/` ができ、`npx serve out`（または同等の静的サーバー）で、ホーム・各あそび・ステージ・チャレンジ・設定・なかま図鑑・`/account/*` が開くこと。直接 URL を開く・リロードしても 404 にならないこと。既存の vitest・Playwright の確認スクリプトが通ること。
5. **環境変数はビルド時に決まる。** 静的なので `NEXT_PUBLIC_SPRA_API_URL`・`NEXT_PUBLIC_TANE_LOGIN` は**ビルドの時点で埋め込まれる**（あとから変えるには再ビルド）。この前提で問題がないか確かめてほしい（`flags.ts` の `process.env.NEXT_PUBLIC_*` はビルド時に置き換わるので、そのままで動くはず）。
6. **Service Worker（`public/sw.js`）。** 静的に配るときの、キャッシュの更新の仕方（ビルドごとに版が変わるか）を確かめてほしい。古い `sw.js` が残って、新しい画面に更新されない問題が無いように。`sw.js` は Caddy 側で `Cache-Control: no-cache` で配る予定（Spra Go 側で行う）。

## 確認したいこと

- 3 の `searchParams` の直し方は、Tane 側の判断でよい（`useSearchParams` 以外でもよい）。
- 静的書き出しにして、動かなくなる機能が見つかったら、Spra Go 側に知らせてほしい（その場合は B案＝Next のコンテナを足す、に切り替える）。

## 完了の目安

- `next build` が `out/` を出力し、上の 4 の確認が通る。
- 既存のテストが壊れない。
- 手元で `out/` を配ったときの、ホームから1ステージ遊ぶまでの動作確認の結果を、Spra Go 側に伝える。

## このあとの流れ（Spra Go 側。参考）

1. `Dockerfile.prod` に、Tane をビルドして `out/` を `web`（Caddy）のイメージへ置く段階を足す。
2. `Caddyfile.prod` に `{$TANE_SITE:tane.spra.jp}` のサイトを足す（`file_server`、gzip、`sw.js` は no-cache）。
3. DNS に `tane` の A レコード（`go` と同じ IP）を作る（Xserver の安定を待ってから）。
4. `.env.production` の `TANE_URL=https://tane.spra.jp`。ログインを有効にするのは、規約の更新が済んでから。
