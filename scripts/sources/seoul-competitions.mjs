// 서울시 구청장배(구청장기) 배드민턴 대회 정보 수집.
// 소스: 콕콕(cockcock.co.kr) — 대회 목록/상세가 schema.org JSON-LD 로 제공됨(서버 렌더링).
//   1) /tournaments?page=N 의 ItemList(JSON-LD)에서 전체 대회 {name,url} 수집
//   2) 이름이 "○○구청장배/기" 이고 ○○ 가 서울 25개 구이면 후보로 선별
//   3) 각 상세 /tournaments/{id} 의 SportsEvent(JSON-LD)에서 기간/장소/포스터 추출
//
// 공개 일정 페이지를 하루 1회 가볍게 조회(UA 명시, 요청 간 지연). 구조가 바뀌면 빈 배열 반환.

const BASE = "https://cockcock.co.kr";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEOUL_GU = [
  "강남", "강동", "강북", "강서", "관악", "광진", "구로", "금천", "노원", "도봉",
  "동대문", "동작", "마포", "서대문", "서초", "성동", "성북", "송파", "양천",
  "영등포", "용산", "은평", "종로", "중", "중랑",
];

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.text();
}

function ldJsonBlocks(html) {
  const blocks = [];
  const re = /<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      /* skip */
    }
  }
  return blocks;
}

// 이름에서 서울 구 단위 대회 판별 → {district, type} (아니면 null)
//   type: "구청장배"(구청장배/기) | "협회장배"(협회장배/기) | "구 대회"(기타 ○○구 대회)
function seoulMeta(name) {
  const gu = SEOUL_GU.find((g) => name.includes(`${g}구`));
  if (!gu) return null;
  let type = "구 대회";
  if (new RegExp(`${gu}구청장\\s*[배기]`).test(name)) type = "구청장배";
  else if (/협회장\s*[배기]/.test(name)) type = "협회장배";
  return { district: `${gu}구`, type };
}

function deriveStatus(start, end, today) {
  const s = start ? start.slice(0, 10) : null;
  const e = (end || start || "").slice(0, 10);
  const t = today.toISOString().slice(0, 10);
  if (s && t < s) return "예정";
  if (e && t > e) return "종료";
  return "진행중";
}

export async function fetchSeoulCompetitions({ today } = { today: new Date() }) {
  // 1) 목록 페이지 순회 → 전체 {name,url}
  const all = new Map(); // url -> name
  for (let page = 1; page <= 12; page++) {
    let html;
    try {
      html = await get(`${BASE}/tournaments?page=${page}`);
    } catch {
      break;
    }
    let added = 0;
    for (const b of ldJsonBlocks(html)) {
      const items = b["@type"] === "ItemList" ? b.itemListElement || [] : [];
      for (const it of items) {
        if (it.url && it.name && !all.has(it.url)) {
          all.set(it.url, it.name);
          added++;
        }
      }
    }
    await sleep(250);
    if (added === 0) break; // 더 이상 새 항목 없음
  }

  // 2) 서울 구 단위 대회 후보 선별
  const candidates = [];
  for (const [url, name] of all) {
    const meta = seoulMeta(name);
    if (meta) candidates.push({ url, name, district: meta.district, type: meta.type });
  }

  // 3) 상세 SportsEvent 수집
  const out = [];
  for (const c of candidates) {
    let ev = null;
    try {
      const html = await get(c.url);
      ev = ldJsonBlocks(html).find((b) => b["@type"] === "SportsEvent") || null;
    } catch {
      /* 상세 실패 시 목록 정보만 */
    }
    const idM = c.url.match(/\/tournaments\/(\d+)/);
    const start = ev?.startDate || null;
    const end = ev?.endDate || null;
    out.push({
      id: idM ? idM[1] : c.url,
      name: c.name,
      district: c.district,
      type: c.type,
      startDate: start,
      endDate: end,
      venue: ev?.location?.name || "",
      region: ev?.location?.address?.addressRegion || "서울",
      image: ev?.image || "",
      status: start ? deriveStatus(start, end, today) : "미정",
      url: c.url,
    });
    await sleep(250);
  }

  // 날짜순(가까운 미래/최근 먼저), 날짜 없는 건 뒤로
  out.sort((a, b) => (a.startDate || "9999").localeCompare(b.startDate || "9999"));
  return out;
}

// 단독 실행 점검: node scripts/sources/seoul-competitions.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const list = await fetchSeoulCompetitions({ today: new Date() });
  console.log(`서울 구 단위 대회: ${list.length}건`);
  for (const c of list) {
    console.log(`- [${c.status}] (${c.type}) ${c.district} · ${c.name} · ${c.startDate?.slice(0, 10) || "?"}~${c.endDate?.slice(0, 10) || "?"} @ ${c.venue} ${c.image ? "🖼" : ""}`);
  }
}
