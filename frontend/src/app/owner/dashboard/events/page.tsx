import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type EventStatus, events } from "./data";

const statusVariant: Record<
  EventStatus,
  "default" | "outline" | "secondary"
> = {
  開催中: "default",
  開催予定: "outline",
  終了: "secondary",
};

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">イベント管理</h1>
          <p className="text-sm text-muted-foreground">全{events.length}件</p>
        </div>
        <Button>+ イベントを追加</Button>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {event.startDate} 〜 {event.endDate}
              </p>
            </div>

            <Badge variant={statusVariant[event.status]}>
              {event.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
