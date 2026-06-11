"use client";

import { createContext, useContext } from "react";
import { useJson } from "@/lib/useData";

// 선수 사진 맵(slug → 썸네일 URL)을 1회 로드해 전역 공유.
const PhotosCtx = createContext<Record<string, string>>({});

export function PhotosProvider({ children }: { children: React.ReactNode }) {
  const { data } = useJson<Record<string, string>>("/data/players/photos.json");
  return <PhotosCtx.Provider value={data || {}}>{children}</PhotosCtx.Provider>;
}

export const usePhotos = () => useContext(PhotosCtx);
