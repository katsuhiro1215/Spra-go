export type TimeOfDay = "morning" | "day" | "evening" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";

// 端末の時計で決める(設計書7章)。境目の時刻はここだけで持つ
export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "evening";
  return "night";
}

// 今は日本の季節に合わせている。南半球の国は海外展開のときに見直す(TASKS.md)
export function getSeason(date: Date): Season {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/** スプルが寝ている時間(22:00〜5:59)。夜の19〜22時は起きている */
export function isSpruSleepTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}
