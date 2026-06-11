"use client";

import { useState } from "react";
import Link from "next/link";
import { useJson } from "@/lib/useData";
import type { CategoryKey, Meta, RankingFile, PlayerIndexItem, PlayerProfile } from "@/lib/types";
import { CATEGORY_LABEL, formatDate, formatNumber, flag, countryName } from "@/lib/format";
import { Card, CategoryTabs, Spinner, ErrorBox, SectionTitle, CountryTag } from "@/components/ui";
import { usePhotos } from "@/components/Photos";
import RankingsTable from "@/components/RankingsTable";

export default function HomePage() {
  const { data: meta, error, loading } = useJson<Meta>("/data/meta.json");
  const [cat, setCat] = useState<CategoryKey>("MS");
  const { data: ranking } = useJson<RankingFile>(`/data/rankings/${cat}.json`);
  const { data: index } = useJson<PlayerIndexItem[]>("/data/players/index.json");
  const photos = usePhotos();
  // 히어로용 안세영 경기 액션샷(위키미디어 커먼스) — 기본 P18(포즈 사진) 대신 사용
  const heroPhoto: string =
    photos["w-an-se-young-hero"] ||
    "https://commons.wikimedia.org/wiki/Special:FilePath/2019_Chinese_Taipei_Open_02.jpg?width=600";
  const { data: anProf } = useJson<PlayerProfile>("/data/players/w-an-se-young.json");
  const anRank = anProf?.currentRankings?.WS;

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
      <section className="relative overflow-hidden">
        <div className="hero-halo pointer-events-none absolute -top-10 right-0 h-[460px] w-[68%]" aria-hidden />
        <div className="relative grid items-center gap-10 py-6 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.12em] text-muted">
              BWF World Tour · {meta.years[meta.years.length - 1]}–{meta.currentYear}
            </p>
            <h1 className="gradient-text text-4xl font-light leading-[1.07] tracking-tight sm:text-5xl">
              세계 배드민턴
              <br />
              랭킹 대시보드
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-text-dim">
              상위권 선수들의 시즌 성적 순위, 연도별 랭킹, 대회·경기 결과를 한눈에. 위키 데이터를 야간 배치로 매일 갱신합니다.
            </p>
            <p className="mt-4 text-xs text-muted">
              최종 갱신 {formatDate(meta.generatedAt)} · 출처 {meta.source === "mock" ? "데모(목업)" : "위키피디아·위키데이터"}
            </p>
          </div>

          {/* 안세영 히어로 이미지 */}
          <div className="flex justify-center md:justify-end">
            <Link href="/players/w-an-se-young" className="group relative inline-block">
              <div
                className="absolute -inset-8 rounded-full opacity-80 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(127,125,252,0.6), rgba(244,75,204,0.35) 45%, rgba(255,187,0,0.15) 65%, transparent 75%)",
                }}
                aria-hidden
              />
              <div
                className="relative h-60 w-60 overflow-hidden rounded-full ring-[6px] ring-paper sm:h-72 sm:w-72"
                style={{ boxShadow: "var(--shadow-pop)" }}
              >
                {heroPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroPhoto}
                    alt="안세영 경기 장면"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ objectPosition: "center 20%" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-bg-elev text-6xl">🏸</div>
                )}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-paper/90 px-4 py-2 text-sm shadow-sm backdrop-blur">
                <span className="mr-1">{flag("KR")}</span>
                <span className="font-semibold text-text">안세영</span>
                <span className="ml-2 text-muted">여자 단식{anRank ? ` 세계 ${anRank}위` : ""}</span>
              </div>
            </Link>
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
