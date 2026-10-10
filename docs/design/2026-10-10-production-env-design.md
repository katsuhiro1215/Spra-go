# 本番環境の設計（友人・知人への限定公開）

2026-10-10 / 設計: CEO（Katsuhiro）/ 状態: **承認済み・実装中**（改訂2: 既存のLightsailへの相乗りに変更）

## 1. 目的と範囲

- **目的**: 招待制・無料のPWAを、友人・知人・家族の子どもに使ってもらえる状態にする。画像（宇宙の絵・壁紙）と声は、公開のあとに足す。
- **範囲に入れる**: 置き場所、ドメインとHTTPS、メール、毎日の集計、バックアップ、初期データの入れ方、公開前のセキュリティの穴ふさぎ、お問い合わせの中央管理システムへの連携、公開の手順。
- **範囲に入れない**: 課金（Stripe本番）、一般公開向けの冗長化、スマホアプリ化。コイン購入は公開設定のスイッチをOFFのままにする。

### Ownerの決定（2026-10-10）
- AWSは**既存のものに足す**。
- `spra.jp` のDNSは**レンタルサーバー（Xserver）の管理画面**にある。ネームサーバーの移管はしない。
- お問い合わせは、**APIで中央管理システム（projects/Spra）へ送って一元管理**する。
- 穴ふさぎ（3章）から進める。

## 2. 調べて分かったこと

### 2-1. すでにある本番（相乗り先）

`projects/Spra`（中央管理システム）の `docs/ProductionDeploymentGuide.md` と `TASKS.md` による。

| 事実 | このアプリへの影響 |
|---|---|
| Lightsailのインスタンス `smartsprouts-production`（Ubuntu 24.04・**4GB**・東京・固定IP）が稼働中。80/443/22のみ開放 | **新しいサーバーは作らない。** 相乗りする。「サーバーは2GBで」という先の決定は、**既存の4GBに足すので不要になった**（かわりに空きメモリの確認が要る。7章） |
| 本体のCaddyが80/443を持ち、HTTPS（Let's Encrypt）を終端。katsuoooolは「別のComposeプロジェクト」として載り、本体のネットワーク `spra_prod` に入って、本体Caddyから転送される | **同じ流儀に合わせる**（4章）。自前のCaddyでポートを取り合わない |
| 2026-10-08に障害: 別プロジェクトのサービス名 `app` が `spra_prod` で本体の `app` と紛れ、本体のPHPが別アプリに繋がった | **サービス名・ネットワーク別名は必ず `spra-go-` 付き**にし、`app` `mysql` のような素の名前では `spra_prod` に入らない |
| DNSはXserverで管理。MXがドメイン本体を指すとA変更でメールが止まる事故があった（K26） | 足すのは `go.spra.jp` など**サブドメインのAレコードだけ**。`spra.jp` 本体のA・MXには触らない |
| 2GBだとNextやViteのビルドでOOMになる。対策は「一時的なスワップを付ける」 | このアプリのビルドも同じ手順（4-3） |
| DBバックアップ: `scripts/backup-db.sh`（mysqldump→gzip→`~/db-backups`、7日分）をcronで毎日。S3は使わない（Ownerの判断） | **同じ方式にそろえる**（6章） |
| メール送信は、Xserverのメールアカウント（SMTP）。通知メールの宛先は `MAIL_ADMIN_ADDRESS` | 同じ方式で始める（5-2） |
| **お問い合わせAPI**がある: `POST /api/contacts`（ヘッダー `X-Api-Key`、1分30回まで）、カテゴリ一覧 `GET /api/contacts/categories`。APIキーは `contact_api_clients` に登録（ハッシュで照合） | このアプリの「ご意見」をここへ送る（8章） |

### 2-2. このアプリの形

