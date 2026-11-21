# Spra Go への引き継ぎ: 「Spraと鹿。」のアカウント連携・ランキング・遊ばれた数(2026-11-21)

- 宛先: Spra Go 専用チャット
- 書いた人: Spraと鹿。(SpraDeer)のチャット(Claude)。Owner の依頼で、Spra Go 側も改修した
- Spra Go の変更は **ブランチ `feat/deer-account`** に push 済み。**`main` には入れていない**(Spra Go の CLAUDE.md の「法務・外部公開にかかわる新しい仕組みは Owner に確認」に当たるため)。レビューして、`main` に入れるかどうかを判断してほしい
- 同じ内容を、Spra Go のリポジトリにも `docs/design/2026-11-21-deer-account-request.md` として入れてある(コードのコメントから参照している)

## 1. Owner の依頼(2026-11-21)

1. ユーザー認証を足す。認証は Spra Go のものを使う(Tane と同じ形)
2. ログインしなくても遊べるのは、各ゲーム(ワールド)の2面目まで(1-1・1-2 …)。3面目からはログインが必要
3. 面ごとのランキング。**全ユーザーのランキング**と**家族の中のランキング**。1人のユーザー(例: 父)が家族(父・母・息子・娘)で遊ぶので、家族の1人ずつの名前が要る
4. どの面がどれだけ遊ばれたか・何人がクリアしたかを数える(例: 1-1 は100回、8-7 は3人がクリア)。**ユーザーに見せてよい**。あまり遊ばれていない面を直す参考にする

## 2. 決めたこと(Spra Go の今の仕組みに合わせた)

| 項目 | やり方 | 理由 |
|---|---|---|
| ログイン | Tane の `/api/auth/token`・`/api/auth/register-token`・`DELETE /api/auth/token` をそのまま使う。アプリは `X-Spra-App: deer` で見分ける | 新しい入口を増やさない。Tane は今までどおり(ヘッダーが `deer` 以外・無しは Tane) |
| 有効・無効 | `config/deer.php` の `login_enabled`(`DEER_LOGIN_ENABLED`、**既定 false**) | Tane の `TANE_LOGIN_ENABLED` と同じ。Spraと鹿。の規約更新が済むまで off |
| 家族の1人ずつ | Spra Go の `user_profiles`(家族のプロフィール)を、そのまま「あそぶ人」に使う | Tane と同じ |
| 全ユーザーのランキング | 名前は出さず、Spra Go のランキングと同じ「色+どうぶつ」のニックネーム(`Ranking::nickname`)。載るのは、保護者がパスワードを入れ直して「公開」にした家族だけ | Spra Go のミニゲームのランキングと同じ守り方(子どもの名前を外に出さない) |
| 公開の印 | `user_schemas.deer_ranking_public`(新しい列、既定 false)。Spra Go の `ranking_public` とは**別** | Spra Go で公開に同意したことを、別のアプリにまで広げないため |
| 家族のランキング | プロフィールの名前を出す(家族の中だけ) | Spra Go と同じ |
| ランキングの並び | 面ごとの、クリアのいちばん速いタイム(短い順。同じなら先に出した人) | どのゲームもクリアのタイムを持っている |
| 遊ばれた数 | ログインしていない人も数える。名前は持たず、端末ごとの番号(UUID、`anon_id`)で1人と数える | 2面目までは ログインなしで遊ぶので、数えないと 1-1・1-2 が少なく見える |
| ログインなしの範囲 | サーバーでも、`anon_id` での `/plays` は各ワールドの2面目まで(3面目からは 403 `login_required`) | 画面だけでなく、サーバーでも守る |

## 3. Spra Go の変更(ブランチ `feat/deer-account`)

