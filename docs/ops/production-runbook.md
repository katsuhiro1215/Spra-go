# 本番の運用手順書（Spra Go）

設計: `docs/design/2026-10-10-production-env-design.md`。この手順書は、**初回のデプロイ**と**ふだんの更新・復旧**の手順。
置き場所は、**Spra 専用の Lightsail インスタンス**（Ubuntu 24.04・2GB・東京・固定IP。将来 Tane・spra-world も同じインスタンスに載せる）。サーバーでの作業は SSH（`ubuntu`）。

## 0. 用語と場所

| もの | 場所・名前 |
|---|---|
| リポジトリ（サーバー上） | `~/Spra-go`（`gh repo clone katsuhiro1215/Spra-go`） |
| 本番の環境変数 | `~/Spra-go/.env.production`（権限 600。gitに入れない） |
| Composeプロジェクト | `spra-go-prod`（`compose.prod.yaml`）。サービス: caddy・app・next・scheduler・mysql |
| 画面 / API | `https://go.spra.jp` / `https://api.go.spra.jp` |
| バックアップ | `~/db-backups/spra-go/`（14日分） |

以降、`docker compose` は次の略記で書く。

```bash
cd ~/Spra-go
alias dc='docker compose --env-file .env.production -f compose.prod.yaml'
```

## 1. 公開の前にやること（チェックリスト）

Owner側（私が手順を出す。画面操作はOwner）:

- [ ] **Lightsail で専用インスタンスを作る**: Ubuntu 24.04 LTS（OSのみ）・**2GB**・東京（ap-northeast-1）。名前は `spra-production`。固定IPを作ってアタッチ。ファイアウォールは 80・443（Any IPv4）と 22 だけ（3306は開けない）。SSHの鍵はダウンロードして保管
- [ ] 作ったら、**自動スナップショット**を有効にする（世代は7）。AWSの予算アラートに、このインスタンスの分を足す
- [ ] **Xserver**で、メールアカウント `info@spra.jp` を作る（パスワードは自分で控える。チャットに貼らない）
- [ ] Xserverのメールで、`spra.jp` のSPF・DKIMが有効か確認する
- [ ] **DNS**（Xserverの管理画面）: TTLを300秒にしてから、Aレコードを2つ足す → `go.spra.jp`・`api.go.spra.jp` ＝ **新しい固定IP**。**`spra.jp` 本体のA・MX・TXTは触らない**
- [ ] **Spra（中央管理システム）**で、お問い合わせのカテゴリ「Spra Go」を作り、**APIキー**（連携先: Spra Go）を発行する。カテゴリ番号とキーを控える
- [ ] **Googleでのログイン・登録**（任意。設定しなければボタンは出ない。設計 `docs/design/2026-10-12-google-auth-design.md` 6章）: Google Cloud Console でプロジェクト→OAuth同意画面（アプリ名 Spra Go・サポートメール `info@spra.jp`・プライバシーポリシーと利用規約のURL）→OAuthクライアントID（ウェブ）。承認済みのリダイレクトURIは `https://api.go.spra.jp/auth/google/callback`。クライアントIDとシークレットを控える。同意画面の公開状態が「テスト」のあいだは、**テストユーザー（100人まで）に友人のGmailを足す**
- [ ] 法務の【要入力】（`docs/legal/README.md` 3章）を埋める
- [ ] 国旗画像の出どころ（ライセンス）を確認する

CEO側（済・実施済みの確認）:

- [x] 穴ふさぎ（Owner/Adminの自己登録の削除・本番シーダー・国旗のgit管理・プロキシ）
- [x] 本番用のDockerfile・compose・スクリプト・お問い合わせの連携
- [x] 手元のMacでの予行演習（イメージのビルド・マイグレーション・初期データ）

## 2. 初回のデプロイ

### 2-0. サーバーの準備（初回だけ）

```bash
sudo apt-get update && sudo apt-get -y upgrade
# Docker 公式リポジトリから docker-ce と compose プラグインを入れる（https://docs.docker.com/engine/install/ubuntu/）
sudo usermod -aG docker ubuntu && newgrp docker
sudo apt-get -y install git unattended-upgrades
# GitHub CLI(gh) を入れて gh auth login
```

