import { describe, expect, it } from "vitest";

import { floatingSettingsVisible, isMenuShown, showMenu, subscribeMenu } from "./menu-presence";

describe("右下の「文A」を出すか", () => {
  it("プレイヤーが入っておらず、新しいメニューも出ていないときだけ出す(ログイン・登録・LPなど)", () => {
    expect(floatingSettingsVisible(false, "none")).toBe(true);
  });

  it("新しいメニューが出ていれば出さない", () => {
    expect(floatingSettingsVisible(true, "none")).toBe(false);
  });

  it("プレイヤーが入っている画面では、読み込み中でメニューがまだ無くても出さない(一瞬出て消えるのを防ぐ)", () => {
    expect(floatingSettingsVisible(false, "active")).toBe(false);
  });

  it("プレイヤーが入っているか確かめている間は出さない", () => {
    expect(floatingSettingsVisible(false, "loading")).toBe(false);
  });
});

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
