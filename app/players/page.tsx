"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useJson } from "@/lib/useData";
import type { PlayerIndexItem } from "@/lib/types";
import { CATEGORY_SHORT, countryName, flag } from "@/lib/format";
import { Card, Spinner, ErrorBox, SectionTitle } from "@/components/ui";
import { Avatar } from "@/components/Avatar";

export default function PlayersPage() {
  const { data, error, loading } = useJson<PlayerIndexItem[]>("/data/players/index.json");
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<"all" | "M" | "F">("all");
  const [country, setCountry] = useState("all");
  const [limit, setLimit] = useState(60);

  const countries = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map((p) => p.country))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.filter((p) => {
      if (gender !== "all" && p.gender !== gender) return false;
      if (country !== "all" && p.country !== country) return false;
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data, q, gender, country]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || "선수 데이터 없음"} />;

  return (
    <div className="space-y-6">
      <SectionTitle sub={`총 ${data.length}명 · 최고 순위 기준 정렬`}>선수</SectionTitle>

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="선수 이름 검색…"
          className="min-w-48 flex-1 rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as "all" | "M" | "F")}
          className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="all">성별 전체</option>
          <option value="M">남자</option>
          <option value="F">여자</option>
        </select>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-lg border border-border bg-bg-elev px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="all">국가 전체</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryName(c)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-text-dim">{filtered.length}명 검색됨</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, limit).map((p) => (
          <Link key={p.id} href={`/players/${p.id}`}>
            <Card className="flex items-center justify-between p-4 transition-colors hover:border-accent/50 hover:bg-bg-elev">
              <div className="flex items-center gap-3">
                <Avatar id={p.id} name={p.name} country={p.country} size={44} />
                <div>
                  <div className="flex items-center gap-1.5 font-medium">
                    {p.name}
                    <span className="text-sm" aria-hidden>{flag(p.country)}</span>
                  </div>
                  <div className="text-xs text-text-dim">
                    {countryName(p.country)} · {p.categories.map((c) => CATEGORY_SHORT[c]).join(", ")}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-dim">최고</div>
                <div className="font-bold text-accent">#{p.bestRank}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length > limit && (
        <div className="text-center">
          <button
            onClick={() => setLimit((l) => l + 60)}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-dim hover:text-text"
          >
            더 보기 ({filtered.length - limit}명)
          </button>
        </div>
      )}
    </div>
  );
}
