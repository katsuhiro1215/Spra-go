import { describe, expect, it } from "vitest";

import { retryMessage } from "./stage-result";

describe("クリアできなかったときの文", () => {
  it("あと何問で、クリアになるかを言う", () => {
    expect(retryMessage(6, 4)).toBe("あと2問 せいかいすると クリア！ もういちど やってみよう");
    expect(retryMessage(8, 7)).toBe("あと1問 せいかいすると クリア！ もういちど やってみよう");
  });

  it("点数が足りているときは、何も言わない", () => {
    expect(retryMessage(6, 6)).toBeNull();
    expect(retryMessage(6, 9)).toBeNull();
  });
});
