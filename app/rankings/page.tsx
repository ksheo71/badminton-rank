"use client";

import { useState } from "react";
import { useJson } from "@/lib/useData";
import type { CategoryKey, Meta, RankingFile, HistoryFile } from "@/lib/types";
import { CATEGORY_LABEL, formatDate } from "@/lib/format";
import { Card, CategoryTabs, Spinner, ErrorBox, SectionTitle } from "@/components/ui";
import RankingsTable from "@/components/RankingsTable";

export default function RankingsPage() {
  const { data: meta, error, loading } = useJson<Meta>("/data/meta.json");
  const [cat, setCat] = useState<CategoryKey>("MS");
  const [year, setYear] = useState<number | "current">("current");

  const current = useJson<RankingFile>(year === "current" ? `/data/rankings/${cat}.json` : null);
  const history = useJson<HistoryFile>(year !== "current" ? `/data/history/${year}.json` : null);

  if (loading) return <Spinner />;
  if (error || !meta) return <ErrorBox message={error || "메타 데이터 없음"} />;

  const entries =
    year === "current" ? current.data?.entries : history.data?.categories[cat];
  const busy = year === "current" ? current.loading : history.loading;

  return (
    <div className="space-y-6">
      <SectionTitle sub="위키피디아 BWF World Tour 대회 결과 기반 시즌 성적 순위 (공식 주간 랭킹 아님). 현재=최신 시즌, 과거=연도별 시즌.">
        랭킹
      </SectionTitle>

      <div className="flex flex-wrap items-center gap-3">
        <CategoryTabs value={cat} onChange={setCat} long />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setYear("current")}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            year === "current" ? "bg-accent-2 font-semibold text-bg" : "border border-border text-text-dim hover:text-text"
          }`}
        >
          현재
        </button>
        {meta.years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              year === y ? "bg-accent-2 font-semibold text-bg" : "border border-border text-text-dim hover:text-text"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">
            {CATEGORY_LABEL[cat]} · {year === "current" ? "최신 시즌 순위" : `${year} 시즌 순위`}
          </h3>
          {year === "current" && current.data && (
            <span className="text-xs text-text-dim">갱신 {formatDate(current.data.updatedAt)}</span>
          )}
        </div>
        {busy || !entries ? (
          <Spinner />
        ) : (
          <RankingsTable entries={entries} showChange={year === "current"} />
        )}
      </Card>
    </div>
  );
}
