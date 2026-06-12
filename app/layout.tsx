import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { PhotosProvider } from "@/components/Photos";
import SWRegister from "@/components/SWRegister";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "셔틀랭크 · 세계 배드민턴 랭킹 대시보드",
  description: "세계 배드민턴 상위권 선수들의 현재/연도별 랭킹과 대회 결과를 한눈에.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "셔틀랭크", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#533afd",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={inter.variable}>
      <body className="min-h-screen bg-bg text-text antialiased">
        <SWRegister />
        <PhotosProvider>
          <Navbar />
          <main className="mx-auto max-w-6xl px-6 py-12">{children}</main>
        <footer className="border-t border-border bg-paper">
          <div className="mx-auto max-w-6xl px-6 py-12 text-xs text-muted">
            셔틀랭크 · 데이터 출처: 위키피디아 (BWF World Tour) · 순위는 대회 결과 기반 시즌 성적 순위(공식 주간 랭킹 아님) · 야간 배치로 매일 갱신
          </div>
        </footer>
        </PhotosProvider>
      </body>
    </html>
  );
}