| 事実 | 構成への影響 |
|---|---|
| フロントはNext.js、APIはLaravel。別のサイトとして動き、`NEXT_PUBLIC_API_URL` のAPIをSanctumのクッキー（`credentials: include`）で呼ぶ | 本番も2つのホスト名に分ける。`NEXT_PUBLIC_*` は**ビルド時に埋まる** |
| Laravel側にも `/owner/*`・`/admin/*` があり、Next側にも `/owner`・`/admin` の画面がある | 1つのホスト名で道を振り分けると衝突する。**ホスト名で分ける** |
| キューは使っていない。メールは送信のその場で出る | ワーカー不要（Horizon・Redisは持たない） |
| 毎日の集計だけが `schedule:run` を必要とする | 本体と同じ「60秒ごとのループ」のコンテナ |
| `/up`（健康チェック）はある。画像は `frontend/public`（約24MB）。DBは約27MB | 小さく収まる。S3・CloudFrontは今は要らない |

## 3. 公開前に直す穴（✅ 2026-10-10 完了。結果は15章）

1. 🔴 `POST /owner/register`・`/admin/register` が、だれでも使えた（Ownerになれてしまう）→ ルートごと削除。Ownerは `php artisan owner:create` で作る
2. 🔴 `DatabaseSeeder` が推測できるパスワードの試験用アカウントを作る → 本番では例外で止め、`ProductionSeeder`（中身だけ）を用意
3. 🟠 国旗のSVG 297枚のうち39枚しかgitに無かった（国旗クイズ・パズルが国名.svgで参照）→ 全部gitに入れた
4. 🟠 プロキシの裏でhttpsを正しく扱う設定がなかった → `trustProxies`

## 4. 構成

### 4-1. 全体図

```
利用者のスマホ（PWA） ── HTTPS ──▶ Lightsail「smartsprouts-production」（既存・4GB）
                                     │
 本体のCaddy（80/443・Let's Encrypt。Spraのcompose）
   ├─ go.spra.jp      ──▶ spra-go-next:3000  （Next.js）
   └─ api.go.spra.jp  ──▶ spra-go-web:80     （内側のCaddy ─ fastcgi ─▶ spra-go-app:9000）
                                     │
 別のComposeプロジェクト「spra-go」（ネットワーク spra_prod に、別名つきで参加）
   ├─ spra-go-next  : Next.js（standalone）
   ├─ spra-go-web   : 内側のCaddy（Laravelの public を配り、PHP-FPMへ渡す）
   ├─ app           : Laravel（PHP-FPM）※spra_prod には参加させない。別名 spra-go-app は spra-go の内側だけ
   ├─ scheduler     : schedule:run を60秒ごと
   └─ mysql         : MySQL 8.4（このプロジェクトの内側だけ。外にもspra_prodにも出さない）
```

- 「`app` は spra_prod に入れない」という katsuooool の教訓を守る。`spra-go-next` と `spra-go-web` だけが `spra_prod` に参加する。
- ホスト名: `go.spra.jp`（画面）と `api.go.spra.jp`（API）。クッキーは `.go.spra.jp` で共有（同じサイト内なので、Safariの追跡防止にも掛からない）。公式サイト `spra.jp` のクッキーとは混ざらない。
- 本体のCaddyfileに足すブロックは、`deploy/spra-main-caddy-snippet.Caddyfile` に用意する（本体のリポジトリへの反映はOwnerの確認のあと）。
- 本体のCompose・Caddyは**止めずに**足す。反映は `caddy reload`（本体を再起動しない）。

### 4-2. メモリの予算（4GBの相乗り）

| 項目 | 上限（目安） |
|---|---|
| spra-go-next | 256MB |
| app（PHP-FPM） | 256MB（子プロセス最大5） |
| spra-go-web（Caddy） | 64MB |
| scheduler | 128MB |
| mysql | 512MB（`innodb_buffer_pool_size=192M`） |
| **合計** | **約1.2GB** |

- すでに載っているもの（本体のapp・horizon・scheduler・mysql・redis・caddy、katsuooool）の実測が不明。**実測してから決める**（7章）。足りなければ、(a) スワップ2GBを常設、(b) 8GBへ上げる（Lightsail、約$44/月）のどちらか。
- 各コンテナに `mem_limit` を付け、1つが暴れて本体を巻き込まないようにする（katsuooool方式）。

### 4-3. ビルドとデプロイ

