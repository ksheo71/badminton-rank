"use client";

import type { RankingEntry, HistoryEntry } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import { CountryTag, PlayerLinks, RankChange } from "./ui";

type Row = RankingEntry | HistoryEntry;

function isCurrent(r: Row): r is RankingEntry {
  return (r as RankingEntry).previousRank !== undefined;
}

export default function RankingsTable({
  entries,
  showChange = true,
  limit,
}: {
  entries: Row[];
  showChange?: boolean;
  limit?: number;
}) {
  const rows = limit ? entries.slice(0, limit) : entries;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
            <th className="px-3 py-2 font-medium">순위</th>
            {showChange && <th className="px-2 py-2 font-medium">변동</th>}
            <th className="px-3 py-2 font-medium">선수</th>
            <th className="px-3 py-2 font-medium">국가</th>
            <th className="px-3 py-2 text-right font-medium">점수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const cur = isCurrent(r);
            return (
              <tr key={r.rank} className="border-b border-border/60 transition-colors hover:bg-bg-elev/60">
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-sm font-bold ${
                      r.rank <= 3 ? "bg-accent/15 text-accent" : "text-text"
                    }`}
                  >
                    {r.rank}
                  </span>
                </td>
                {showChange && (
                  <td className="px-2 py-2.5">
                    {cur ? <RankChange change={(r as RankingEntry).change} isNew={(r as RankingEntry).previousRank == null} /> : <span className="text-text-dim">–</span>}
                  </td>
                )}
                <td className="px-3 py-2.5 font-medium">
                  <PlayerLinks players={r.players} />
                </td>
                <td className="px-3 py-2.5">
                  <CountryTag code={r.country} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-text-dim">{formatNumber(r.points)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
