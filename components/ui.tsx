"use client";

import Link from "next/link";
import type { CategoryKey } from "@/lib/types";
import { CATEGORY_LABEL, CATEGORY_ORDER, CATEGORY_SHORT, flag, countryName } from "@/lib/format";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-bg-card ${className}`}>{children}</div>
  );
}

export function RankChange({ change, isNew }: { change: number; isNew?: boolean }) {
  if (isNew) return <span className="text-xs font-medium text-accent-2">NEW</span>;
  if (change === 0) return <span className="text-xs text-text-dim">–</span>;
  const up = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-up" : "text-down"}`}>
      {up ? "▲" : "▼"} {Math.abs(change)}
    </span>
  );
}

export function CountryTag({ code, showName = false }: { code: string; showName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden>{flag(code)}</span>
      <span className="text-text-dim">{showName ? countryName(code) : code}</span>
    </span>
  );
}

export function CategoryTabs({
  value,
  onChange,
  long = false,
}: {
  value: CategoryKey;
  onChange: (c: CategoryKey) => void;
  long?: boolean;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-md border border-border bg-bg-elev p-1">
      {CATEGORY_ORDER.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            value === c ? "bg-accent text-white font-medium" : "text-text-dim hover:text-text"
          }`}
        >
          {long ? CATEGORY_LABEL[c] : CATEGORY_SHORT[c]}
        </button>
      ))}
    </div>
  );
}

export function Spinner({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-dim">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-accent" />
      {label}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
      데이터를 불러오지 못했습니다: {message}
      <div className="mt-1 text-text-dim">
        배치를 먼저 실행했는지 확인하세요: <code className="text-text">npm run batch</code>
      </div>
    </div>
  );
}

export function PlayerLinks({ players }: { players: { id: string; name: string }[] }) {
  return (
    <span>
      {players.map((p, i) => (
        <span key={p.id}>
          {i > 0 && <span className="text-text-dim"> / </span>}
          <Link href={`/players/${p.id}`} className="hover:text-accent hover:underline">
            {p.name}
          </Link>
        </span>
      ))}
    </span>
  );
}

export function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="gradient-text text-2xl font-light tracking-tight">{children}</h2>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}
