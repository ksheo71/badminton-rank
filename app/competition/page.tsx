"use client";

import { useMemo, useState } from "react";
import { useJson } from "@/lib/useData";
import { Card, Spinner, ErrorBox, SectionTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";

interface Competition {
  id: string;
  name: string;
  district: string;
  type: "구청장배" | "협회장배" | "구 대회";
  startDate: string | null;
  endDate: string | null;
  venue: string;
  region: string;
  image: string;
  status: "예정" | "진행중" | "종료" | "미정";
  url: string;
}
interface CompetitionsFile {
  generatedAt: string;
  source: string;
  competitions: Competition[];
}

const TYPES = ["전체", "구청장배", "협회장배", "구 대회"] as const;

function fmtRange(s: string | null, e: string | null): string {
  if (!s) return "일정 미정";
  const d = (iso: string) => iso.slice(0, 10).replace(/-/g, ".");
  const ss = d(s);
  if (!e || e.slice(0, 10) === s.slice(0, 10)) return ss;
  return `${ss} ~ ${e.slice(5, 10).replace(/-/g, ".")}`;
}

const STATUS_STYLE: Record<string, string> = {
  진행중: "bg-up/15 text-up",
  예정: "bg-accent/12 text-accent",
  종료: "bg-bg-elev text-muted",
  미정: "bg-bg-elev text-muted",
};
const TYPE_STYLE: Record<string, string> = {
  구청장배: "bg-accent/12 text-accent",
  협회장배: "bg-periwinkle text-accent-2",
  "구 대회": "bg-bg-elev text-text-dim",
};

export default function CompetitionPage() {
  const { data, error, loading } = useJson<CompetitionsFile>("/data/competitions.json");
  const [type, setType] = useState<(typeof TYPES)[number]>("전체");
  const [district, setDistrict] = useState("all");
  const [q, setQ] = useState("");

  const districts = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.competitions.map((c) => c.district))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim();
    return data.competitions.filter((c) => {
      if (type !== "전체" && c.type !== type) return false;
      if (district !== "all" && c.district !== district) return false;
      if (needle && !c.name.includes(needle)) return false;
      return true;
    });
  }, [data, type, district, q]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || "대회 데이터 없음"} />;

  const counts = {
    구청장배: data.competitions.filter((c) => c.type === "구청장배").length,
    협회장배: data.competitions.filter((c) => c.type === "협회장배").length,
  };

  return (
    <div className="space-y-6">
      <SectionTitle sub={`서울 자치구 배드민턴 대회 (구청장배·협회장배 등). 출처: 콕콕(cockcock) · 매일 갱신 · ${formatDate(data.generatedAt)} 기준`}>
        서울 구 배드민턴 대회
      </SectionTitle>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="전체" value={data.competitions.length} />
        <Mini label="구청장배" value={counts.구청장배} accent />
        <Mini label="협회장배" value={counts.협회장배} />
        <Mini label="자치구" value={districts.length} />
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-bg-elev p-1">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                type === t ? "bg-accent font-medium text-white" : "text-text-dim hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="all">자치구 전체</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="대회명 검색…"
          className="min-w-44 flex-1 rounded-md border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <p className="text-sm text-muted">{filtered.length}개 대회</p>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">
          조건에 맞는 대회가 없습니다. 콕콕 목록의 임박/최근 대회 기준이라, 시기에 따라 건수가 달라집니다.
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <a key={c.id} href={c.url} target="_blank" rel="noopener noreferrer">
              <Card className="flex items-stretch gap-4 overflow-hidden p-0 transition-colors hover:border-accent/50">
                <div className="h-[104px] w-[78px] shrink-0 overflow-hidden border-r border-border bg-bg-elev">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">🏸</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center gap-1.5 py-3 pr-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={TYPE_STYLE[c.type]}>{c.type}</Badge>
                    <Badge className="bg-bg-elev text-text-dim">{c.district}</Badge>
                    <Badge className={STATUS_STYLE[c.status]}>{c.status}</Badge>
                  </div>
                  <div className="font-medium text-text">{c.name}</div>
                  <div className="text-sm text-muted">
                    📅 {fmtRange(c.startDate, c.endDate)}
                    {c.venue && <span className="ml-3">📍 {c.venue}</span>}
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-accent" : ""}`}>{value}</div>
    </Card>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}
