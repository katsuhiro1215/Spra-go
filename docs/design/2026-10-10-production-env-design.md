# 本番環境の設計（友人・知人への限定公開）

2026-10-10 / 設計: CEO（Katsuhiro）/ 状態: **承認済み・実装中**

**Ownerの回答（2026-10-10）**
- サーバーは**最初は2GB（約$12/月）**。足りなくなったら4GBへ上げる（Lightsailは同じ手順でサイズを上げられる）。
- `spra.jp` のDNSは**レンタルサーバーで管理**している。Aレコードなどを足せる前提で進める（5章）。
- お問い合わせは、**APIで中央管理システムに送る**（他のサービスも同じ仕様で、問い合わせは一元管理）。このアプリの受け口は、仕様を伺ってから設計する（14章）。
- AWSは**既存のアカウントに足す**。
- **穴ふさぎ（3章）から進める**。

> 2GBは余裕が少ない。ビルドはサーバーでせず、**手元のMacでイメージを作って送る**か、スワップ（2GB）を付けて短時間で行う（4-2）。

## 1. 目的と範囲

- **目的**: 招待制・無料のPWAを、友人・知人・家族の子どもに使ってもらえる状態にする。画像（宇宙の絵・壁紙）と声は、公開のあとに足す。
- **範囲に入れる**: サーバー、ドメインとHTTPS、メール送信、毎日の集計（cron）、バックアップ、初期データの入れ方、公開前のセキュリティの穴ふさぎ、公開の手順。
- **範囲に入れない**: 課金（Stripe本番）、一般公開向けの冗長化、スマホアプリ化。コイン購入は公開設定のスイッチをOFFのままにする。
- **前提（Owner確認済み）**: アプリはAWS。`spra.jp` の公式サイトはすでに公開済みで、アプリはその下の `go.spra.jp` に置く。月数千円程度の費用は事前確認なしで使ってよい（SPEC 冒頭）。

## 2. いまのアプリの形（設計の前提）

調べて分かったことで、構成を決める材料になったもの。

| 事実 | 構成への影響 |
|---|---|
| フロントは Next.js、APIは Laravel。**別のサイトとして動き**、画面から `NEXT_PUBLIC_API_URL` のAPIを、Sanctumのクッキー（`credentials: include`）で呼ぶ | 本番も2つのホスト名に分ける。`NEXT_PUBLIC_*` は**ビルド時に埋まる**ので、ビルドは本番の値で行う |
| Laravel側にも `/owner/*`・`/admin/*` があり、Next側にも `/owner`・`/admin` の画面がある | 1つのホスト名で道を振り分けると衝突する。**ホスト名で分ける**のが安全 |
| キューは使っていない（`ShouldQueue`・`dispatch` なし）。メールは送信のその場で出る | キューのワーカーは要らない |
| 毎日の集計だけが `schedule:run` を必要とする | cron（またはスケジューラのコンテナ）が1つ要る |
| `/up`（健康チェック）はもうある | 外からの死活監視に使える |
| 画像は `frontend/public`（約24MB）でNextが配る | S3・CloudFrontは今は要らない |
| DBは約27MB（開発の実データ） | 小さいサーバーで足りる |

## 3. 公開前に必ず直すこと（調査で見つかった穴）

構成の前に、これを先に書く。**1と2は、直さないと公開できない。**

1. 🔴 **`POST /owner/register` と `POST /admin/register` が、だれでも使える**（`routes/owner.php`・`routes/admin.php`、`guest` だけで制限なし）。本番でだれかが叩くと、**Ownerになれて**、全利用者の分析・ご意見・公開設定・CSVに入れてしまう。画面（Next）はこの登録を使っていないので、**ルートごと外す**（Ownerの作成は、サーバー上で `php artisan owner:create` のようなコマンドで行う）。
2. 🔴 **`DatabaseSeeder` を本番で流してはいけない**。`UserSeeder`・`AdminSeeder`・`OwnerSeeder` が、`owner@example.com` などの試験用アカウントを、**推測できるパスワード**で作る。本番の初期データは、中身のシーダーとインポートだけを順に流す専用の手順にする（7章）。
3. 🟠 **国旗の画像297枚のうち、gitに入っているのは39枚だけ**（`frontend/public/flag/*` は原則追跡しない決まり）。国旗クイズ・国旗パズルは `/flag/Afghanistan.svg` のような名前を使うため、**gitから本番へ入れると、ほとんどの国旗が出ない**。全部をgitに入れる（3.2MB。出どころの表記を `CREDITS.md` に確認）。
4. 🟠 **リバースプロキシの裏でHTTPSを正しく扱う設定がない**（`bootstrap/app.php` に `trustProxies` なし）。このままだと、メールの確認リンクが `http://` で作られる。`trustProxies` を足す。
5. 🟡 `config/cors.php`・`config/sanctum.php` は環境変数で切り替えられる作りなので、本番の値を入れれば足りる（8章）。

