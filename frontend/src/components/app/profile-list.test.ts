import { describe, expect, it } from "vitest";

import { upsertById } from "./profile-list";

const a = { id: 1, name: "お父さん" };
const b = { id: 2, name: "お母さん" };

describe("保存したプレイヤーを一覧に反映する", () => {
  it("新しいプレイヤーは最後に足す", () => {
    expect(upsertById([a], b)).toEqual([a, b]);
  });

  it("同じidのプレイヤーは、並びを変えずに置き換える", () => {
    const renamed = { id: 1, name: "パパ" };
    expect(upsertById([a, b], renamed)).toEqual([renamed, b]);
  });
});
