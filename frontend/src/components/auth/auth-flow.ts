// メール確認・パスワード再設定の画面の計算(docs/design/2026-09-29-email-verify-reset-design.md 3章)。画面を描かない部分だけをここに置く

/** 確認の結果の画面(/verify-email?status=…)に出すもの */
export type VerifyResultView = { ok: boolean; title: string; body: string };

const RETRY_BODY = "もう一度メールを送って、新しいメールのリンクを押してね";

/** 確認の結果の出し分け。verified 以外は、もう一度送る道を出す */
export function verifyResultView(status: string | null | undefined): VerifyResultView {
  if (status === "verified") {
    return { ok: true, title: "メールアドレスを確かめました", body: "これでコインも買えるようになりました" };
  }
  if (status === "expired") {
    return { ok: false, title: "リンクの期限が切れています", body: RETRY_BODY };
  }
  return { ok: false, title: "リンクが正しくありません", body: RETRY_BODY };
}

/** メールアドレスを確かめ済みか(GET /api/user の email_verified_at) */
export function isEmailVerified(user: { email_verified_at?: string | null } | null | undefined): boolean {
  return Boolean(user?.email_verified_at);
}

/** 新しいパスワードの画面で、リンク(token・メールアドレス)がまちがっているときの文 */
export const RESET_LINK_ERROR = "リンクが古いか、正しくありません。もう一度メールを送ってね";

/** POST /reset-password の 422 のエラーを、リンクのまちがいとパスワードのまちがいに分ける */
export function resetPasswordErrors(
  errors: Record<string, string[] | undefined> | undefined,
): { link: string | null; password: string | null } {
  const linkBroken = Boolean(errors?.email?.length || errors?.token?.length);
  return { link: linkBroken ? RESET_LINK_ERROR : null, password: errors?.password?.[0] ?? null };
}

/** 確認メールをもう一度送ったあとの文(POST /email/verification-notification の HTTP の状態から) */
export function resendMessage(httpStatus: number): string {
  if (httpStatus >= 200 && httpStatus < 300) return "メールを送りました";
  if (httpStatus === 429) return "少し時間をおいてから、もう一度押してね";
  return "送れませんでした。時間をおいて、もう一度押してね";
}
