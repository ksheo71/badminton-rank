"use client";

import { useEffect, useState } from "react";

// public/data/* 의 JSON을 클라이언트에서 fetch.
// cron이 파일을 덮어쓰므로 cache: "no-store" 로 항상 최신을 읽는다.
export function useJson<T>(path: string | null): { data: T | null; error: string | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(path, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((d) => {
        if (alive) setData(d as T);
      })
      .catch((e) => {
        if (alive) setError(String(e.message || e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  return { data, error, loading };
}
