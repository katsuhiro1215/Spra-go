import { describe, expect, it } from "vitest";

import type { ShopListItem, WorldItem } from "@/components/world/types";

import { pickTownHint } from "./hint";

const item = (name: string, price: number, minLevel: number, id = price * 100 + minLevel): ShopListItem => ({
  id,
  name,
  price,
  type: "decoration",
  currency: "point",
  min_level: minLevel,
  asset_key: "bench",
  footprint: 1,
  locked: false,
  meta: { asset_key: "bench" },
});
const bagItem = (name: string): WorldItem => ({ id: 1, shop_item_id: 1, name, asset_key: "bench", footprint: 1, souvenir: false, x: null, y: null });
const shop = [item("ベンチ", 30, 1), item("花だん", 20, 1), item("木", 30, 2)];

describe("pickTownHint", () => {
  it("今日の水やりができるときは、いちばん先に水やりをすすめる", () => {
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 1, shop, canWater: true })).toBe(
      "畑に水をあげよう！",
    );
  });

  it("チケットがあれば、水やりの次にせかいで行き先を選ぶようにすすめる", () => {
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 7, shop, tickets: 1 })).toBe(
      "チケットがあるよ！『せかい』で行きたい国を選ぼう",
    );
    expect(pickTownHint({ bag: [], points: 500, level: 7, shop, canWater: true, tickets: 1 })).toBe("畑に水をあげよう！");
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 7, shop, tickets: 0 })).toBe(
      "バッグにちょうちんがあるよ。町に置いてみよう",
    );
  });

  it("バッグにアイテムがあれば、置くようにすすめる", () => {
    expect(pickTownHint({ bag: [bagItem("ちょうちん")], points: 500, level: 1, shop })).toBe(
      "バッグにちょうちんがあるよ。町に置いてみよう",
    );
  });

  it("今のポイントで買える解放済みのアイテムがあれば、いちばん安いものをすすめる", () => {
    expect(pickTownHint({ bag: [], points: 25, level: 1, shop })).toBe("花だんが買えるよ！ショップをのぞいてみよう");
  });

  it("ポイントが足りなければ、いちばん安いアイテムまでの差を言う", () => {
    expect(pickTownHint({ bag: [], points: 5, level: 1, shop })).toBe("あと15ptで花だんが買えるよ");
  });

  it("解放済みのアイテムが無ければ、次に解放されるアイテムを言う", () => {
    expect(pickTownHint({ bag: [], points: 0, level: 1, shop: [item("屋台", 120, 12), item("木", 30, 2)] })).toBe(
      "Lv.2で木が買えるようになるよ",
    );
  });

  it("町のアイテムが1つも無ければ、学ぶようにすすめる", () => {
    expect(pickTownHint({ bag: [], points: 0, level: 1, shop: [] })).toBe("つづきから学ぼう！");
  });
});
