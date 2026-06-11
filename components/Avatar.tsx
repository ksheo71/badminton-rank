"use client";

import { flag, playerSlug } from "@/lib/format";
import { usePhotos } from "./Photos";

// 항상 정원(고정 정사각 + object-cover + rounded-full). 사진 없으면 국기 폴백.
export function Avatar({
  id,
  name,
  country,
  size = 36,
  className = "",
}: {
  id?: string;
  name?: string;
  country: string;
  size?: number;
  className?: string;
}) {
  const photos = usePhotos();
  const key = id || (name ? playerSlug(name) : undefined);
  const url = key ? photos[key] : undefined;
  return (
    <span
      title={name}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-elev ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name || ""}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-cover"
          style={{ objectPosition: "center top" }}
        />
      ) : (
        <span aria-hidden style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>
          {flag(country)}
        </span>
      )}
    </span>
  );
}

// 복식: 선수 여러 명을 살짝 겹쳐 표시.
export function AvatarGroup({
  players,
  country,
  size = 28,
}: {
  players: { id?: string; name: string }[];
  country: string;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center -space-x-2">
      {players.map((p, i) => (
        <Avatar
          key={(p.id || p.name) + i}
          id={p.id}
          name={p.name}
          country={country}
          size={size}
          className="ring-2 ring-bg-card"
        />
      ))}
    </span>
  );
}
