"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useJson } from "@/lib/useData";
import type { CategoryKey, PlayerProfile } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_SHORT, countryName, flag, formatNumber } from "@/lib/format";
import { Card, Spinner, ErrorBox } from "@/components/ui";
import { Avatar, AvatarGroup } from "@/components/Avatar";
import RankingChart from "@/components/RankingChart";

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const baseId = params.id;
  // 클릭한 선수(본인) 프로필 — 복식 파트너 목록의 기준
  const { data: base } = useJson<PlayerProfile>(`/data/players/${baseId}.json`);

  // 페어 멤버: [본인, ...복식 파트너]
  const members = useMemo(() => {
    const list: { id: string; name: string; category?: CategoryKey }[] = [
      { id: baseId, name: base?.name || "" },
    ];
    for (const pt of base?.partners || []) {
      if (!list.some((m) => m.id === pt.id)) list.push({ id: pt.id, name: pt.name, category: pt.category });
    }
    return list;
  }, [baseId, base]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [baseId]);
  const safeIdx = Math.min(idx, members.length - 1);
  const isPair = members.length > 1;
  const activeId = members[safeIdx]?.id || baseId;

  // 현재 보고 있는 선수 프로필
  const { data: p, error, loading } = useJson<PlayerProfile>(`/data/players/${activeId}.json`);

  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(members.length - 1, i + d)));
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx < -50) go(1);
    else if (dx > 50) go(-1);
  };

  if (error) return <ErrorBox message={error} />;

  return (
    <div className="space-y-6">
      <Link href="/players" className="text-sm text-text-dim hover:text-text">
        ← 선수 목록
      </Link>

      {/* 복식 페어 전환 바 */}
      {isPair && (
        <Card className="flex items-center gap-2 p-2">
          <button
            onClick={() => go(-1)}
            disabled={safeIdx === 0}
            aria-label="이전 선수"
            className="rounded-md px-2 py-1 text-lg text-text-dim disabled:opacity-30 hover:text-accent"
          >
            ‹
          </button>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5">
            {members.map((m, i) => (
              <button
                key={m.id}
                onClick={() => setIdx(i)}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors ${
                  i === safeIdx ? "bg-periwinkle text-accent" : "text-text-dim hover:bg-bg-elev"
                }`}
              >
                <Avatar id={m.id} name={m.name} country={base?.country || ""} size={28} />
                <span className="text-sm font-medium">{m.name || "…"}</span>
                {m.category && <span className="text-[10px] text-muted">{CATEGORY_SHORT[m.category]}</span>}
              </button>
            ))}
          </div>
          <button
            onClick={() => go(1)}
            disabled={safeIdx === members.length - 1}
            aria-label="다음 선수"
            className="rounded-md px-2 py-1 text-lg text-text-dim disabled:opacity-30 hover:text-accent"
          >
            ›
          </button>
        </Card>
      )}
      {isPair && (
        <p className="-mt-3 text-center text-xs text-muted">복식 페어 · 좌우로 스와이프해 파트너를 볼 수 있어요</p>
      )}

      {/* 스와이프 영역 (선택된 선수 프로필) */}
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {loading || !p ? <Spinner /> : <PlayerBody p={p} />}
      </div>
    </div>
  );
}

function PlayerBody({ p }: { p: PlayerProfile }) {
  const hasAge = p.birthYear > 0;
  const age = new Date().getFullYear() - p.birthYear;
  const titleRate = p.stats.matchesPlayed ? Math.round((p.stats.titles / p.stats.matchesPlayed) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar id={p.id} name={p.name} country={p.country} size={84} />
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-light tracking-tight text-text">
                {p.name}
                <span className="text-2xl" aria-hidden>
                  {flag(p.country)}
                </span>
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

        {/* 복식 파트너 */}
        {p.partners && p.partners.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-xs text-muted">복식 파트너</span>
            {p.partners.map((pt) => (
              <Link
                key={pt.id}
                href={`/players/${pt.id}`}
                className="flex items-center gap-1.5 rounded-full border border-border bg-bg-elev py-1 pl-1 pr-3 text-sm hover:border-accent/50"
              >
                <Avatar id={pt.id} name={pt.name} country={p.country} size={24} />
                {pt.name}
                <span className="text-[10px] text-muted">{CATEGORY_SHORT[pt.category]}</span>
              </Link>
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
