import { describe, expect, it } from "vitest";

import { RESET_LINK_ERROR, isEmailVerified, resendMessage, resetPasswordErrors, verifyResultView } from "./auth-flow";

describe("メール確認・パスワード再設定の画面(設計書 2026-09-29-email-verify-reset 3章)", () => {
  it("確認の結果は verified・expired・それ以外で出し分ける", () => {
    expect(verifyResultView("verified")).toEqual({
      ok: true,
      title: "メールアドレスを確かめました",
      body: "これでコインも買えるようになりました",
    });
    expect(verifyResultView("expired")).toMatchObject({ ok: false, title: "リンクの期限が切れています" });
    expect(verifyResultView("invalid")).toMatchObject({ ok: false, title: "リンクが正しくありません" });
    expect(verifyResultView("something")).toMatchObject({ ok: false, title: "リンクが正しくありません" });
    expect(verifyResultView(null)).toMatchObject({ ok: false, title: "リンクが正しくありません" });
  });

  it("確かめ済みかは email_verified_at があるかで決める", () => {
    expect(isEmailVerified({ email_verified_at: "2026-09-29T00:00:00.000000Z" })).toBe(true);
    expect(isEmailVerified({ email_verified_at: null })).toBe(false);
    expect(isEmailVerified(null)).toBe(false);
  });

  it("新しいパスワードのエラーは、リンクのまちがいとパスワードのまちがいに分ける", () => {
    expect(resetPasswordErrors({ email: ["このパスワード再設定トークンは無効です。"] })).toEqual({
      link: RESET_LINK_ERROR,
      password: null,
    });
    expect(resetPasswordErrors({ token: ["tokenは必須です。"] })).toEqual({ link: RESET_LINK_ERROR, password: null });
    expect(resetPasswordErrors({ password: ["パスワードは8文字以上にしてください。"] })).toEqual({
      link: null,
      password: "パスワードは8文字以上にしてください。",
    });
    expect(resetPasswordErrors(undefined)).toEqual({ link: null, password: null });
  });

  it("もう一度送ったあとの文は、送れた・待ってね・送れなかったで出し分ける", () => {
    expect(resendMessage(200)).toBe("メールを送りました");
    expect(resendMessage(429)).toBe("少し時間をおいてから、もう一度押してね");
    expect(resendMessage(500)).toBe("送れませんでした。時間をおいて、もう一度押してね");
    expect(resendMessage(0)).toBe("送れませんでした。時間をおいて、もう一度押してね");
  });
});
