"use client";

import { useState } from "react";
import { useJson } from "@/lib/useData";
import type { CategoryKey, Meta, MatchesFile, Tournament } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_ORDER, flag } from "@/lib/format";
import { Card, Spinner, ErrorBox, SectionTitle } from "@/components/ui";

export default function MatchesPage() {
  const { data: meta, error, loading } = useJson<Meta>("/data/meta.json");
  const [year, setYear] = useState<number | null>(null);
  const activeYear = year ?? meta?.currentYear ?? null;
  const { data: matches, loading: mLoading } = useJson<MatchesFile>(
    activeYear ? `/data/matches/${activeYear}.json` : null
  );

  if (loading) return <Spinner />;
  if (error || !meta) return <ErrorBox message={error || "메타 데이터 없음"} />;

  return (
    <div className="space-y-6">
      <SectionTitle sub="연도를 선택하면 해당 시즌의 주요 대회와 종목별 결승 결과를 볼 수 있습니다.">
        대회·경기
      </SectionTitle>

      <div className="flex flex-wrap gap-2">
        {meta.years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeYear === y ? "bg-accent font-medium text-white" : "border border-border bg-paper text-text-dim hover:text-text"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {mLoading || !matches ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-dim">{matches.year} 시즌 · 대회 {matches.tournaments.length}개</p>
          {matches.tournaments.map((t) => (
            <TournamentCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentCard({ t }: { t: Tournament }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{flag(t.country)}</span>
          <div>
            <div className="font-semibold">{t.name}</div>
            <div className="text-xs text-text-dim">
              {[t.location, t.startDate + (t.endDate ? ` ~ ${t.endDate}` : "")].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-accent-2/15 px-2 py-0.5 text-xs font-medium text-accent-2">{t.level}</span>
          <span className="text-text-dim">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-text-dim">
                <th className="px-2 py-1.5 font-medium">종목</th>
                <th className="px-2 py-1.5 font-medium">우승</th>
                <th className="px-2 py-1.5 font-medium">준우승</th>
                <th className="px-2 py-1.5 font-medium">스코어</th>
              </tr>
            </thead>
            <tbody>
              {[...t.finals]
                .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category))
                .map((f) => (
                  <tr key={f.category} className="border-t border-border/60">
                    <td className="px-2 py-2 whitespace-nowrap text-text-dim">{CATEGORY_LABEL[f.category as CategoryKey]}</td>
                    <td className="px-2 py-2 font-medium">
                      <span className="mr-1">{flag(f.champion.country)}</span>
                      {f.champion.players.join(" / ")}
                    </td>
                    <td className="px-2 py-2 text-text-dim">
                      <span className="mr-1">{flag(f.runnerUp.country)}</span>
                      {f.runnerUp.players.join(" / ")}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-text-dim">{f.score}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
