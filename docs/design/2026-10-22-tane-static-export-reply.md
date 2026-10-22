# Tane の静的書き出し対応（Tane 側からの回答）

- 作成: 2026-10-22（Tane 側のチャットから）
- 依頼文: `2026-10-22-tane-static-export-request.md` への回答

## 結果

**対応ずみ。B案（Node のコンテナを足す）への切り替えは不要。**

依頼の6項目は対応ずみ（実装計画: `docs/superpowers/plans/2026-10-22-tane-static-export.md`）。最初の実装で1つ不具合が見つかり、直してから確認した（「見つかった問題」参照）。

1. `next.config.ts` に `output: "export"`・`trailingSlash: true` を追加（`images: unoptimized` は変更なし）
2. 動的ルート6つ（`stage`・`seed`・`soroban`・`flash`・`mode`・`challenge`）に `generateStaticParams`・`dynamicParams = false` を追加。`npm run build` で202ページの静的HTMLが書き出せた
3. `mode/[modeId]` の `?stage=` は、`useSearchParams()`（依頼の提案どおり）で読む形にした。最初は「元から `?grew=&from=` を `window.location.search` から1回だけ読んでいた仕組みに相乗りする」形で試したが、画面の中を移動して戻ってきたとき（例：ステージを選んでから「やめる」で戻る）に新しい `?stage=` に気づけない不具合があったため、`useSearchParams()` に変えた。これは React のフックなので、画面を作り直さずに URL だけ変わっても読み直される。`Suspense` は無くてもビルドが通った（この画面はもともと `ssr: false` で、サーバー側では描かないため）
4. ビルドの確認：`npm run build` → `out/` → `npx serve out` で配り、Playwright で確認。クリックでの画面遷移だけでなく、`window.next.router.push(...)` で画面内の移動を再現し、「ステージを選ぶ → やめる → 選んでいたステージが残っている」「なかまが育つ演出（`?grew=&from=`）のあと、URL からその分が消える」の両方を確認した。`/stage/add-1/` の直接URL・リロードで404にならない、`/stage/doesnotexist/` は404になる、`/settings`・`/friends`・`/challenge`・`/account/login`・`/account/parent` などすべて開く
5. 環境変数（`NEXT_PUBLIC_SPRA_API_URL`・`NEXT_PUBLIC_TANE_LOGIN`）はビルド時に埋め込まれる前提のままで、コードは変えていない
6. `public/sw.js` について：
   - ページ遷移（`navigate`）はネットワーク優先なので、デプロイ後にHTMLが古いまま出続けることはない
   - `CACHE_NAME` を今回の移行の節目として `v2` → `v3` に1回だけ上げた（配り方が変わる・URLの形が `trailingSlash` で変わるため）
   - ただし、画面内の移動用データ（`*.txt`・`_rsc` を含むリクエスト）と `public/` の画像は、**ビルドが変わっても同じファイル名**なので、今の `sw.js` の「静的アセットはstale-while-revalidate」のままだと、デプロイした直後の1回だけ古いデータが返る可能性がある（Next がビルドIDの違いに気づいて普通の読み込みに切り替えるので、実害は小さいと見ている）。ここは直していないので、気になる場合は Tane 側で `.txt`・`_rsc` もネットワーク優先に変える対応を別途行う

## 見つかった問題

- **直した**: `?stage=` を画面を作り直さずに読む仕組み（3を参照）。直す前は「ステージをやめてあそび画面に戻ると、選んでいたステージが外れる」不具合があった
- **直していない（害は小さいと判断）**: 演出のあとの URL 書き換え（`replaceState`）が、末尾スラッシュの無い形（`/mode/add?stage=...`）になる。Caddy 側で308のリダイレクトが1回挟まるだけで、動作には影響しない
- Caddy の `file_server` は、静的サーバーの `serve` と違って `404.html` を自動では返さないはず。`handle_errors` で `/404.html` を返す設定をお願いしたい

## このあとの流れ（Spra Go 側にお任せする分）

依頼文の「このあとの流れ」どおりで進めてもらって大丈夫（`Dockerfile.prod`・`Caddyfile.prod`・DNS・`.env.production` の `TANE_URL`）。上の「Caddy の404」もあわせてお願いしたい。Tane 側の `npm run build` は、いつもどおり `frontend/` で実行すれば `out/` ができる。
