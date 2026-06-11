"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CategoryKey, RankingHistoryPoint } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/format";

const COLORS: Record<CategoryKey, string> = {
  MS: "#4ade80",
  WS: "#38bdf8",
  MD: "#f472b6",
  WD: "#fbbf24",
  XD: "#a78bfa",
};

export default function RankingChart({ history }: { history: RankingHistoryPoint[] }) {
  const cats = [...new Set(history.map((h) => h.category))].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
  );
  const years = [...new Set(history.map((h) => h.year))].sort((a, b) => a - b);

  const rows = years.map((year) => {
    const row: Record<string, number | null> = { year };
    for (const c of cats) {
      const pt = history.find((h) => h.year === year && h.category === c);
      row[c] = pt ? pt.rank : null;
    }
    return row;
  });

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-text-dim">연도별 랭킹 이력이 없습니다.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#232c45" strokeDasharray="3 3" />
          <XAxis dataKey="year" stroke="#9aa6c0" fontSize={12} tickLine={false} />
          <YAxis
            reversed
            domain={[1, "dataMax"]}
            allowDecimals={false}
            stroke="#9aa6c0"
            fontSize={12}
            tickLine={false}
            width={36}
            label={{ value: "순위", angle: -90, position: "insideLeft", fill: "#9aa6c0", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#161d31",
              border: "1px solid #232c45",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e6eaf2" }}
            formatter={(v: number, name: string) => [`${v}위`, CATEGORY_LABEL[name as CategoryKey]]}
          />
          <Legend formatter={(name) => CATEGORY_LABEL[name as CategoryKey]} wrapperStyle={{ fontSize: 12 }} />
          {cats.map((c) => (
            <Line
              key={c}
              type="monotone"
              dataKey={c}
              stroke={COLORS[c]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