### 新しいファイル
- `config/deer.php` … `login_enabled`(DEER_LOGIN_ENABLED)・`url`(DEER_URL、CORS)・`token_days`(90)・`free_levels`(2)・`stats_cache_seconds`(600)
- `database/migrations/2026_11_21_000001_create_deer_tables.php`
  - `deer_plays`: 遊んだ1回(`user_profile_id` NULL可・`anon_id` UUID NULL可・`player_key`(`p:{id}` / `a:{uuid}`、人数を数える印)・`level_id`・`result`(clear/fail/quit)・`time_ms`・`stars`・`time_verified`・`started_at`・`finished_at`・`played_on`)
  - `deer_stage_records`: プロフィール×面の記録(`plays`・`clears`・`stars`・`best_ms`・`best_at`。unique(user_profile_id, level_id))
  - `user_schemas.deer_ranking_public`(boolean、既定 false)
  - プロフィールを消すと、外部キーで deer_ の行も消える(`anon_id` の行は個人の情報を持たないので残る)
- `app/Models/DeerPlay.php`・`app/Models/DeerStageRecord.php`
- `app/Support/Deer/DeerLevels.php`(面の番号 `^[1-8]-([1-9]|10)$`・ログインなしで遊べる面)・`DeerProfiles.php`(家族のプロフィールかの確かめ。Tane の `TaneProfiles` と同じ考え)・`DeerRanking.php`・`DeerStats.php`
- `app/Http/Controllers/Deer/PlayController.php`・`RecordController.php`・`RankingController.php`
- `tests/Feature/Deer/DeerTest.php`(9件)

### 変えたファイル
- `app/Support/Tane/TokenIssuer.php` … `app(Request)`(X-Spra-App で tane/deer)を足し、`issue($user, $device, $app)`・`ensureEnabled($app)` に。トークンの名前は `deer:<端末>`。**引数を省いたときは今までどおり tane**
- `app/Http/Controllers/Tane/TokenController.php` … 上の `$app` を渡すだけ
- `app/Models/UserSchema.php` … `deer_ranking_public` を fillable・casts に
- `config/cors.php` … `allowed_origins` に `env('DEER_URL')` を足した
- `routes/api.php` … `deer` のまとまりを足した(下の表)。use の並びは pint で整えた
- `.env.example` … `DEER_URL`・`DEER_LOGIN_ENABLED=false`

### API(すべて `/api` の下)

| メソッド・道 | 認証 | 中身 |
|---|---|---|
| POST `/auth/token`・`/auth/register-token`(X-Spra-App: deer) | なし | Tane と同じ。`deer.login_enabled` が off なら 403 |
| POST `/deer/plays` `{level, profile_id?, anon_id?}` | 任意(ログイン中は Bearer+profile_id) | 遊び始め。201 `{id}`。ログインなしは anon_id 必須・2面目まで。profile_id はログインした人の家族のものだけ(違えば 403、トークンなしは 401、規約の同意が古ければ 403 `terms_outdated`)。throttle 60/分 |
| POST `/deer/plays/{play}/finish` `{result, time_ms?, stars?, anon_id?}` | 始めた人と同じ人 | 終わり。2回目は 409。タイムは「始めてから終わるまで(サーバーで測る)」×1.1+2秒以下・1秒以上のときだけ `time_verified`(Spra Go のパズルのランキングと同じ確かめ方)。クリアなら `deer_stage_records` を更新(clears+1・★は大きい方・タイムは verified で速いときだけ) |
| GET `/deer/stats` | なし | 面ごとの `plays`・`players`・`clears`・`clear_players`(80面ぶん)と、全体の `players`・`plays`。数だけ。10分キャッシュ |
| GET `/deer/profiles/{profile}/records` | sanctum + terms.current | 面ごとの記録(別の端末でログインしたときの引きつぎ) |
| GET `/deer/ranking/{level}?scope=family\|all&profile_id=` | sanctum + terms.current | 上位10件 + 自分の順位(10位より下のとき)+ 件数。family=名前、all=ニックネーム(公開した家族だけ) |
| GET / PUT `/deer/ranking/settings`(profile_id, public, password) | sanctum + terms.current | みんなのランキングに出すか。オンにするときだけ `ParentPassword::confirm`(パスワードの入れ直し) |
| POST `/deer/ranking/nickname`(profile_id, password) | sanctum + terms.current | ニックネームを付け直す(`Ranking::reroll`) |

