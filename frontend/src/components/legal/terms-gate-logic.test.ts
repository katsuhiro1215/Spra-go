import { describe, expect, it } from "vitest";

import { isTermsExemptPath, shouldAskTerms } from "./terms-gate-logic";

describe("isTermsExemptPath", () => {
  it("ログイン前の画面・規約の本文・同意の画面・運営側は送らない", () => {
    for (const path of ["/login", "/register", "/terms", "/privacy", "/terms-update", "/verify-email", "/password-reset/abc", "/owner/dashboard", "/admin"]) {
      expect(isTermsExemptPath(path)).toBe(true);
    }
  });

  it("ふつうの画面は送る対象(前方一致のまちがいをしない)", () => {
    for (const path of ["/", "/profiles", "/learn", "/travel/1", "/terms-of-play", "/loginx"]) {
      expect(isTermsExemptPath(path)).toBe(false);
    }
  });
});

describe("shouldAskTerms", () => {
  it("terms_outdated が true のときだけ", () => {
    expect(shouldAskTerms({ terms_outdated: true })).toBe(true);
    expect(shouldAskTerms({ terms_outdated: false })).toBe(false);
    expect(shouldAskTerms({})).toBe(false);
    expect(shouldAskTerms(null)).toBe(false);
  });
});
