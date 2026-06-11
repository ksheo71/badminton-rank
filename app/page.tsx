"use client";

import { useState } from "react";
import Link from "next/link";
import { useJson } from "@/lib/useData";
import type { CategoryKey, Meta, RankingFile, PlayerIndexItem } from "@/lib/types";
import { CATEGORY_LABEL, formatDate, formatNumber, flag, countryName } from "@/lib/format";
import { Card, CategoryTabs, Spinner, ErrorBox, SectionTitle, CountryTag } from "@/components/ui";
import RankingsTable from "@/components/RankingsTable";

export default function HomePage() {
  const { data: meta, error, loading } = useJson<Meta>("/data/meta.json");
  const [cat, setCat] = useState<CategoryKey>("MS");
  const { data: ranking } = useJson<RankingFile>(`/data/rankings/${cat}.json`);
  const { data: index } = useJson<PlayerIndexItem[]>("/data/players/index.json");

  if (loading) return <Spinner />;
  if (error || !meta) return <ErrorBox message={error || "메타 데이터 없음"} />;

  // 국가별 톱100 보유 선수 수 (랭킹 다양성 지표)
  const countryCount: Record<string, number> = {};
  index?.slice(0, 200).forEach((p) => {
    if (p.bestRank <= 50) countryCount[p.country] = (countryCount[p.country] || 0) + 1;
  });
  const topCountries = Object.entries(countryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-bg-card to-bg-elev p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">세계 배드민턴 랭킹 대시보드</h1>
            <p className="mt-2 max-w-xl text-sm text-text-dim">
              상위권 선수들의 시즌 성적 순위, 연도별 랭킹, 대회·경기 결과를 한눈에. 위키피디아 BWF World Tour 데이터를 야간 배치로 매일 갱신합니다.
            </p>
          </div>
          <div className="text-right text-xs text-text-dim">
            <div>최종 갱신</div>
            <div className="text-sm font-medium text-text">{formatDate(meta.generatedAt)}</div>
            <div className="mt-1">출처: {meta.source === "mock" ? "데모(목업)" : meta.source}</div>
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="추적 선수" value={formatNumber(meta.playerCount)} suffix="명" />
        <Stat label="종목" value={String(meta.categories.length)} suffix="개" />
        <Stat label="기록 연도" value={`${meta.years[meta.years.length - 1]}–${meta.years[0]}`} />
        <Stat label={`${meta.currentYear} 대회`} value={String(meta.tournamentCountThisYear)} suffix="개" />
      </section>

      {/* Top countries */}
      {topCountries.length > 0 && (
        <Card className="p-5">
          <SectionTitle sub="각 종목 톱50 진입 선수 보유 수 기준">국가별 강세</SectionTitle>
          <div className="flex flex-wrap gap-3">
            {topCountries.map(([code, n]) => (
              <div key={code} className="flex items-center gap-2 rounded-lg border border-border bg-bg-elev px-3 py-2">
                <span className="text-lg">{flag(code)}</span>
                <span className="text-sm font-medium">{countryName(code)}</span>
                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-xs font-bold text-accent">{n}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Current ranking by category */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle sub={`${CATEGORY_LABEL[cat]} · 최신 시즌(${meta.currentYear}) 톱 10`}>시즌 성적 순위</SectionTitle>
          <CategoryTabs value={cat} onChange={setCat} />
        </div>
        {ranking ? <RankingsTable entries={ranking.entries} limit={10} /> : <Spinner />}
        <div className="mt-4 text-right">
          <Link href="/rankings" className="text-sm text-accent hover:underline">
            전체 랭킹 보기 →
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-text-dim">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-text-dim">{suffix}</span>}
      </div>
    </Card>
  );
}
