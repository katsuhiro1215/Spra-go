import { describe, expect, it } from "vitest";

import { AVATAR_KEYS, avatarImage, avatarKeyOf, firstUnusedAvatar } from "./avatars";

describe("アバターの絵", () => {
  it("6つの名前で、それぞれ別の絵", () => {
    const srcs = AVATAR_KEYS.map((key) => avatarImage(key).src);
    expect(new Set(srcs).size).toBe(6);
  });

  it("空・知らない名前は、1つ目の絵", () => {
    expect(avatarImage(null)).toEqual(avatarImage("avatar-1"));
    expect(avatarImage("avatar-9")).toEqual(avatarImage("avatar-1"));
  });
});

describe("名前をアバターの名前にそろえる", () => {
  it("6種の名前はそのまま", () => {
    expect(avatarKeyOf("avatar-3")).toBe("avatar-3");
  });

  it("空・知らない名前は1つ目", () => {
    expect(avatarKeyOf(null)).toBe("avatar-1");
    expect(avatarKeyOf("dragon")).toBe("avatar-1");
  });
});

describe("追加のときに最初から選ぶアバター", () => {
  it("家族でまだ使われていないものの1つ目", () => {
    expect(firstUnusedAvatar(["avatar-1", "avatar-2"])).toBe("avatar-3");
  });

  it("間があいていれば、そこを選ぶ", () => {
    expect(firstUnusedAvatar(["avatar-1", "avatar-3"])).toBe("avatar-2");
  });

  it("全部使われていたら1つ目", () => {
    expect(firstUnusedAvatar([...AVATAR_KEYS])).toBe("avatar-1");
  });

  it("空の値は、使っていない扱い", () => {
    expect(firstUnusedAvatar([null, "avatar-1"])).toBe("avatar-2");
    expect(firstUnusedAvatar([])).toBe("avatar-1");
  });
});
