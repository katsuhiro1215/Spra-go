import { describe, expect, it } from "vitest";

import { googleButtonState, googleMessage, googleStartUrl } from "./google-auth";

describe("googleStartUrl: ボタンの行き先(APIへ、ブラウザごと移る)", () => {
  it("招待コードがあれば、code= で渡す(日本語・記号もエンコード)", () => {
    expect(googleStartUrl("https://api.go.spra.jp", "Spra2026")).toBe("https://api.go.spra.jp/auth/google?code=Spra2026");
    expect(googleStartUrl("https://api.go.spra.jp", " みんな&1 ")).toBe("https://api.go.spra.jp/auth/google?code=%E3%81%BF%E3%82%93%E3%81%AA%261");
  });

  it("コードが空なら、code= を付けない", () => {
    expect(googleStartUrl("http://localhost", "")).toBe("http://localhost/auth/google");
    expect(googleStartUrl("http://localhost", "   ")).toBe("http://localhost/auth/google");
  });
});

describe("googleMessage: 戻ってきたときの ?google= を、やさしい言葉にする", () => {
  it("知っている結果は、言葉にする", () => {
    for (const status of ["denied", "unverified", "link_unverified", "need_code", "closed"]) {
      expect(googleMessage(status), status).toEqual(expect.any(String));
      expect(googleMessage(status)!.length).toBeGreaterThan(10);
    }
  });

  it("off・知らない言葉・空・null は、何も出さない(でたらめな文字を画面に出さない)", () => {
    for (const status of ["off", "<script>", "", null, undefined]) {
      expect(googleMessage(status as string | null | undefined)).toBeNull();
    }
  });

  it("招待コードが要る結果は、コードを入れてもう一度、と案内する", () => {
    expect(googleMessage("need_code")).toContain("招待コード");
  });
});

describe("googleButtonState: ボタンを出すか・押せるか", () => {
  it("設定がない・問い合わせが失敗したときは、出さない", () => {
    expect(googleButtonState(null, "", "login").show).toBe(false);
    expect(googleButtonState({ open: true, invite_required: false, google: false }, "", "login").show).toBe(false);
    expect(googleButtonState({ open: true, invite_required: false }, "", "login").show).toBe(false);
  });

  it("ログインの画面は、いつでも押せる(すでに登録した人はコードが要らない)", () => {
    const state = googleButtonState({ open: true, invite_required: true, google: true }, "", "login");
    expect(state).toEqual({ show: true, disabled: false, hint: null });
  });

  it("登録の画面で招待コードが要るのに空なら、押せず、先にコードを、と出す", () => {
    const state = googleButtonState({ open: true, invite_required: true, google: true }, "  ", "register");
    expect(state.show).toBe(true);
    expect(state.disabled).toBe(true);
    expect(state.hint).toContain("招待コード");
  });

  it("コードを入れたら押せる。コードが要らないときも押せる", () => {
    expect(googleButtonState({ open: true, invite_required: true, google: true }, "Spra2026", "register").disabled).toBe(false);
    expect(googleButtonState({ open: true, invite_required: false, google: true }, "", "register").disabled).toBe(false);
  });

  it("登録がおやすみ中の登録画面では、出さない", () => {
    expect(googleButtonState({ open: false, invite_required: false, google: true }, "", "register").show).toBe(false);
  });
});