## 4. 構成（決めたいこと①）

### 4-1. 全体図

```
利用者のスマホ（PWA）
   │ HTTPS
   ▼
Lightsail 1台（東京リージョン・固定IP）
 ├─ Caddy ──────── 自動でHTTPSの証明書（Let's Encrypt）を取り、更新する
 │    ├─ go.spra.jp       → web（Next.js）
 │    └─ api.go.spra.jp   → app（Laravel / PHP-FPM）
 ├─ web   : Next.js（standalone出力）
 ├─ app   : Laravel（PHP-FPM）
 ├─ scheduler : php artisan schedule:work（毎日の集計）
 └─ mysql : MySQL 8.4（外には公開しない）
        │ 毎晩ダンプ
        ▼
   S3（非公開・暗号化・30日で消す） ＋ Lightsailの自動スナップショット

メール: Amazon SES（東京）→ 登録の確認・パスワードの再設定
```

- **1台に全部入れる**。友人への限定公開は、同時に遊ぶ人が数人〜数十人で、これで十分。
- **ホスト名を2つに分ける**: `go.spra.jp`（画面）と `api.go.spra.jp`（API）。クッキーは `.go.spra.jp` で共有する（同じサイト内なので、Safariの追跡防止にも引っかからない）。公式サイト `spra.jp` のクッキーとは混ざらない。
- **Caddyを選ぶ理由**: HTTPSの証明書を自動で取って更新してくれる（設定が10行ほど）。nginx＋certbotより壊れにくい。

### 4-2. サーバーの大きさ

| 案 | 月額の目安 | 向き不向き |
|---|---|---|
| **A. 2GB（2vCPU・60GB）【Owner決定】** | **約 $12（約1,900円）** | Next・PHP・MySQLを同居させると余裕が少ない。**ビルドは手元で行い、サーバーには完成したイメージを送る**。スワップ2GBを付け、MySQLのメモリ設定を絞る |
| B. 4GB（2vCPU・80GB） | 約 $24（約3,700円） | 余裕がある。2GBで足りなくなった時（メモリ・待ち時間の増加）に上げる |

