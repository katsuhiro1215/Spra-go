# 本番の運用手順書（Spra Go）

設計: `docs/design/2026-10-10-production-env-design.md`。この手順書は、**初回のデプロイ**と**ふだんの更新・復旧**の手順。
置き場所は、既存のLightsail「smartsprouts-production」（本体 projects/Spra と同居）。サーバーでの作業は SSH（`ubuntu`）。

## 0. 用語と場所

| もの | 場所・名前 |
|---|---|
| リポジトリ（サーバー上） | `~/Spra-go`（`gh repo clone katsuhiro1215/Spra-go`） |
| 本番の環境変数 | `~/Spra-go/.env.production`（権限 600。gitに入れない） |
| Composeプロジェクト | `spra-go`（`compose.prod.yaml`）。本体は別プロジェクト |
| 本体のネットワーク | `spra_prod`（`spra-go-next` と `spra-go-web` だけが参加する） |
| 画面 / API | `https://go.spra.jp` / `https://api.go.spra.jp` |
| バックアップ | `~/db-backups/spra-go/`（14日分） |

以降、`docker compose` は次の略記で書く。

```bash
cd ~/Spra-go
alias dc='docker compose --env-file .env.production -f compose.prod.yaml'
```

## 1. 公開の前にやること（チェックリスト）

Owner側（私が手順を出す。画面操作はOwner）:

- [ ] **実測**（設計 7章）: `free -m` / `df -h /` / `docker stats --no-stream` / `docker compose ls` の結果を私に見せる
- [ ] Lightsailの**自動スナップショット**が有効か確認する（無ければ有効にする。世代は7）
- [ ] **Xserver**で、メールアカウント `noreply@spra.jp` を作る（パスワードは自分で控える。チャットに貼らない）
- [ ] Xserverのメールで、`spra.jp` のSPF・DKIMが有効か確認する
- [ ] **DNS**（Xserverの管理画面）: TTLを300秒にしてから、Aレコードを2つ足す → `go.spra.jp`・`api.go.spra.jp` ＝ 既存の固定IP。**`spra.jp` 本体のA・MX・TXTは触らない**
- [ ] **Spra（中央管理システム）**で、お問い合わせのカテゴリ「Spra Go」を作り、**APIキー**（連携先: Spra Go）を発行する。カテゴリ番号とキーを控える
- [ ] 法務の【要入力】（`docs/legal/README.md` 3章）を埋める
- [ ] 国旗画像の出どころ（ライセンス）を確認する

CEO側（済・実施済みの確認）:

- [x] 穴ふさぎ（Owner/Adminの自己登録の削除・本番シーダー・国旗のgit管理・プロキシ）
- [x] 本番用のDockerfile・compose・スクリプト・お問い合わせの連携
- [x] 手元のMacでの予行演習（イメージのビルド・マイグレーション・初期データ）

## 2. 初回のデプロイ

### 2-1. サーバーの準備

```bash
ssh ubuntu@<固定IP>
gh repo clone katsuhiro1215/Spra-go ~/Spra-go      # 本体と同じ方法(ghで認証済み)
cd ~/Spra-go
git checkout main
```

### 2-2. 環境変数

```bash
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

- `APP_KEY`: `docker run --rm php:8.5-cli-alpine php -r 'echo "base64:".base64_encode(random_bytes(32)).PHP_EOL;'`
- `DB_PASSWORD`: `openssl rand -base64 24`（チャットやコミットに残さない）
- `MAIL_HOST`（Xserverのメールサーバー）・`MAIL_PORT`/`MAIL_SCHEME`（465なら `smtps`、587なら空）・`MAIL_PASSWORD`
- `SPRA_CONTACT_API_URL`（`https://<Spraのドメイン>/api/contacts`）・`SPRA_CONTACT_API_KEY`・`SPRA_CONTACT_CATEGORY_ID`
- `STRIPE_*` は空のまま

### 2-3. ビルド用のスワップ（初回と、Nextを作り直すとき）

