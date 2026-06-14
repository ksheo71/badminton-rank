"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/rankings", label: "랭킹" },
  { href: "/players", label: "선수" },
  { href: "/matches", label: "대회·경기" },
  { href: "/competition", label: "구청장배" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-paper/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-[17px] font-medium tracking-tight text-text">
          <span className="text-xl">🏸</span>
          <span>셔틀랭크</span>
        </Link>
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors ${
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
