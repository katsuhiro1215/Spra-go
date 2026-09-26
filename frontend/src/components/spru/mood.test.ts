import { describe, expect, it } from "vitest";

import {
  EVENT_LINE_MS,
  IDLE_SIT_MS,
  IDLE_SLEEP_MS,
  NIGHT_AWAKE_MS,
  pickAnswerImage,
  pickResult,
  pickTownMood,
  type TownMoodInput,
} from "./mood";

// 2026-09-26のローカル時刻(ミリ秒)
const t = (hour: number, minute = 0, second = 0) => new Date(2026, 8, 26, hour, minute, second).getTime();
const input = (overrides: Partial<TownMoodInput> = {}): TownMoodInput => ({
  now: t(12),
  lastInteractionAt: t(12),
  event: null,
  nightWokenAt: null,
  placing: false,
  ...overrides,
});

describe("pickTownMood", () => {
  it("ふだんは3/4の立ち姿で、時間帯のあいさつを言う", () => {
    expect(pickTownMood(input())).toEqual({
      image: "three-quarter",
      face: "normal",
      line: "こんにちは！今日もいっしょに学ぼう",
      sleeping: false,
    });
    expect(pickTownMood(input({ now: t(7), lastInteractionAt: t(7) })).line).toBe("おはよう！今日もいっしょに学ぼう");
    expect(pickTownMood(input({ now: t(17), lastInteractionAt: t(17) })).line).toBe("おかえり！もうひとがんばりしよう");
    expect(pickTownMood(input({ now: t(20), lastInteractionAt: t(20) })).line).toBe(
      "こんばんは！寝る前にちょっとだけ学ぼう",
    );
  });

  it("町を開いた直後は手を振り、2.5秒で立ち姿に戻る", () => {
    const event = { kind: "greet" as const, at: t(12) };
    expect(pickTownMood(input({ event, now: t(12) + 2_499 }))).toMatchObject({ image: "wave", face: "happy" });
    expect(pickTownMood(input({ event, now: t(12) + 2_500 })).image).toBe("three-quarter");
  });

  it("置いたらジャンプし、2.6秒後は立ち姿に戻るが、吹き出しは8秒まで残る", () => {
    const event = { kind: "placed" as const, at: t(12), itemName: "ベンチ" };
    expect(pickTownMood(input({ event, now: t(12) + 1_000 }))).toEqual({
      image: "jump",
      face: "happy",
      line: "ベンチを置いたよ！町がにぎやかになったね",
      sleeping: false,
    });
    expect(pickTownMood(input({ event, now: t(12) + 2_600 }))).toMatchObject({
      image: "three-quarter",
      line: "ベンチを置いたよ！町がにぎやかになったね",
    });
    expect(pickTownMood(input({ event, now: t(12) + EVENT_LINE_MS })).line).toBe("こんにちは！今日もいっしょに学ぼう");
  });

  it("しまったら手を合わせ、通信エラーはがっかり、初回プレゼントはジャンプ", () => {
    expect(pickTownMood(input({ event: { kind: "stored", at: t(12), itemName: "花だん" } }))).toMatchObject({
      image: "palms",
      face: "smile",
      line: "花だんをバッグにしまったよ",
    });
    expect(pickTownMood(input({ event: { kind: "error", at: t(12) } }))).toMatchObject({
      image: "sad",
      face: "sad",
      line: "うまくいかなかった…もう一度ためしてね",
    });
    expect(pickTownMood(input({ event: { kind: "welcome", at: t(12) } }))).toMatchObject({
      image: "jump",
      line: "ポイントでショップのアイテムを買ってみよう！",
    });
  });

  it("タップしたときは選ばれた画像とひとことを出す", () => {
    const event = { kind: "tap" as const, at: t(12), image: "shy" as const, hint: "つづきから学ぼう！" };
    expect(pickTownMood(input({ event }))).toEqual({
      image: "shy",
      face: "shy",
      line: "つづきから学ぼう！",
      sleeping: false,
    });
  });

  it("30秒さわらないと座り、90秒で寝る", () => {
    const at = (idle: number) => pickTownMood(input({ now: t(12) + idle, lastInteractionAt: t(12) }));
    expect(at(IDLE_SIT_MS - 1).image).toBe("three-quarter");
    expect(at(IDLE_SIT_MS)).toMatchObject({ image: "sit", face: "smile", line: "ひと休み…", sleeping: false });
    expect(at(IDLE_SLEEP_MS - 1).image).toBe("sit");
    expect(at(IDLE_SLEEP_MS)).toEqual({ image: "sleep", face: "normal", line: "すやすや…", sleeping: true });
  });

  it("置く場所を選んでいる間は、さわらなくても座らず、わくわく顔で案内する", () => {
    expect(pickTownMood(input({ placing: true, now: t(12) + IDLE_SLEEP_MS, lastInteractionAt: t(12) }))).toEqual({
      image: "three-quarter",
      face: "excited",
      line: "どこに置く？光っているマスをタップしてね",
      sleeping: false,
    });
  });

  it("22時からは最初から寝ていて、町を開いたときのあいさつより眠りが優先される", () => {
    const event = { kind: "greet" as const, at: t(22) };
    expect(pickTownMood(input({ event, now: t(22), lastInteractionAt: t(22) }))).toMatchObject({
      image: "sleep",
      sleeping: true,
    });
    expect(pickTownMood(input({ now: t(21, 59), lastInteractionAt: t(21, 59) })).sleeping).toBe(false);
  });

  it("夜にスプルを起こすと1分間は起きていて、さわらないまま1分たつとまた寝る", () => {
    const woke = t(23);
    const at = (idle: number) =>
      pickTownMood(input({ now: woke + idle, lastInteractionAt: woke, nightWokenAt: woke }));
    expect(at(NIGHT_AWAKE_MS - 1).sleeping).toBe(false);
    expect(at(NIGHT_AWAKE_MS).sleeping).toBe(true);
  });

  it("起こしたときは驚き、夜と昼で言葉が変わる", () => {
    expect(pickTownMood(input({ event: { kind: "woke", at: t(12) } }))).toMatchObject({
      image: "startled",
      face: "surprised",
      line: "わっ、びっくりした！",
    });
    const night = t(23);
    expect(
      pickTownMood(input({ now: night, lastInteractionAt: night, nightWokenAt: night, event: { kind: "woke", at: night } })),
    ).toMatchObject({ image: "startled", line: "ふぁ…まだ起きてたの？" });
  });

  it("できごとは夜の眠りより優先される(夜でも置いたらジャンプする)", () => {
    const night = t(23);
    expect(
      pickTownMood(input({ now: night, lastInteractionAt: night, event: { kind: "placed", at: night, itemName: "木" } })),
    ).toMatchObject({ image: "jump", sleeping: false });
  });
});

describe("pickAnswerImage", () => {
  it("正解はうれしい、2コンボ以上は大笑い、ボーナスは応援、不正解はがっかり", () => {
    expect(pickAnswerImage({ correct: true, combo: 1, comboBonus: 0 })).toBe("happy");
    expect(pickAnswerImage({ correct: true, combo: 2, comboBonus: 0 })).toBe("laugh");
    expect(pickAnswerImage({ correct: true, combo: 5, comboBonus: 20 })).toBe("cheer");
    expect(pickAnswerImage({ correct: false, combo: 0, comboBonus: 0 })).toBe("sad");
  });
});

describe("pickResult", () => {
  it("全問正解はジャンプ、半分以上はにっこり、それ未満は頑張る", () => {
    expect(pickResult(10, 10)).toEqual({ image: "jump", line: null });
    expect(pickResult(5, 10)).toEqual({ image: "smile", line: null });
    expect(pickResult(4, 10)).toEqual({ image: "effort", line: "次はもっとできるよ！" });
  });
});
