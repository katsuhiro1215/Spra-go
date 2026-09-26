import { describe, expect, it } from "vitest";

import { getSeason, getTimeOfDay, isSpruSleepTime, type Season, type TimeOfDay } from "./time-of-day";

const at = (hour: number, minute = 0) => new Date(2026, 8, 26, hour, minute);
const inMonth = (month: number) => new Date(2026, month - 1, 15, 12, 0);

describe("getTimeOfDay", () => {
  it.each<[number, number, TimeOfDay]>([
    [4, 59, "night"],
    [5, 0, "morning"],
    [9, 59, "morning"],
    [10, 0, "day"],
    [15, 59, "day"],
    [16, 0, "evening"],
    [18, 59, "evening"],
    [19, 0, "night"],
    [0, 0, "night"],
  ])("%i:%i は %s", (hour, minute, expected) => {
    expect(getTimeOfDay(at(hour, minute))).toBe(expected);
  });
});

describe("getSeason", () => {
  it.each<[number, Season]>([
    [2, "winter"],
    [3, "spring"],
    [5, "spring"],
    [6, "summer"],
    [8, "summer"],
    [9, "autumn"],
    [11, "autumn"],
    [12, "winter"],
    [1, "winter"],
  ])("%i月は %s", (month, expected) => {
    expect(getSeason(inMonth(month))).toBe(expected);
  });
});

describe("isSpruSleepTime", () => {
  it.each<[number, number, boolean]>([
    [21, 59, false],
    [22, 0, true],
    [3, 0, true],
    [5, 59, true],
    [6, 0, false],
    [19, 30, false],
  ])("%i:%i は %s", (hour, minute, expected) => {
    expect(isSpruSleepTime(at(hour, minute))).toBe(expected);
  });
});
