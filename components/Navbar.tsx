"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/rankings", label: "랭킹" },
  { href: "/players", label: "선수" },
  { href: "/matches", label: "대회·경기" },
  { href: "/competition", label: "구청장배" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-medium tracking-tight text-text">
          <span className="text-xl">🏸</span>
          <span>셔틀랭크</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                isActive(n.href)
                  ? "bg-periwinkle text-accent"
                  : "text-text-dim hover:bg-bg hover:text-text"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