メモリの空きが少ないとき、ビルド中だけスワップを足す（本体のガイドと同じ）。

```bash
free -m
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
# ビルドが終わったら外してもよい:  sudo swapoff /swapfile && sudo rm /swapfile
```

### 2-4. ビルドと起動

```bash
scripts/deploy.sh --no-pull
```

初回は、`/up` の確認が **NG になる**（本体のCaddyにまだ `go.spra.jp` を足していないため）。次に進む。

### 2-5. 本体のCaddyにドメインを足す

1. `deploy/spra-main-caddy-snippet.Caddyfile` の2ブロックを、**本体（`~/Spra`）の `Caddyfile` の末尾**に足す
2. 本体の caddy だけを作り直す（数秒の切り替わり。**深夜に**）:

```bash
cd ~/Spra
docker compose -f compose.prod.yaml build caddy
docker compose -f compose.prod.yaml up -d caddy
docker compose -f compose.prod.yaml logs --tail=30 caddy     # 証明書の取得(go.spra.jp / api.go.spra.jp)を確認
```

- DNSが回る前に証明書を取ろうとして失敗したら、DNSの反映を確認して `docker compose -f compose.prod.yaml restart caddy`
- 本体のサイトが映ることを、先に確認する（影響がないこと）

### 2-6. 中身を入れる

```bash
cd ~/Spra-go
dc exec app php artisan production:bootstrap
```

- 国のクイズ・英語・宇宙（絵が届くまで、絵の無い問題は外れる）・地名・コースの並べ直し・町の整合を、決まった順に入れる。何度流しても同じ。
- 試験用のアカウントは作られない。

### 2-7. Ownerを作る・公開設定

```bash
dc exec app php artisan owner:create <Ownerのメール> --name=<名前>      # パスワードは対話で入力(12文字以上)
dc exec app php artisan analytics:aggregate --from=earliest
```

- 画面で `https://go.spra.jp/owner/login` からログイン → 「公開設定」で、**招待コードを入れる**（空だと誰でも登録できる）。**コイン購入はOFFのまま**。
- メールの確認リンクが `https://api.go.spra.jp/...` で届くことを、自分のアドレスで登録して確かめる（登録の確認・パスワードの再設定）。

### 2-8. バックアップのcronと、復元の練習

```bash
mkdir -p ~/db-backups/spra-go
crontab -e
# 日本時間 3:30（サーバーがUTCなら 18:30）
30 18 * * * /home/ubuntu/Spra-go/scripts/backup-db.sh >> /home/ubuntu/db-backups/spra-go/backup.log 2>&1
```

```bash
scripts/backup-db.sh                                              # まず1回、手で実行する
scripts/restore-db.sh ~/db-backups/spra-go/spra-go-db-XXXX.sql.gz  # 別のDB(spra_go_restore_check)に戻す
```

- 表示された `tables_count` と `users`（Ownerだけなら利用者は0）を見て、戻せたことを確かめる。**この練習は、公開の前に必ず1回行う。**
- 確認したら、練習用のDBを消す: `dc exec spra-go-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE spra_go_restore_check"'`

### 2-9. 外からの死活監視

外の無料サービス（UptimeRobotなど）で、`https://api.go.spra.jp/up` を5分おきに見て、止まったらOwnerのメールへ。

## 3. 動作確認（公開の前）

- [ ] `https://go.spra.jp` が開き、ホーム画面に追加できる（iPhone・Android）
- [ ] 招待コードで登録 → 確認メールが届く → リンクで確認できる
- [ ] パスワードの再設定メールが届く
- [ ] プロフィールを作って、クイズが1ステージ遊べる／町が出る／国旗の画像が出る
- [ ] 国旗パズル・スプルキャッチなど、ミニゲームが動く
- [ ] Owner管理画面（`/owner/login`）にログインでき、分析が表示される
- [ ] 「ご意見」を送ると、Spra（中央管理システム）に問い合わせが届く
- [ ] `https://api.go.spra.jp/owner/register` が **404**（自己登録できない）
- [ ] 本体 `projects/Spra` のサイトが、これまでどおり動く
- [ ] `docker stats --no-stream` で、本体を含めてメモリに余裕がある