## 4. 確かめたこと(正直に)

- Spra Go の手元の Docker が WSL から使えなかったため、**MySQL ではなく SQLite(`DB_CONNECTION=sqlite DB_DATABASE=:memory:`)でテストした**
  - 新しいテスト `tests/Feature/Deer` 9件: すべて通過
  - テスト全体: 1290件中 188件が失敗。**改修前の `main` でも、まったく同じ188件が SQLite で失敗する**(一覧を比べて差が0件)。今回の改修で増えた失敗は無い
  - Tane のテスト(`tests/Feature/Tane`): 改修前から SQLite で落ちる `TaneDashboardTest` の2件以外は通過
- pint: 変えたファイルは通過(`tests/Pest.php` の指摘は改修前から)
- つないでの確認(手元の SQLite で `php artisan serve` + Spraと鹿。の開発サーバー): ログイン → 家族のプレイヤー選び → 3面目(5-3)を遊んでクリア → `deer_plays`・`deer_stage_records` に記録(time_verified=true)→ 家族のランキング(名前)・みんなのランキング(公開した家族だけ、ニックネーム)・公開の設定画面・CORS の preflight(`DEER_URL` を許可)まで動いた

## 5. Spra Go 側でお願いしたいこと

1. **MySQL(Sail)でテストを流す**: `tests/Feature/Deer`・`tests/Feature/Tane`・`RankingTest`、できれば全体
2. ブランチ `feat/deer-account` のレビューと、`main` に入れるかの判断(Owner に確認)
3. 本番の設定(入れるとき):
   - マイグレーション `2026_11_21_000001_create_deer_tables`
   - `.env` に `DEER_URL`(Spraと鹿。の本番の場所。決まったら)・`DEER_LOGIN_ENABLED=false`(規約が済むまで)
4. 法務(Owner): Spra Go の利用規約・プライバシーポリシー(共通アカウントの設計 `2026-10-23-shared-account-legal-design.md`)に、Spraと鹿。を連携するアプリとして足すか。Spraと鹿。側の規約・プライバシーポリシーも、①アカウント連携 ②ログインなしでも遊んだ回数を端末ごとの番号で送ること ③みんなのランキング(ニックネーム)を書き足す必要がある。**`DEER_LOGIN_ENABLED` を true にするのは、これが済んでから**
5. 気をつけてほしい点
   - ニックネームは Spra Go のランキングと**同じもの**(`user_profiles.ranking_nickname`)。Spraと鹿。から付け直すと、Spra Go のランキングでも変わる。分けたほうがよければ相談したい
   - `deer_plays` は1回ごとに1行ふえる。増えすぎたら、古い行を日ごとの集計にまとめる(今は未対応)
   - Owner のダッシュボードには、まだ Spraと鹿。のカードを足していない(遊ばれた数は `/api/deer/stats` で見られる)。必要なら Tane のカード(`DashboardSummary`)と同じ形で足したい

## 6. Spraと鹿。側の変更(参考)

- リポジトリ `katsuhiro1215/Spra-deer`(コードは WSL `~/SmartSprouts/projects/SpraDeer`)。設計書は `rooms/Spra/dev/SpraDeer/design.md` 37章
- 環境変数: `NEXT_PUBLIC_SPRA_API_URL`(Spra Go の場所。空なら通信しない)・`NEXT_PUBLIC_DEER_LOGIN=on`(ログインの入口を出す。既定は出さない)
- 送るヘッダー: `X-Spra-App: deer`・`Accept: application/json`・ログイン中は `Authorization: Bearer`。クッキーは使わない(`credentials: 'omit'`)
- 記録・コイン・体力は、端末の中でプレイヤーごとに分けて保存。Spra Go に預けるのは「遊んだ回・クリアの記録」だけ(コイン・体力は預けていない)