料金は[公式の料金表](https://aws.amazon.com/lightsail/pricing)で、契約のときに確かめる。**ほかにかかるもの**は、スナップショット（数十円〜百数十円）、S3（ほぼ無料）、SES（1,000通で約15円）で、**合計は月 約2,500〜3,500円**の見込み（2GBの場合）。

### 4-3. データベース

- **公開の初期は、サーバー内のMySQL**（コンテナ）にする。Lightsailの管理型DB（月 約$15〜）は、一般公開が近づいたときに移す。
- 代わりに、**バックアップを必ず用意**する（6章）。「戻せる」ことを、公開前に一度やって確かめる。

### 4-4. 採らなかった案

| 案 | 理由 |
|---|---|
| フロントだけ Vercel | 構成が2か所に分かれ、費用と確認先が増える。Owner方針の「AWSにまとめる」に反する |
| ECS/Fargate・EKS | 友人公開には過剰で、費用も運用も重い |
| Lightsailのコンテナサービス | ディスクが保持されず、MySQL同居に向かない |
| 1つのホスト名＋道で振り分け | `/owner` `/admin` が衝突する |

## 5. ドメイン・HTTPS・メール（決めたいこと②）

### 5-1. DNS

- `spra.jp` の公式サイトはすでに公開済み。**ネームサーバーを移す必要はない**（TASKSにある「ネームサーバーの移管」は不要になる）。`spra.jp` のDNSを管理している画面で、次のレコードを足すだけ。

| 種類 | 名前 | 値 |
|---|---|---|
| A | `go.spra.jp` | Lightsailの固定IP |
| A | `api.go.spra.jp` | 同じ固定IP |
| CNAME×3 | `xxxx._domainkey.go.spra.jp` | SESが表示する値（DKIM） |
| TXT | `_dmarc.go.spra.jp` | `v=DMARC1; p=none; rua=mailto:（問い合わせ用アドレス）` |

- DNSは**レンタルサーバーの管理画面**にある（Owner回答）。そこでAレコード・CNAME・TXTを足す。手順書には、その画面で足す値を一覧にして渡す。

### 5-2. メール

- **Amazon SES（東京）**を使う。公式サイトのメールとは**混ぜず**、`go.spra.jp` を送信ドメインとして登録する。差出人は `noreply@go.spra.jp`、返信先は問い合わせ用のアドレス。
- 初期は**サンドボックス**（確認済みのアドレスにしか送れない）。**本番アクセスの申請**（無料・通常1日ほど）が要る。申請の文面（用途・宛先の集め方・解除の扱い）は私が用意する。申請が間に合わないときは、友人のアドレスを1つずつ確認して先に進める。
- Laravelは**SMTP**でSESへつなぐ（新しいパッケージは入れない）。`MAIL_HOST=email-smtp.ap-northeast-1.amazonaws.com`、専用のSMTP認証情報。
- 返ってきた宛先（バウンス・苦情）の自動処理は、限定公開では作らない。SESの管理画面で見る。

## 6. 毎日の集計・バックアップ・監視

| 項目 | 内容 |
|---|---|
| 毎日の集計 | `scheduler` コンテナで `php artisan schedule:work`（落ちたら自動で再起動）。公開後すぐに `analytics:aggregate --from=earliest` を1回 |
| データのバックアップ | 毎晩（日本時間 3:30）`mysqldump` → 圧縮 → S3（非公開・暗号化・30日で自動削除）。アップ専用のIAMユーザー（`PutObject` だけ） |
| サーバーのバックアップ | Lightsailの**自動スナップショット**（毎日・7世代） |
| **復元の練習** | 公開前に、ダンプから別のDBへ戻して、ログインできることまで確かめる。手順は `docs/ops/` に残す |
| 死活監視 | 外の無料サービスで `https://api.go.spra.jp/up` を5分おきに見て、止まったらOwnerのメールへ。Lightsailのアラーム（CPU・状態）も1つ |
| ログ | Laravelのログは日ごとに7日で回す。コンテナのログは容量の上限を付ける（ディスクを食いつぶさない） |
| 費用の見張り | AWSの請求アラート（月 $40 を超えたらメール）を、公開前に設定する |

## 7. 初期データの入れ方（本番の初回）

試験用アカウントを入れないため、`db:seed`（全部入り）は使わず、**中身だけ**を決まった順に流す。`php artisan production:bootstrap` のような1つのコマンドか、手順書にまとめる。

1. `migrate --force`
2. 中身のシーダー: Category・Language・Country・Event・ContentItem・QuestionTheme・Quiz・Question・QuestionChoice・Stage・WorldItem・FlagQuiz・PrefectureQuiz（`UserSeeder`・`AdminSeeder`・`OwnerSeeder`・`UserSchemaSeeder`・`UserProfileSeeder` は**入れない**）
3. インポート: `content:import` → `english:import` → `space:import` → `course:build`（順は開発の実績に合わせて確定）
4. `world:repair`（町のデータの整合）
5. Ownerの作成: `php artisan owner:create`（パスワードは画面に出さず、対話で入力）
6. 公開設定: Owner管理画面で**招待コードを入れる**（空だと誰でも登録できる）。コイン購入は**OFFのまま**
7. 動作確認（9章）

> 開発のDBをそのまま移す案は採らない（試験用の子ども・テストデータが混じる）。

## 8. 本番の環境変数（主なもの）

| 変数 | 本番の値 |
|---|---|
| `APP_ENV` / `APP_DEBUG` | `production` / `false` |
| `APP_URL` | `https://api.go.spra.jp` |
| `FRONTEND_URL` | `https://go.spra.jp`（CORS） |
| `SANCTUM_STATEFUL_DOMAINS` | `go.spra.jp` |
| `SESSION_DOMAIN` | `.go.spra.jp` |
| `SESSION_SECURE_COOKIE` | `true` |
| `NEXT_PUBLIC_API_URL` | `https://api.go.spra.jp`（**ビルド時**） |
| `NEXT_PUBLIC_SITE_URL` | `https://go.spra.jp`（**ビルド時**。SNSの共有画像のURL） |
| `DB_*` | コンテナ内のMySQL。ポートは外に出さない |
| `MAIL_*` | SESのSMTP。差出人 `noreply@go.spra.jp` |
| `STRIPE_*` | 空のまま（購入のスイッチはOFF） |
| `QUEUE_CONNECTION` / `CACHE_STORE` / `SESSION_DRIVER` | 今のまま `database`（友人公開の規模で足りる） |

秘密の値は `.env.production`（gitに入れない。`.gitignore` に既にある）としてサーバーにだけ置き、権限は `600`。

## 9. 守りの最低ライン

- Lightsailのファイアウォール: 80・443だけ全世界に開ける。**22（SSH）は鍵だけ、可能ならOwnerのIPだけ**。
- MySQL・phpMyAdmin・Mailpit は本番に入れない。MySQLはコンテナの内側だけ。
- 自動のセキュリティ更新（`unattended-upgrades`）を有効にする。
- Ownerの作成経路を閉じる（3章1）。Ownerのログインに失敗の回数制限があるか確認し、なければ足す。
- 招待コード・登録の回数制限は実装済み。

## 10. 公開までの流れ

| 段階 | 内容 | だれが |
|---|---|---|
| 0 | この設計を承認（費用・DNSの場所） | Owner |
| 1 | **穴ふさぎ**（3章）、本番用のDockerfile・compose・Caddy・デプロイ/バックアップのスクリプトを作る | CEO |
| 2 | **手元のMacで、本番と同じ構成を動かして**確かめる（AWSに触る前の予行演習） | CEO |
| 3 | AWSの準備: 請求アラート、Lightsail作成、固定IP、SESの登録と本番アクセス申請、S3、DNSのレコード追加 | Owner（手順は私が書く）。画面操作のログを見せてもらえば私が確認 |
| 4 | サーバーへデプロイ、初期データ、Ownerの作成、**復元の練習** | CEO（SSHは鍵をOwnerが用意） |
| 5 | 実機で確認（9章のあとの確認表）→ 招待コードを入れる | Owner＋CEO |
| 6 | 3〜5人に招待 → 感想を集める（ご意見フォーム） | Owner |
| 7 | 画像・声・問題を、公開のあとに足す | 下の11章 |

## 11. 公開のあとに足すもの（本番での更新の流れ）

- **問題を足す**: 原稿のCSVをリポジトリへ入れる → 本番で `git pull` → `…:import`（重複せず上書きされる）。画面の再ビルドは要らない（データだけの更新）。
- **画像を足す**（宇宙の絵・壁紙など）: `frontend/public` に置いてコミット → デプロイ（画面の再ビルドあり、数分）→ `space:import` → ミニゲームの公開日（`released_on`）を入れる。
- **声**: 音声ファイルを `frontend/public/sounds` に置いて同じ流れ。ファイルが増えて重くなったら、そのとき S3＋CloudFront に移す（今は要らない）。
- **デプロイ**: `deploy.sh`（メンテナンス表示 → `git pull` → ビルド → `migrate --force` → キャッシュ作り直し → 再起動 → 動作確認）を1つのコマンドにする。

## 12. Ownerの決定（2026-10-10）

| 項目 | 決定 |
|---|---|
| サーバーの大きさ | 2GBで始める。必要になれば4GB |
| DNS | レンタルサーバーの管理画面で、レコードを足す |
| 問い合わせ先 | 中央管理システムにAPIで送る（14章） |
| AWSアカウント | 既存に足す |
| 穴ふさぎ | 実施する（15章に結果） |

## 13. 法務の【要入力】のうち、これで埋まるもの

`docs/legal/privacy.md` の「サーバーの会社」「メールを送る会社」は、次で埋める（Ownerの確認のうえ）。

- サーバーとデータの保管: Amazon Web Services（AWS）、東京リージョン
- メールの送信: Amazon SES（東京リージョン）

氏名・問い合わせ先・住所の扱い・裁判所・制定日は、Ownerにお願いする（`docs/legal/README.md` 3章）。

## 14. 次に決めること：お問い合わせの送り先（中央管理システム）

Ownerの方針は、問い合わせを各サービスで受けず、**APIで中央管理システムへ送って一元管理する**こと。いまアプリにある「ご意見」（保護者のフォーム・問題の「へん？」報告）は、このアプリのDBに溜めてOwner管理画面で見る形。これを次のどちらにするか、中央管理システムのAPIの仕様（宛先URL・認証・送る項目・サービスの識別子）を伺って決める。

- A. 中央管理システムへ**だけ**送る（アプリのDBには保存しない）
- B. **両方**に送る（アプリのDBにも残し、中央へも送る。中央がつながらないときは、あとで再送できる）【暫定の推奨：B】

また、法務の「お問い合わせ用のメールアドレス」は、中央管理システムの窓口のアドレスを使う。メールの返信先（`reply-to`）も同じ。

## 15. 穴ふさぎの結果（3章）

| 項目 | 結果 |
|---|---|
| 1. Owner/Adminの自己登録 | `POST /owner/register`・`POST /admin/register` のルートと担当クラスを削除（404）。Ownerは `php artisan owner:create {email}` で作る（メール確認済み・パスワード12文字以上・対話入力） |
| 2. 試験用アカウント | `DatabaseSeeder` は本番では例外で止まる。本番は `ProductionSeeder`（中身だけ）を使う。開発の `DatabaseSeeder` は、試験用アカウントのあとに同じ一覧を流す |
| 3. 国旗の画像 | `.gitignore` の例外を外し、297枚すべてをgitに入れた（3.2MB）。出どころ・ライセンスの表記は、Ownerが素材の入手元を確認してほしい（`frontend/public/flag` には `CREDITS.md` がない） |
| 4. プロキシの裏のHTTPS | `trustProxies(at: '*')`（PHP-FPMは外に公開しない構成なので） |
| テスト | `tests/Feature/ProductionSafetyTest.php` に8件。全体 1027件が通る |
