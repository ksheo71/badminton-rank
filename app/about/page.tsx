"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card, SectionTitle } from "@/components/ui";

const FALLBACK_URL = "https://badminton.myazit.kr";

export default function AboutPage() {
  const [svg, setSvg] = useState("");
  const [url, setUrl] = useState(FALLBACK_URL);

  useEffect(() => {
    const u = window.location.origin || FALLBACK_URL;
    setUrl(u);
    QRCode.toString(u, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#061b31", light: "#ffffff" },
    })
      .then(setSvg)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle sub="세계 배드민턴 랭킹·대회 정보와 서울 구청장배를 한눈에. 위키 데이터 기반, 매일 갱신.">
        About · 셔틀랭크
      </SectionTitle>

      <Card className="flex flex-col items-center p-5 sm:p-8">
        <p className="mb-4 text-center text-sm text-muted">휴대폰 카메라로 QR을 스캔해 접속하세요</p>
        {/* QR — 모바일에서 페이지 폭에 꽉 차게 */}
        <div
          className="w-full max-w-[460px] [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
          aria-label={`${url} QR 코드`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <a
          href={url}
          className="mt-5 break-all text-center text-base font-medium text-accent hover:underline"
        >
          {url}
        </a>
      </Card>

      <Card className="p-5 text-sm leading-relaxed text-text-dim">
        <p>
          셔틀랭크는 위키피디아·위키데이터의 공개 데이터를 야간 배치로 모아 보여주는 비영리 대시보드입니다. 순위는 BWF 공식 주간 랭킹이 아니라 대회 결과 기반의 시즌 성적 순위입니다.
        </p>
      </Card>
    </div>
  );
}
