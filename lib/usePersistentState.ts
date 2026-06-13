"use client";

import { useEffect, useRef, useState } from "react";

// localStorage 에 선택값을 저장해 페이지 이동/새로고침 후에도 유지하는 useState.
// SSR 안전: 초기값은 항상 initial(서버 렌더와 일치) → 마운트 후 저장값으로 동기화.
export function usePersistentState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s != null) setValue(JSON.parse(s) as T);
    } catch {
      /* ignore */
    }
    loaded.current = true;
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
