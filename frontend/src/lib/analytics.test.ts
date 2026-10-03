import { describe, expect, it } from "vitest";

import { cohortLevel, exportFileName, formatCount, formatDay, formatMinutes, formatRate } from "./analytics";

describe("formatRate", () => {
  it("0〜1の割合を、整数の%にする。null は「—」", () => {
    expect(formatRate(0.7333)).toBe("73%");
    expect(formatRate(1)).toBe("100%");
    expect(formatRate(0)).toBe("0%");
    expect(formatRate(0.005)).toBe("1%");
    expect(formatRate(null)).toBe("—");
  });
});

describe("formatCount", () => {
  it("数は桁区切り。null(回数を持たない遊び)は「—」", () => {
    expect(formatCount(1234)).toBe("1,234");
    expect(formatCount(0)).toBe("0");
    expect(formatCount(null)).toBe("—");
  });
});

describe("formatMinutes", () => {
  it("60分未満は「分」、以上は「時間分」", () => {
    expect(formatMinutes(0)).toBe("0分");
    expect(formatMinutes(52)).toBe("52分");
    expect(formatMinutes(60)).toBe("1時間");
    expect(formatMinutes(65)).toBe("1時間5分");
  });
});

describe("formatDay", () => {
  it("Y-m-d を「月/日」にする(0を付けない)", () => {
    expect(formatDay("2026-10-03")).toBe("10/3");
    expect(formatDay("2026-01-15")).toBe("1/15");
  });
});

describe("cohortLevel", () => {
  it("割合を、色の濃さ(0〜4)の段階にする。null は 0", () => {
    expect(cohortLevel(null)).toBe(0);
    expect(cohortLevel(0)).toBe(1);
    expect(cohortLevel(0.24)).toBe(1);
    expect(cohortLevel(0.25)).toBe(2);
    expect(cohortLevel(0.5)).toBe(3);
    expect(cohortLevel(0.75)).toBe(4);
    expect(cohortLevel(1)).toBe(4);
  });
});

describe("exportFileName", () => {
  it("種類と日付を入れた名前にする", () => {
    expect(exportFileName("daily", "2026-10-03")).toBe("spra-analytics-daily-2026-10-03.csv");
    expect(exportFileName("hard-questions", "2026-10-03")).toBe("spra-analytics-hard-questions-2026-10-03.csv");
  });
});