## 4. ふだんの更新

### 4-1. コードを更新する

```bash
cd ~/Spra-go && scripts/deploy.sh
```

- `git pull` → ビルド（1つずつ）→ `migrate --force` → 再作成 → `/up` を確認。失敗したらそこで止まる。
- 画面だけの変更でも、Nextの再ビルドが走る（数分）。ビルドのメモリが足りなければ 2-3 のスワップを足す。

### 4-2. 問題を足す

```bash
cd ~/Spra-go && git pull --ff-only
dc exec app php artisan english:import          # 英語のCSVを足したとき
dc exec app php artisan space:import            # 宇宙の原稿・絵を足したとき（絵は frontend/public に置いてデプロイ済みであること）
dc exec app php artisan course:build
```

- 取り込みは何度流しても同じ（重複しない）。コードの変更がなければ、画面の再ビルドは要らない（ただし、イメージにCSVを焼き込んでいるので `scripts/deploy.sh` でイメージを作り直す）。
- 友人が遊んでいる最中に足すと、そのときの出題が変わる。記録は壊れない。

### 4-3. `.env.production` を変えたとき

```bash
dc up -d --force-recreate app scheduler spra-go-web spra-go-next
```

（`restart` では反映されない。`NEXT_PUBLIC_*` を変えたときは、Nextの再ビルドが要る → `scripts/deploy.sh --no-pull`）

## 5. 障害のとき

| 症状 | 見るところ | 対処 |
|---|---|---|
| 画面が開かない（502） | `dc ps` / `dc logs spra-go-next --tail=50` | `dc up -d spra-go-next`。メモリ不足なら `docker stats` |
| APIが502 | `dc logs app --tail=50`、`dc logs spra-go-web --tail=50` | `dc up -d --force-recreate app spra-go-web` |
| ログインできない／クッキーが付かない | `.env.production` の `SESSION_DOMAIN`（`.go.spra.jp`）・`SANCTUM_STATEFUL_DOMAINS`・`SESSION_SECURE_COOKIE` | 直して 4-3 |
| メールが届かない | `dc logs app` のメール送信のエラー、Xserverのメール設定 | `MAIL_*` を直して 4-3。迷惑メールの確認 |
| 毎日の集計が動かない | `dc logs scheduler --tail=20` | `dc up -d --force-recreate scheduler` |
| 本体のサイトが壊れた | 本体の Caddy（`~/Spra`）のログ | 本体の Caddyfile の足したブロックを確認。**spra-go が原因なら、spra-go を止める**: `dc down`（本体は影響を受けない） |
| ディスクがいっぱい | `df -h /` / `docker system df` | `docker image prune -f`（古いイメージ）、`~/db-backups` の古いものを確認 |
| データを壊した・消した | バックアップ | `scripts/restore-db.sh <ファイル> spra_go_restore_check` で中身を確かめてから、**本番へ戻すときだけ**第2引数に本番のDB名（`yes` と入力）。戻す前に、アプリを止めておく（`dc stop app scheduler`） |

### ロールバック（1つ前のコードに戻す）

```bash
cd ~/Spra-go
git log --oneline -5
git checkout <1つ前のコミット>
scripts/deploy.sh --no-pull
```

- マイグレーションは、後ろ向きに戻さない（データを守るため）。新しい列を足しただけなら、そのまま古いコードでも動く。

## 6. セキュリティの覚え書き

- `.env.production` は権限 600。チャット・コミット・ログに貼らない。
- MySQLは `spra-go` の内側だけ（ポートを開けない）。phpMyAdmin・Mailpitは本番に無い。
- `app` / `mysql` を `spra_prod` に参加させない（本体と名前が紛れる。2026-10-08 の障害）。
- Ownerの追加は `php artisan owner:create` だけ（HTTPの登録は無い）。
- 招待コードは、友人に渡す前に必ず設定する。
