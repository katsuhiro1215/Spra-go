import { describe, expect, it } from "vitest";

import {
  SLOT_MARKS,
  correctItemId,
  emptySlots,
  placeFlag,
  removeFlag,
  seededOrder,
  slotAnswers,
  slotsFull,
  unplacedItems,
} from "./flag-fit";

describe("はめ込み(国旗を番号の枠に入れる)", () => {
  it("国旗をタップすると、いちばん上の空いている枠に入る", () => {
    let slots = emptySlots(4);
    slots = placeFlag(slots, "Japan");
    slots = placeFlag(slots, "Turkey");

    expect(slots).toEqual(["Japan", "Turkey", null, null]);
  });

  it("入れた国旗をもう一度タップ(取り出す)と、枠が空いて、次に入れた国旗はその枠に入る", () => {
    let slots = placeFlag(placeFlag(placeFlag(emptySlots(4), "A"), "B"), "C");
    slots = removeFlag(slots, "B");

    expect(slots).toEqual(["A", null, "C", null]);
    expect(placeFlag(slots, "D")).toEqual(["A", "D", "C", null]);
  });

  it("同じ国旗は2回入らない。全部の枠が埋まっていれば、何も起きない", () => {
    const one = placeFlag(emptySlots(2), "A");
    expect(placeFlag(one, "A")).toBe(one);

    const full = placeFlag(one, "B");
    expect(placeFlag(full, "C")).toBe(full);
  });

  it("全部入ったかの判定", () => {
    expect(slotsFull(["A", null])).toBe(false);
    expect(slotsFull(["A", "B"])).toBe(true);
    expect(slotsFull([])).toBe(true);
  });

  it("答えは、枠の番号の順の選択肢と、入れた国旗の組。全部入っていなければ空", () => {
    const choices = [
      { id: 11, label: "日本" },
      { id: 12, label: "トルコ" },
    ];

    expect(slotAnswers(["Turkey", "Japan"], choices)).toEqual([
      { item_id: "Turkey", choice_id: 11 },
      { item_id: "Japan", choice_id: 12 },
    ]);
    expect(slotAnswers(["Turkey", null], choices)).toEqual([]);
  });

  it("下に残る国旗は、まだ入れていないもの(順番はそのまま)", () => {
    const items = [
      { id: "A", image: "/flag/A.svg" },
      { id: "B", image: "/flag/B.svg" },
      { id: "C", image: "/flag/C.svg" },
    ];

    expect(unplacedItems(items, ["B", null, null]).map((item) => item.id)).toEqual(["A", "C"]);
  });

  it("並べ替えは、同じ番号なら同じ並び。要素は失われず、もとの配列は変えない", () => {
    const items = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));

    const first = seededOrder(items, 7);
    expect(seededOrder(items, 7)).toEqual(first);
    expect([...first].map((item) => item.id).sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(items.map((item) => item.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(seededOrder(items, 8)).not.toEqual(first);
  });

  it("答え合わせのあと、枠の選択肢の正しい国旗がどれかを引ける", () => {
    const results = [
      { item_id: "Japan", correct: false, correct_choice_id: 11 },
      { item_id: "Turkey", correct: true, correct_choice_id: 12 },
    ];

    expect(correctItemId(results, 11)).toBe("Japan");
    expect(correctItemId(results, 99)).toBeNull();
    expect(correctItemId(null, 11)).toBeNull();
  });

  it("番号の印は、①〜④", () => {
    expect(SLOT_MARKS).toEqual(["①", "②", "③", "④"]);
  });
});
