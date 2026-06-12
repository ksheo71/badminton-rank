"use client";

import { useEffect } from "react";

// PWA 서비스워커 등록 (설치 가능 + 오프라인). 프로덕션에서만 등록.
export default function SWRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
