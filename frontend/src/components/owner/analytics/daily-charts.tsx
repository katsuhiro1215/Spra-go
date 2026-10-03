"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatDay, formatMinutes, formatRate, type DailyRow } from "@/lib/analytics";

const AXIS = { fontSize: 11, fill: "var(--viz-text-2)" } as const;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="h-56">{children}</div>
    </div>
  );
}

/**
 * 日ごとの推移(docs/design/2026-10-03-analytics-design.md 6-1)。単位が違う数字は、1つのグラフに軸を2つ置かず、
 * 別のグラフに分ける(人数・解いた問題数・遊んだ時間)。下の表で、同じ数字を読める
 */
export function DailyCharts({ rows }: { rows: DailyRow[] }) {
  const empty = rows.every((r) => r.answers === 0 && r.active_players === 0 && r.opened_players === 0 && r.play_minutes === 0);

  if (empty) {
    return <p className="text-sm text-muted-foreground">まだデータがありません。</p>;
  }

  const data = rows.map((r) => ({ ...r, label: formatDay(r.date) }));
  const grid = <CartesianGrid stroke="var(--viz-grid)" strokeDasharray="3 3" vertical={false} />;
  const tooltip = <Tooltip cursor={{ stroke: "var(--viz-text-2)", strokeWidth: 1 }} contentStyle={{ fontSize: 12 }} />;

  return (
    <div className="viz-root flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="遊んだ人数・開いた人数">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              {grid}
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              {tooltip}
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="active_players" name="遊んだ人数" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="opened_players" name="開いた人数" stroke="var(--series-3)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="解いた問題数">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              {grid}
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              {tooltip}
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="answers" name="解いた問題数" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="遊んだ時間(分・全員の合計)">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              {grid}
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
              {tooltip}
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="play_minutes" name="遊んだ時間(分)" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium">表で見る</summary>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">日付</th>
                <th className="px-2 py-2 font-medium">遊んだ人数</th>
                <th className="px-2 py-2 font-medium">開いた人数</th>
                <th className="px-2 py-2 font-medium">解いた問題数</th>
                <th className="px-2 py-2 font-medium">正解率</th>
                <th className="px-2 py-2 font-medium">遊んだ時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.date}>
                  <td className="px-4 py-1.5">{r.date}</td>
                  <td className="px-2 py-1.5">{r.active_players}</td>
                  <td className="px-2 py-1.5">{r.opened_players}</td>
                  <td className="px-2 py-1.5">{r.answers}</td>
                  <td className="px-2 py-1.5">{formatRate(r.accuracy)}</td>
                  <td className="px-2 py-1.5">{formatMinutes(r.play_minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
