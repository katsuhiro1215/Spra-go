import { describe, expect, it } from "vitest";

import { inviteCodeFromSearch, registrationView } from "./registration";

describe("inviteCodeFromSearch", () => {
  it("?code= の値を取り、前後の空白を取る", () => {
    expect(inviteCodeFromSearch("?code=Spra2026")).toBe("Spra2026");
    expect(inviteCodeFromSearch("?code=%20abc%20")).toBe("abc");
  });

  it("日本語のコードも読める", () => {
    expect(inviteCodeFromSearch("?code=%E3%81%BF%E3%82%93%E3%81%AA")).toBe("みんな");
  });

  it("code がなければ空。長すぎるコードは64文字で切る", () => {
    expect(inviteCodeFromSearch("")).toBe("");
    expect(inviteCodeFromSearch("?other=1")).toBe("");
    expect(inviteCodeFromSearch(`?code=${"a".repeat(80)}`)).toHaveLength(64);
  });
});

describe("registrationView", () => {
  it("コードが要るときはコード欄を出す", () => {
    expect(registrationView({ open: true, invite_required: true })).toEqual({ showCode: true, closed: false });
  });

  it("コードが要らないときは、コード欄を出さない", () => {
    expect(registrationView({ open: true, invite_required: false })).toEqual({ showCode: false, closed: false });
  });

  it("おやすみ中は、閉じた表示にする", () => {
    expect(registrationView({ open: false, invite_required: true })).toEqual({ showCode: true, closed: true });
  });

  it("問い合わせが失敗したときは、コード欄を出して、閉じてはいない(サーバーが最後に判断する)", () => {
    expect(registrationView(null)).toEqual({ showCode: true, closed: false });
  });
});
