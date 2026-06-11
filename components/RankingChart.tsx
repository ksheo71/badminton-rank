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

// 그라데이션 팔레트(DESIGN 제어 색): iris → magenta → ember → solar → lumen
const COLORS: Record<CategoryKey, string> = {
  MS: "#533afd",
  WS: "#f72df3",
  MD: "#ff6118",
  WD: "#ffbb00",
  XD: "#8087ff",
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
          <CartesianGrid stroke="#e5edf5" strokeDasharray="3 3" />
          <XAxis dataKey="year" stroke="#64748d" fontSize={12} tickLine={false} />
          <YAxis
            reversed
            domain={[1, "dataMax"]}
            allowDecimals={false}
            stroke="#64748d"
            fontSize={12}
            tickLine={false}
            width={36}
            label={{ value: "순위", angle: -90, position: "insideLeft", fill: "#64748d", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #dce5f0",
              borderRadius: 4,
              fontSize: 12,
              boxShadow: "rgba(50, 50, 93, 0.12) 0px 16px 32px 0px",
            }}
            labelStyle={{ color: "#061b31" }}
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