- ビルドは**サーバー上**で行う（Mac→Linuxの別アーキテクチャのビルドは遅く壊れやすい）。ビルド中だけ**4GBのスワップを一時追加**（本体のガイドと同じ）し、`docker compose build` を1サービスずつ。Nextのビルドは `NODE_OPTIONS=--max-old-space-size=1024`。
- `scripts/deploy.sh`: `git pull` → スワップ確認 → ビルド → `migrate --force` → `optimize` → 再作成 → `/up` を確認。**失敗したら止まる**（`set -e`）。
- 手元のMacでは、本番と同じ構成を `localhost` で動かして予行演習する（`compose.prod.yaml` をそのまま使えるよう、ドメインは環境変数）。

### 4-4. 採らなかった案

| 案 | 理由 |
|---|---|
| 新しいLightsailを作る | Ownerの方針は「既存に足す」。費用も運用も増える |
| 自前のCaddyで80/443を持つ | 本体Caddyと取り合いになり、本体まで止まる |
| 1つのホスト名＋道で振り分け | `/owner` `/admin` が衝突する |
| フロントだけVercel | AWSにまとめる方針に反する |
| 本体のMySQLに同居（別データベース） | 障害・メモリ・バックアップの境界が混ざる。このアプリは自前のMySQLを持つ |

## 5. ドメイン・HTTPS・メール

### 5-1. DNS（Xserverの管理画面）

`spra.jp` のDNSレコードに、**サブドメインのAレコードを2つ足すだけ**（TTLは先に300秒にしておく）。

| 種類 | 名前 | 値 |
|---|---|---|
| A | `go.spra.jp` | 既存の固定IP |
| A | `api.go.spra.jp` | 同じ固定IP |

- `spra.jp` 本体のA・MX・TXTは**変更しない**（K26の事故を避ける）。
- HTTPSの証明書は、本体Caddyが初回アクセス時に自動で取る。DNSが回る前に取ろうとして失敗した場合は、`docker compose restart caddy`（本体ガイド9）。

### 5-2. メール（登録の確認・パスワードの再設定）

- **まずは本体と同じ、Xserverのメールアカウント（SMTP）で始める。** 新しい申請（SESの本番アクセス）が要らず、すぐ動く。差出人は `noreply@spra.jp`（Ownerが、Xserverでこのアドレスを作る）。
- `MAIL_SCHEME`: ポート465ならSMTPS（`smtps`）、587なら未設定（本体のチェックリストと同じ）。
- 限定公開の人数なら、Xserverの送信上限で足りる。**一般公開が近づいたら Amazon SES（東京）へ移す**（`.env` の変更だけで済む。Laravelの `smtp` のまま宛先を替える）。
- 迷惑メール扱いを避けるため、`spra.jp` のSPF・DKIMがXserver側で有効かをOwnerが確認する（Xserverの標準設定で有効なことが多い）。

## 6. 毎日の集計・バックアップ・監視

| 項目 | 内容 |
|---|---|
| 毎日の集計 | `scheduler` コンテナ（`schedule:run` を60秒ごと）。公開後すぐに `analytics:aggregate --from=earliest` を1回 |
| データのバックアップ | `scripts/backup-db.sh`（本体と同じ方式）: 毎日、`mysqldump`→gzip→`~/db-backups`。**14日分**保持（子どものデータなので本体の7日より長く）。cron: 日本時間3:30 |
| サーバーごとのバックアップ | Lightsailの**自動スナップショット**が有効かをOwnerが確認する（有効なら、ディスクごと別の場所に残る。本体のガイドにある通り、世代数を絞って費用を抑える） |
| **復元の練習** | 公開前に、ダンプから別のDBへ戻してログインまで確かめる。手順を `docs/ops/production-runbook.md` に残す |
| 死活監視 | 外の無料サービスで `https://api.go.spra.jp/up` を5分おきに見て、止まったらOwnerのメールへ |
| ログ | Laravelは `daily` で7日。コンテナのログは容量の上限を付ける |
| 費用 | 既存のインスタンスに足すので追加は0円（容量が足りれば）。AWSの予算アラートは、本体の設定（T：Cost budget）があるので、それを流用 |

## 7. 公開前に実測すること（Ownerにお願い）

インスタンスにSSHして、次の結果を見せてほしい（私は本番に入れないため）。

