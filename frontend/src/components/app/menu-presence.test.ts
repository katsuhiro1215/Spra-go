import { describe, expect, it } from "vitest";

import { isMenuShown, showMenu, subscribeMenu } from "./menu-presence";

describe("新しいメニューが出ているか", () => {
  it("はじめは出ていない", () => {
    expect(isMenuShown()).toBe(false);
  });

  it("1つ出すと出ている、消すと出ていない", () => {
    const hide = showMenu();
    expect(isMenuShown()).toBe(true);
    hide();
    expect(isMenuShown()).toBe(false);
  });

  it("2つ出したら、両方消すまで出ている", () => {
    const hideA = showMenu();
    const hideB = showMenu();
    hideA();
    expect(isMenuShown()).toBe(true);
    hideB();
    expect(isMenuShown()).toBe(false);
  });

  it("同じものを2回消しても、ほかのメニューの分は減らない", () => {
    const hideA = showMenu();
    const hideB = showMenu();
    hideA();
    hideA();
    expect(isMenuShown()).toBe(true);
    hideB();
    expect(isMenuShown()).toBe(false);
  });

  it("出す・消すたびに知らせる", () => {
    let calls = 0;
    const unsubscribe = subscribeMenu(() => {
      calls += 1;
    });
    const hide = showMenu();
    hide();
    unsubscribe();
    expect(calls).toBe(2);
  });
});
