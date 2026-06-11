import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "셔틀랭크 · 세계 배드민턴 랭킹 대시보드",
  description: "세계 배드민턴 상위권 선수들의 현재/연도별 랭킹과 대회 결과를 한눈에.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-bg text-text antialiased">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-text-dim">
          셔틀랭크 · 데이터 출처: 위키피디아 (BWF World Tour) · 순위는 대회 결과 기반 시즌 성적 순위(공식 주간 랭킹 아님) · 야간 배치로 매일 갱신
        </footer>
      </body>
    </html>
  );
}
