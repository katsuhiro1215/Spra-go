# Googleでのログイン・登録（設計）

2026-10-12 / 設計: CEO / 状態: Ownerの承認済み（方針）・実装中

## 1. 目的
保護者が、メールとパスワードを決めずに、**Googleアカウントで登録・ログイン**できるようにする。いちばん早くゲームを始められる入口にする。子どものプロフィールは、これまでどおり家族アカウントの下に作る（Googleに渡すのは保護者のメールと名前だけ）。

## 2. 範囲
- 入れる: 保護者（`users`）の登録とログイン。Owner/Adminは、メールとパスワードのまま。
- 入れない: Appleでサインイン（スマホアプリ化のときに足す）、Googleの連絡先・カレンダーなどの権限（`openid email profile` だけ）。

## 3. 流れ（APIとNextが別のホスト名でも、クッキーでログインする作りのまま）
1. 画面（`/login`・`/register`）の「Googleで続ける」を押す。ブラウザごとAPIへ移る: `GET {API}/auth/google?code=<招待コード>`。
2. API は、招待コード（あれば）をセッションに入れて、Googleの同意画面へ移す（Socialite。`state` で偽の戻りを防ぐ）。
3. Googleから `GET {API}/auth/google/callback` に戻る。結果ごとに、画面へ戻す（`FRONTEND_URL`）。

| 状況 | 動き | 戻り先 |
|---|---|---|
| Googleの画面で「キャンセル」 | ログインしない | `/login?google=denied` |
| Googleがメールを確認済みと言っていない | ログインしない | `/login?google=unverified` |
| すでに同じGoogleでつないだ人 | ログイン | `/profiles` |
| 同じメールのアカウントがある。**メール確認済み** | Googleをつないでログイン | `/profiles` |
| 同じメールのアカウントがある。**メール未確認** | **つながない**（なりすまし防止。先にメールで確認してもらう） | `/login?google=link_unverified` |
| 初めての人。登録がおやすみ中 | 作らない | `/register?google=closed` |
| 初めての人。招待コードが必要で、**ない・違う** | 作らない | `/register?google=need_code`（コードを入れ直してもらう） |
| 初めての人。条件を満たす | アカウントを作り（メール確認済み・パスワードなし）、ログイン | `/profiles` |

- 新しいアカウントには確認メールを送らない（Googleが確認済み。メールのサーバーが整う前でも使える）。
- Googleの設定（クライアントID・シークレット）が空のときは、ボタンを出さない（`GET /api/registration` の `google` が `false`）。開発・テストの標準の状態。

## 4. データ
- `users.google_id`（文字列・重複なし・null可）を足す。
- `users.password` を null可にする。Googleだけで作ったアカウントは、パスワードなし。メールとパスワードでのログインはできない。「パスワードを忘れたら」から、あとでパスワードを決められる（いまの再設定の仕組みのまま）。
- メールの変更はこのアプリにまだ無いので、`google_id` とメールのずれは起きない。

## 5. 守り
- `/auth/google*` は 1分に20回まで。
- 招待コードは、ボタンを押す前に画面で入れてもらい、API が比べる（登録の抜け道にしない）。コードが要るのに空のとき、画面はボタンを押せなくして、「先に招待コードを入れてね」と出す。
- 戻りの結果は、クエリ `google=…` の短い言葉だけを画面へ渡す（メールや名前は渡さない）。
- Googleから受け取るのは、`id`・`email`・`name` と、メール確認済みかどうか。それ以外は保存しない。

## 6. 本番の設定（Owner）
- Google Cloud Console で、OAuthの同意画面とクライアントIDを作る。承認済みのリダイレクトURI: 開発 `http://localhost/auth/google/callback`、本番 `https://api.go.spra.jp/auth/google/callback`。
- `.env.production` に `GOOGLE_CLIENT_ID`・`GOOGLE_CLIENT_SECRET`（`GOOGLE_REDIRECT_URI` は `APP_URL` から決まる）。
- 同意画面の公開の状態が「テスト」のあいだは、登録できるのは**テストユーザー100人まで**。限定公開ならこの範囲で足りる。
- プライバシーポリシーに、Googleのアカウント情報（メールと名前）を使うと書く（`docs/legal/privacy.md`）。

## 7. テスト
Socialiteをモックして、3章の表の8つの状況すべてを、サーバーのテストで確かめる。画面は、戻りの言葉→メッセージの対応と、ボタンの行き先の計算を、純粋な関数にしてテストする。
