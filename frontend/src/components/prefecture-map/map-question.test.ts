import { describe, expect, it } from "vitest";

import { MAP_VIEWS, PREFECTURE_SHAPES } from "./japan-map";
import { mapQuestionOf, viewBoxOf } from "./map-question";

describe("地図の問題の指定(questions.meta.map)", () => {
  it("highlight と view が正しければ、そのまま使う", () => {
    expect(mapQuestionOf({ map: { highlight: "kagawa", view: "chugoku-shikoku" } })).toEqual({ highlight: "kagawa", view: "chugoku-shikoku" });
  });

  it("view が無いときは、全国(japan)", () => {
    expect(mapQuestionOf({ map: { highlight: "tokyo" } })).toEqual({ highlight: "tokyo", view: "japan" });
  });

  it("地図の指定が無い・おかしいときは null(ふつうの問題として出す)", () => {
    expect(mapQuestionOf(undefined)).toBeNull();
    expect(mapQuestionOf({})).toBeNull();
    expect(mapQuestionOf({ map: {} })).toBeNull();
    expect(mapQuestionOf({ map: { highlight: "atlantis" } })).toBeNull();
    expect(mapQuestionOf({ map: { highlight: "kagawa", view: "mars" } })).toBeNull();
    expect(mapQuestionOf({ map: "kagawa" })).toBeNull();
  });

  it("対象の県が、その表示の範囲に入っているかは、実在のkeyだけを受け付けることで守る(全県で通る)", () => {
    for (const key of Object.keys(PREFECTURE_SHAPES)) expect(mapQuestionOf({ map: { highlight: key } })?.highlight).toBe(key);
  });

  it("viewBox は「x y 幅 高さ」の文字列", () => {
    const [x, y, w, h] = MAP_VIEWS.kinki;
    expect(viewBoxOf("kinki")).toBe(`${x} ${y} ${w} ${h}`);
  });
});
