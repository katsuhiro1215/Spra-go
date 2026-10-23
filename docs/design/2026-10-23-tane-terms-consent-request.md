# Tane：同意のしなおしと、共通の規約への切り替え（Tane 側の作業の依頼）

- 作成: 2026-10-23（Spra Go 側のチャットから）
- 前提: `2026-10-23-shared-account-legal-design.md`（5章）、`company/spra/tane/docs/2026-10-22-spra-go-side-done-handoff.md`
- Spra Go 側のしくみは実装ずみ（`main`）。ただし**版（`config/legal.php`）はまだ上げていない**ので、いまは誰も「同意が古い」にならない。版を上げるのは、本文の確定（専門家の確認）のあと。Tane 側は先に作っておいてよい（同意が古い人が出ないうちは、画面が出ないだけ）。

## 1. Spra Go 側で追加したもの

- `GET /api/user`（Bearer）の返事に `terms_outdated: bool` と `terms_version_current: string`。
- ログイン `POST /api/auth/token`・登録 `register-token` の返事の `user` に `terms_outdated: bool`。
- **`POST /api/terms/accept`**（Bearer）入力 `{ version }`（= `terms_version_current` の値）→ 204。版が一致しないと 422（ページを開いている間に版が変わったとき。読み込み直す）。未ログインは 401。
- Tane の入口（`/api/tane/profiles/*/progress`・`/api/tane/parent/records`）は、同意が古いと **403** `{ message, code: "terms_outdated" }`。`confirm-password`・ログアウトは止めない。

## 2. お願いしたいこと

1. **同意の画面**（Tane で完結させる。Owner 決定）。ログイン直後に `user.terms_outdated === true` なら、プロフィール選びの前に出す。
   - 中身: 「きまりが かわります」、保護者向けの要約、全文へのリンク（`https://go.spra.jp/terms`・`/privacy`。新しいタブ）、「同意する」→ `POST /api/terms/accept` → 続ける、「同意しない」→ ログアウト（トークンと端末の記録を消す）＋「アカウントの削除は info@spra.jp へ」。
   - 要約の文面は、Spra Go の同意の画面（`frontend/src/app/terms-update/page.tsx` の `CHANGES`）と同じにそろえる:
     - Spra Go と Tane（べつのアプリ）で、おなじアカウントを つかえるようになります
     - どのアプリを つかっているか、いつ つかいはじめたかを きろくします
     - あそんだ きろくは、アプリごとに べつべつに ほぞんします
     - アカウントを けすと、すべてのアプリの きろくが きえます
2. **403 `code: "terms_outdated"` を受けたとき**（アプリを開いている間に版が変わった、など）も、同じ同意の画面へ。送れなかった記録は「未送信」のまま残し、同意のあとに送り直す。
3. **Tane 専用の規約・プライバシーポリシーを、共通版へのリンクに置き換える。** ログインを有効にするとき、Tane の画面の規約・プライバシーのリンクは `https://go.spra.jp/terms`・`/privacy` を指す（Tane 専用の本文は持たない。計算の問題の正確さなど、Tane だけの補足が要る場合は、短い補足だけ残す）。`company/spra/tane/docs/legal/` の下書きは、その旨を書いて、ログインなしの間の説明にとどめる。
4. 登録画面の同意のチェック文は、Spra Go と同じ（「利用規約とプライバシーポリシーに同意します」）。

## 3. 確認したいこと・完了の目安
- Spra Go をローカルで動かし、`legal.version` を変える（`.env` ではなく、ユーザーの `terms_version` を古くする）と、同意の画面が出て、同意すると記録が送られること。
- `terms_outdated` が無い（古い Spra Go の返事）ときは、何も出さないこと。
- 既存のテストが壊れない。

## 4. このあとの流れ
規約の本文を確定（専門家の確認）→ Spra Go で版を上げてデプロイ → 同意の画面を実機で確認 → `TANE_LOGIN_ENABLED=true`・`NEXT_PUBLIC_TANE_LOGIN=on`（Tane の再ビルド）。
