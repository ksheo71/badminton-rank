"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useJson } from "@/lib/useData";
import type { CategoryKey, PlayerProfile } from "@/lib/types";
import { CATEGORY_LABEL, countryName, flag, formatNumber } from "@/lib/format";
import { Card, Spinner, ErrorBox } from "@/components/ui";
import { Avatar, AvatarGroup } from "@/components/Avatar";
import RankingChart from "@/components/RankingChart";

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const { data: p, error, loading } = useJson<PlayerProfile>(`/data/players/${params.id}.json`);

  if (loading) return <Spinner />;
  if (error || !p) return <ErrorBox message={error || "선수를 찾을 수 없습니다"} />;

  const hasAge = p.birthYear > 0;
  const age = new Date().getFullYear() - p.birthYear;
  const titleRate = p.stats.matchesPlayed ? Math.round((p.stats.titles / p.stats.matchesPlayed) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href="/players" className="text-sm text-text-dim hover:text-text">
        ← 선수 목록
      </Link>

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar id={p.id} name={p.name} country={p.country} size={84} />
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-light tracking-tight text-text">
                {p.name}
                <span className="text-2xl" aria-hidden>{flag(p.country)}</span>
              </h1>
              <p className="mt-1 text-sm text-muted">
                {[
                  countryName(p.country),
                  p.gender === "M" ? "남자" : "여자",
                  hasAge ? `${age}세 (${p.birthYear}년생)` : null,
                  p.heightCm ? `${p.heightCm}cm` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-text-dim">최고 순위</div>
            <div className="text-2xl font-bold text-accent">
              #{p.bestRanking.rank}
              <span className="ml-1 text-sm font-normal text-text-dim">{CATEGORY_LABEL[p.bestRanking.category]}</span>
            </div>
          </div>
        </div>

        {/* Current rankings */}
        {Object.keys(p.currentRankings).length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {(Object.entries(p.currentRankings) as [CategoryKey, number][]).map(([c, rank]) => (
              <div key={c} className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm">
                <span className="text-text-dim">{CATEGORY_LABEL[c]}</span>
                <span className="ml-2 font-bold text-text">현재 #{rank}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Stats (결승 기록 기반) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="결승 진출" value={`${formatNumber(p.stats.matchesPlayed)}회`} />
        <StatBox label="우승" value={`${p.stats.titles}회`} accent />
        <StatBox label="준우승" value={`${p.stats.losses}회`} />
        <StatBox label="우승률" value={`${titleRate}%`} />
      </div>

      {/* Ranking trend */}
      <Card className="p-5">
        <h2 className="mb-4 text-lg font-medium">연도별 랭킹 추이</h2>
        <RankingChart history={p.rankingHistory} />
      </Card>

      {/* Recent finals */}
      <Card className="p-5">
        <h2 className="mb-1 text-lg font-medium">최근 결승</h2>
        <p className="mb-4 text-xs text-text-dim">대회 결승 진출 기록 (위키피디아 기준)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-text-dim">
                <th className="px-2 py-2 font-medium">날짜</th>
                <th className="px-2 py-2 font-medium">대회</th>
                <th className="px-2 py-2 font-medium">라운드</th>
                <th className="px-2 py-2 font-medium">상대</th>
                <th className="px-2 py-2 font-medium">결과</th>
                <th className="px-2 py-2 font-medium">스코어</th>
              </tr>
            </thead>
            <tbody>
              {p.recentMatches.map((m, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="px-2 py-2.5 whitespace-nowrap text-text-dim">{m.date}</td>
                  <td className="px-2 py-2.5">{m.tournament}</td>
                  <td className="px-2 py-2.5 text-text-dim">{m.round}</td>
                  <td className="px-2 py-2.5">
                    <span className="flex items-center gap-2">
                      <AvatarGroup
                        players={m.opponent.split(" / ").map((n) => ({ name: n.trim() }))}
                        country={m.opponentCountry}
                        size={24}
                      />
                      {m.opponent}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        m.result === "승" ? "bg-up/15 text-up" : "bg-down/15 text-down"
                      }`}
                    >
                      {m.result}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-text-dim">{m.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-text-dim">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</div>
    </Card>
  );
}
