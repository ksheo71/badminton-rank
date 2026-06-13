"use client";

import { useEffect, useRef, useState } from "react";

// localStorage 에 선택값을 저장해 페이지 이동/새로고침 후에도 유지하는 useState.
// SSR 안전: 초기값은 항상 initial(서버 렌더와 일치) → 마운트 후 저장값으로 동기화.
export function usePersistentState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    const load = () => {
      try {
        const s = localStorage.getItem(key);
        if (s != null) setValue(JSON.parse(s) as T);
      } catch {
        /* ignore */
      }
    };
    load();
    loaded.current = true;
    // bfcache(뒤로가기 스냅샷)로 복원될 때는 effect가 재실행되지 않으므로 pageshow에서 재동기화.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) load();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [key]);

  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };

  return [value, set];
}
