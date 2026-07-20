export type EventStatus = "開催中" | "開催予定" | "終了";

export type Event = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
};

export const events: Event[] = [
  {
    id: "1",
    title: "夏休みスペシャルイベント",
    startDate: "2026-07-15",
    endDate: "2026-08-31",
    status: "開催中",
  },
  {
    id: "2",
    title: "世界遺産ウィーク",
    startDate: "2026-09-01",
    endDate: "2026-09-07",
    status: "開催予定",
  },
  {
    id: "3",
    title: "ハロウィンイベント",
    startDate: "2026-10-25",
    endDate: "2026-10-31",
    status: "開催予定",
  },
  {
    id: "4",
    title: "春の国旗チャレンジ",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    status: "終了",
  },
];