```bash
free -m                                   # メモリの空き・スワップ
df -h /                                   # ディスクの空き
docker stats --no-stream                  # いま動いているコンテナごとのメモリ
docker compose ls                         # 動いているComposeプロジェクト
```

- 空きメモリが約1.5GB以上あれば、そのまま載せる。足りなければスワップ常設か8GBを相談する。
- ディスクは、イメージ（Nextのビルドで数GB使う）を考え、**10GB以上の空き**がほしい。

## 8. お問い合わせの中央管理システム連携

方針（Owner）: 問い合わせは中央管理システム（Spra）へAPIで送り、一元管理する。

### 8-1. Spra側のAPI（既存）

- `POST {SPRAのURL}/api/contacts`、ヘッダー `X-Api-Key: <キー>`、1分に30回まで
- 本文: `name`・`email`・`contact_category_id`・`subject`・`message`（必須）／`phone`・`company`・`page_url`・`visitor_ip`・`visitor_user_agent`（任意）
- 応答: `{success:true, contact_id}`。失敗は 401/403（キー）・422（入力）・500
- カテゴリは `GET /api/contacts/categories` で取る。「Spra Go」用のカテゴリを、Spra側の管理画面で作る

### 8-2. このアプリの側（実装）

- 対象は保護者の**「ご意見」**（`feedbacks`）。問題の「へん？」報告は、問題の品質の記録なので、**これまでどおりこのアプリのOwner管理画面だけ**で見る（問い合わせではない）。
- 保存してから送る（**アプリのDBにも残す**）。`feedbacks` に `relayed_at`・`relay_attempts` を足し、送れたら `relayed_at` を入れる。
- 送れなかったとき（Spraが止まっている・キー違い）は、**あとで再送**する。`schedule` で10分ごとに `feedbacks:relay`（未送信を最大20件、5回まで）。ご意見を送る操作は、中央がつながらなくても成功にする。
- 送る内容: `name`＝保護者の名前、`email`＝保護者のメール、`subject`＝「[Spra Go] ご意見（種類）」、`message`＝本文＋ 参照用の文（アカウントの番号。**子どもの名前・成績は送らない**）、`page_url`＝画面のURL。
- 設定（`.env`）: `SPRA_CONTACT_API_URL`・`SPRA_CONTACT_API_KEY`・`SPRA_CONTACT_CATEGORY_ID`。**どれかが空なら送らない**（開発では送らず、今までどおり）。
- プライバシーポリシーに「ご意見の内容は運営者の問い合わせ管理システムに転送して保管します」と書く（法務の下書きを更新）。

## 9. 本番の環境変数（主なもの）

| 変数 | 本番の値 |
|---|---|
| `APP_ENV` / `APP_DEBUG` | `production` / `false` |
| `APP_URL` | `https://api.go.spra.jp` |
| `FRONTEND_URL` | `https://go.spra.jp`（CORS） |
| `SANCTUM_STATEFUL_DOMAINS` | `go.spra.jp` |
| `SESSION_DOMAIN` / `SESSION_SECURE_COOKIE` | `.go.spra.jp` / `true` |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL` | `https://api.go.spra.jp` / `https://go.spra.jp`（**ビルド時**） |
| `DB_*` | `mysql`（コンテナ名）。ポートは外に出さない |
| `MAIL_*` | Xserverのメール（5-2）。`MAIL_FROM_ADDRESS=noreply@spra.jp` |
| `SPRA_CONTACT_*` | 8-2 |
| `STRIPE_*` | 空（購入のスイッチはOFF） |
| `QUEUE_CONNECTION` / `CACHE_STORE` / `SESSION_DRIVER` | `database`（今のまま） |

秘密の値は `.env.production` としてサーバーにだけ置く（`.gitignore`済み）。権限は `600`。コンテナには `env_file` で渡す。**`.env` を変えたら、コンテナを作り直す**（`up -d --force-recreate`。再起動では反映されない: 本体ガイドの注意）。

## 10. 守りの最低ライン

- MySQL・phpMyAdmin・Mailpit は本番に入れない。MySQLは `spra-go` プロジェクトの内側だけ。
- ファイアウォール（80・443・22）は既存のまま。SSHは鍵だけ。
- Ownerの作成経路を閉じた（3章）。Ownerのログインは、失敗の回数制限がある（確認済み）。
- 招待コード・登録の回数制限は実装済み。

