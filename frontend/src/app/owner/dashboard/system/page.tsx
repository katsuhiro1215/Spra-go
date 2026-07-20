import { Badge } from "@/components/ui/badge";
import { stats, systemStatuses } from "./data";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">システム管理</h1>
        <p className="text-sm text-muted-foreground">アプリ全体の状態</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border p-4"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {systemStatuses.map((status) => (
          <div
            key={status.label}
            className="flex items-center justify-between px-4 py-3"
          >
            <p className="text-sm font-medium">{status.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {status.value}
              </span>
              <Badge variant={status.ok ? "outline" : "destructive"}>
                {status.ok ? "正常" : "異常"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
