# Spraと鹿。を本番(deer.spra.jp)へ載せる — Spra Go への依頼(Taneと同じ形)

作成: 2026-11-21(Spraと鹿。のチャットから)
渡す相手: Spra Go 専用チャット(と、AWS に SSH で入れる Owner)
前提: `2026-11-21-spra-go-deer-account.md` の依頼は、返信のとおり `main` に入っている。今回は **配信(ホスティング)** の依頼。

## 何をしたか(Spra Go リポジトリ、ブランチ `feat/deer-hosting`)

Tane と同じ形で、静的ファイルを小さな Caddy で配る `deer` コンテナを足した。`main` には入れていない(Spra Go の決まりに合わせた)。レビューして `main` に入れてほしい。

- `Dockerfile.prod` … `deer-build`(Node 22 で `npm ci` → `npm run build` → `out/`)と `deer`(Caddy に `out/` を載せる)の段を追加。ビルドの引数は `NEXT_PUBLIC_SPRA_API_URL`・`NEXT_PUBLIC_DEER_LOGIN`
- `Caddyfile.deer` … `Caddyfile.tane` と同じ。違いは、`_next/static` 以外をすべて `no-cache`(画像・音を同じ名前で差し替えるため。変わっていなければ 304)
- `Caddyfile.prod` … `{$DEER_SITE:http://deer.invalid}` のブロック(`deer:80` へ中継)。`DEER_SITE` を入れるまでは、証明書を取りにいかない
- `compose.prod.yaml` … `deer` サービス(profile `deer`・メモリ48MB・`additional_contexts: deer-src`)、caddy に `DEER_SITE`
- `scripts/deploy.sh` … `~/deer/package.json` があるときだけ、いっしょに作って配る(`DEER_SRC=` で場所を変えられる)。profile は `tane` と `deer` を、カンマでつなぐ形にした(これまでは `tane` 固定だった)
- `.env.production.example` … `DEER_URL`・`DEER_LOGIN_ENABLED`・`DEER_SITE`・`DEER_API_URL`・`DEER_LOGIN`
- `docs/ops/production-runbook.md` … 「Spraと鹿。(静的ファイル)を同じインスタンスに置く」を追記(手順・確認・ログインを有効にする第2段階)

## 確かめたこと

- `bash -n scripts/deploy.sh` が通る。`compose.prod.yaml` の YAML が読める
- 本番と同じ `Dockerfile.prod` の `deer` の段を、手元の Docker でビルドした(結果は下の「ビルドの結果」)
- **確かめていない**: サーバー(Lightsail 2GB)でのビルド(メモリ・時間)・`deploy.sh` 全体の通し・`tane` と `deer` を両方有効にしたときの動き・DNS・証明書

## Owner が SSH でやること(Tane と同じ)

1. `feat/deer-hosting` を `main` に入れる(Spra Go のチャット)→ サーバーで `git pull`
2. `cd ~ && git clone https://github.com/katsuhiro1215/Spra-deer.git deer`(非公開リポジトリ。デプロイキーかトークン)
3. DNS: `deer` の A レコード(`go` と同じ IP)→ `dig +short deer.spra.jp`
4. `.env.production`: `DEER_SITE=deer.spra.jp`・`DEER_URL=https://deer.spra.jp`。**`DEER_LOGIN` は空・`DEER_LOGIN_ENABLED=false` のまま**(第1段階)
5. `scripts/deploy.sh --no-pull`

## 第1段階(ログインなし)で試すこと

「本番で ちゃんと動くか」を見る段階。ログインの入口は出ない。

- `https://deer.spra.jp/` が開き、季節の背景(冬)と Spra・鹿。「はじめる」→ ホーム → ワールドえらび
- 直接開く: 各ゲームのページ(`/run/`・`/bake/`・`/sweep/`・`/sumo/`・`/jump/`・`/lost/`・`/cart/`。面は `?level=7-1` のように指定)
- **音**: BGM(ホーム・各ゲーム)が鳴る。`/assets/audio/*.mp3` がサーバーから返る(Range 要求で途中から再生)
- 画像: `/assets/hero/`・`/assets/costume/xmas-stag.webp` が開く
- 12月: お店で衣装が買える(ゴールド。テストなら、面をクリアして貯める)・なかまで着せかえ
- `/terms/`・`/privacy/`・存在しないURL(404のページ)
- `curl -I https://deer.spra.jp/assets/hero/stag.png` が `Cache-Control: no-cache`、`/_next/static/...` が `immutable`
- スマートフォンで、縦画面・タップ操作・端が切れていないか(**これは まだ一度も実機で見ていない**)
- この段階の検索よけ: 画面に `noindex` を入れてある(`src/app/layout.tsx`)

## 第2段階(ログインを有効に)

Spraと鹿。の規約・プライバシーポリシー(下書き。【要入力】が残っている)を Owner が確認してから。

1. `.env.production`: `DEER_LOGIN_ENABLED=true`・`DEER_LOGIN=on` → `scripts/deploy.sh --no-pull`(`DEER_LOGIN` はビルドに埋め込まれる)
2. CORS: `curl -i -X OPTIONS https://api.go.spra.jp/api/deer/stats -H 'Origin: https://deer.spra.jp' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: authorization,x-spra-app'` が `Access-Control-Allow-Origin: https://deer.spra.jp`
3. ログイン → だれが あそぶ？ → 3面目以降 → ランキング → Owner ダッシュボードに遊ばれ方
4. ログインなしでは、各ワールド2面目まで。**ただし `progress.ts` の `UNLOCK_ALL = true`(開発中は全部の面が開く)が、公開前に false になっていること**

## 正式に公開する前(Spraと鹿。側の残り)

- `UNLOCK_ALL` を false に(いまは true。第1段階は、全部の面を試せるよう true のまま)
- `src/app/layout.tsx` の `robots: noindex` を外す
- 規約・プライバシーポリシーの【要入力】(お問い合わせ先など)
- Next.js 16.4.2 に既知の脆弱性があると開発画面が表示した(更新の判断)
- 衣装の絵の差し替え・本番で見つかった修正
