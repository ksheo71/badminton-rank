#!/usr/bin/env node
// 야간 배치 진입점.
//   node scripts/update-data.mjs            # 기본(mock) 소스로 public/data/* 갱신
//   DATA_SOURCE=bwf node scripts/update-data.mjs
//
// 동작: 데이터 소스에서 데이터셋을 생성한 뒤 public/data 하위에 JSON으로 기록한다.
// 프론트엔드는 이 JSON을 fetch 하므로, 매일 이 스크립트만 돌리면 재빌드/재배포 없이
// 최신 데이터가 반영된다. cron 등록 예시는 README.md 참고.

import { mkdir, writeFile, rm, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "data");

async function loadSource() {
  const name = process.env.DATA_SOURCE || "mock";
  // 실데이터 연동 시: scripts/sources/bwf.mjs 를 추가하고 DATA_SOURCE=bwf 로 실행.
  const mod = await import(`./sources/${name}.mjs`);
  return { name, generate: mod.generate };
}

async function writeJson(relPath, data) {
  const full = join(OUT, relPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, JSON.stringify(data));
}

async function main() {
  const t0 = Date.now();
  const { name, generate } = await loadSource();
  const today = new Date();
  console.log(`[batch] source=${name} date=${today.toISOString()}`);

  const ds = await generate({ today }); // 소스가 async(예: wikipedia)일 수 있음

  // 이전 산출물 정리(스테일 방지). 단, OUT 디렉토리 자체는 보존한다 —
  // 운영(Docker)에서 OUT 을 바인드 마운트하므로, 디렉토리를 지웠다 다시 만들면 inode 가
  // 바뀌어 컨테이너 마운트가 끊긴다. 따라서 디렉토리는 유지하고 내부 항목만 비운다.
  await mkdir(OUT, { recursive: true });
  for (const entry of await readdir(OUT)) {
    await rm(join(OUT, entry), { recursive: true, force: true });
  }

  await writeJson("meta.json", ds.meta);

  for (const [cat, file] of Object.entries(ds.rankings)) {
    await writeJson(`rankings/${cat}.json`, file);
  }
  for (const h of ds.history) {
    await writeJson(`history/${h.year}.json`, h);
  }
  for (const m of ds.matches) {
    await writeJson(`matches/${m.year}.json`, m);
  }
  await writeJson("players/index.json", ds.playerIndex);
  for (const p of ds.players) {
    await writeJson(`players/${p.id}.json`, p);
  }

  const ms = Date.now() - t0;
  console.log(
    `[batch] 완료: 선수 ${ds.players.length}명, 연도 ${ds.history.length}개, 대회 ${ds.matches.reduce(
      (s, m) => s + m.tournaments.length,
      0
    )}개 → ${OUT} (${ms}ms)`
  );
}

main().catch((err) => {
  console.error("[batch] 실패:", err);
  process.exit(1);
});