### 2-1. リポジトリ

```bash
ssh ubuntu@<固定IP>
gh repo clone katsuhiro1215/Spra-go ~/Spra-go      # リポジトリが private なので gh で認証する。事前に Docker・git・gh を入れる(2-0)
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
- `GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET`（Googleでのログインを使うとき。空なら使わない）
- `STRIPE_*` は空のまま

### 2-3. ビルド用のスワップ（初回と、Nextを作り直すとき）

メモリの空きが少ないとき、ビルド中だけスワップを足す（2GBなので、初回は必ず足す）。

```bash
free -m
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
# ビルドが終わったら外してもよい:  sudo swapoff /swapfile && sudo rm /swapfile
```

### 2-4. ビルドと起動

```bash
scripts/deploy.sh --no-pull
```

初回は、DNSが回っていないと `/up` の確認が **NG になる**。次の 2-5 でDNSとHTTPSを確かめる。

### 2-5. DNS と HTTPS

1. DNS（Xserver）で、`go.spra.jp` と `api.go.spra.jp` の A レコードを、新しい固定IPに向ける（反映を待つ。TTL 300秒）
2. Caddy が初回アクセスのときに、Let's Encrypt の証明書を自動で取る。うまく取れなければ（DNSが回る前に試した場合）: `dc restart caddy` → `dc logs caddy --tail=30`
3. `https://api.go.spra.jp/up` が 200 になれば、2-4 の確認も OK

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
- 確認したら、練習用のDBを消す: `dc exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE spra_go_restore_check"'`

### 2-9. 外からの死活監視

外の無料サービス（UptimeRobotなど）で、`https://api.go.spra.jp/up` を5分おきに見て、止まったらOwnerのメールへ。

## 3. 動作確認（公開の前）

- [ ] `https://go.spra.jp` が開き、ホーム画面に追加できる（iPhone・Android）
- [ ] 招待コードで登録 → 確認メールが届く → リンクで確認できる
- [ ] （Googleを設定したとき）登録画面で招待コードを入れて「Googleで続ける」→ 登録できる／ログイン画面で、同じGoogleで入れる／招待コードなしの初めての人は、`/register?google=need_code` の案内が出る
- [ ] パスワードの再設定メールが届く
- [ ] プロフィールを作って、クイズが1ステージ遊べる／町が出る／国旗の画像が出る
- [ ] 国旗パズル・スプルキャッチなど、ミニゲームが動く
- [ ] Owner管理画面（`/owner/login`）にログインでき、分析が表示される
- [ ] 「ご意見」を送ると、Spra（中央管理システム）に問い合わせが届く
- [ ] `https://api.go.spra.jp/owner/register` が **404**（自己登録できない）
- [ ] `free -m` / `docker stats --no-stream` で、メモリに余裕がある（足りなければスワップを常設、または4GBへ）

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
dc up -d --force-recreate app scheduler caddy next
```

（`restart` では反映されない。`NEXT_PUBLIC_*` を変えたときは、Nextの再ビルドが要る → `scripts/deploy.sh --no-pull`）

## 5. 障害のとき

| 症状 | 見るところ | 対処 |
|---|---|---|
| 画面が開かない（502） | `dc ps` / `dc logs next --tail=50` | `dc up -d next`。メモリ不足なら `docker stats` |
| APIが502 | `dc logs app --tail=50`、`dc logs caddy --tail=50` | `dc up -d --force-recreate app caddy` |
| ログインできない／クッキーが付かない | `.env.production` の `SESSION_DOMAIN`（`.go.spra.jp`）・`SANCTUM_STATEFUL_DOMAINS`・`SESSION_SECURE_COOKIE` | 直して 4-3 |
| メールが届かない | `dc logs app` のメール送信のエラー、Xserverのメール設定 | `MAIL_*` を直して 4-3。迷惑メールの確認 |
| 毎日の集計が動かない | `dc logs scheduler --tail=20` | `dc up -d --force-recreate scheduler` |
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
- ポートを開けているのは caddy の 80/443 だけ。app・next・mysql は外に出さない。
- Ownerの追加は `php artisan owner:create` だけ（HTTPの登録は無い）。
- 招待コードは、友人に渡す前に必ず設定する。