## 11. 初期データの入れ方（本番の初回）

試験用アカウントを入れないため、`db:seed` は使わない。

1. `migrate --force`
2. `db:seed --class=ProductionSeeder`（中身だけ）
3. インポート: `content:import` → `english:import` → `space:import` → `course:build`（順は手順書で確定）
4. `world:repair`
5. `owner:create`（パスワードは対話で入力）
6. Owner管理画面の「公開設定」で**招待コード**を入れる。コイン購入は**OFFのまま**
7. `analytics:aggregate --from=earliest`
8. 動作確認

## 12. 公開までの流れ

| 段階 | 内容 | だれが |
|---|---|---|
| 1 | ✅ 穴ふさぎ（3章） | CEO |
| 2 | 本番用のDockerfile・compose・内側のCaddy・デプロイ/バックアップのスクリプト・手順書、お問い合わせの連携（8章） | CEO |
| 3 | 手元のMacで、本番と同じ構成を動かして予行演習 | CEO |
| 4 | 実測（7章）。Xserverで `noreply@spra.jp` を作る。DNSにAレコード2つ。Spraで「Spra Go」カテゴリとAPIキーを作る | Owner（手順は私が書く） |
| 5 | 本体のCaddyfileにブロックを足す → `caddy reload` | Owner＋CEO |
| 6 | サーバーへデプロイ、初期データ、Ownerの作成、**復元の練習** | CEO（SSHはOwner） |
| 7 | 実機で確認 → 招待コードを入れる → 3〜5人に招待 | Owner＋CEO |
| 8 | 画像・声・問題を、公開のあとに足す（13章） | |

## 13. 公開のあとに足すもの（本番での更新）

- **問題を足す**: 原稿のCSVをリポジトリへ → 本番で `git pull` → `…:import`（重複せず上書き）。画面の再ビルドは要らない。
- **画像を足す**（宇宙の絵・壁紙）: `frontend/public` に置いてコミット → デプロイ（Nextの再ビルド、数分）→ `space:import` → ミニゲームの公開日を入れる。
- **声**: `frontend/public/sounds` に置いて同じ流れ。重くなったらそのときS3＋CloudFrontへ。
- **デプロイ**: `scripts/deploy.sh` を1つのコマンドで。

## 14. Ownerに決めてほしいこと（残り）

1. **サーバー**: 既存4GBに相乗りでよいか。実測（7章）の結果で、スワップ常設／8GBを決める
2. **メール**: まずXserverのメール（`noreply@spra.jp`）で始めてよいか（SESは一般公開の前に）
3. **Spra Goの「ご意見」を中央へ送る**（8章）。「へん？報告」は送らず、このアプリに残す、でよいか
4. **SpraのURL**（APIの宛先）と、Spra側で「Spra Go」カテゴリとAPIキーを作ってもらうこと
5. **バックアップ**: 14日分のダンプ＋Lightsailの自動スナップショット（S3は使わない）でよいか

## 15. 穴ふさぎの結果（3章）

| 項目 | 結果 |
|---|---|
| Owner/Adminの自己登録 | ルートと担当クラスを削除（404）。Ownerは `php artisan owner:create {email}`（メール確認済み・12文字以上・対話入力） |
| 試験用アカウント | `DatabaseSeeder` は本番では例外。本番は `ProductionSeeder` |
| 国旗の画像 | 297枚すべてgitへ（3.2MB）。出どころの表記は未確認（Ownerに確認中） |
| プロキシの裏のHTTPS | `trustProxies(at: '*')`（PHP-FPMは外に公開しない構成） |
| テスト | `tests/Feature/ProductionSafetyTest.php` に8件。全体1027件が通る |

## 16. 法務の【要入力】のうち、これで埋まるもの

- サーバーとデータの保管: Amazon Web Services（AWS）、東京リージョン
- メールの送信: Xserver（のちにAmazon SES）
- 問い合わせ先: 中央管理システムの窓口（Ownerが決めるアドレス）
- ご意見の転送先: 運営者の問い合わせ管理システム（8-2）
