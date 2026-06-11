// 위키피디아 실데이터 소스.
//   DATA_SOURCE=wikipedia node scripts/update-data.mjs
//
// 전략: "{연도} BWF World Tour" 문서의 전체 위키텍스트를 연도당 1회 받아(영문 위키 API),
//   - Finals(월별) 표에서 대회별 우승/준우승/스코어/레벨/개최지를 파싱 → 대회·경기 결과
//   - 그 결과에 대회 레벨별 포인트를 부여·합산 → "시즌 성적 순위"(종목/연도별 랭킹) 산출
//     ※ BWF 공식 주간 랭킹이 아니라, 실제 대회 결과 기반의 시즌 성적 순위임(무료·합법).
//
// 반환 형태는 mock.mjs 와 동일(meta/rankings/history/players/playerIndex/matches).

const API = "https://en.wikipedia.org/w/api.php";
const UA = "badminton-rank-dashboard/0.1 (educational; contact: project author)";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CATEGORIES = [
  { key: "MS", label: "남자 단식", short: "남단" },
  { key: "WS", label: "여자 단식", short: "여단" },
  { key: "MD", label: "남자 복식", short: "남복" },
  { key: "WD", label: "여자 복식", short: "여복" },
  { key: "XD", label: "혼합 복식", short: "혼복" },
];
const CAT_ORDER = ["MS", "WS", "MD", "WD", "XD"]; // Finals 표의 종목 배열 순서

// IOC 3자 → ISO alpha-2 (국기/국가명용). 미매핑은 원본 3자 코드를 그대로 둠.
const IOC2 = {
  CHN:"CN", JPN:"JP", KOR:"KR", INA:"ID", IDN:"ID", DEN:"DK", MAS:"MY", IND:"IN",
  TPE:"TW", THA:"TH", ESP:"ES", FRA:"FR", HKG:"HK", SGP:"SG", SIN:"SG", ENG:"GB",
  GBR:"GB", SCO:"GB", WAL:"GB", GER:"DE", VIE:"VN", CAN:"CA", USA:"US", NED:"NL",
  IRL:"IE", TUR:"TR", EGY:"EG", ITA:"IT", BEL:"BE", SUI:"CH", SWE:"SE", FIN:"FI",
  NOR:"NO", POL:"PL", CZE:"CZ", AUT:"AT", AUS:"AU", NZL:"NZ", BRA:"BR", MEX:"MX",
  RSA:"ZA", MRI:"MU", ALG:"DZ", UKR:"UA", RUS:"RU", BUL:"BG", EST:"EE", ISR:"IL",
  POR:"PT", SVK:"SK", SLO:"SI", LAT:"LV", LTU:"LT", MAC:"MO", PHI:"PH", SRI:"LK",
  NEP:"NP", MGL:"MN", KAZ:"KZ", UZB:"UZ", IRI:"IR", AZE:"AZ", CRO:"HR", HUN:"HU",
  GRE:"GR", ROU:"RO", SRB:"RS", FRO:"FO", ISL:"IS", LUX:"LU", CYP:"CY",
};
const toAlpha2 = (ioc) => IOC2[ioc] || ioc;

// 개최지 국가명(영문) → alpha-2 (대회 위치는 IOC 코드가 아니라 국가명으로 들어옴)
const NAME2 = {
  China:"CN", Japan:"JP", Korea:"KR", "South Korea":"KR", Indonesia:"ID", Denmark:"DK",
  Malaysia:"MY", India:"IN", Taiwan:"TW", "Chinese Taipei":"TW", Thailand:"TH", Spain:"ES",
  France:"FR", "Hong Kong":"HK", Singapore:"SG", England:"GB", "United Kingdom":"GB", Scotland:"GB",
  Germany:"DE", Vietnam:"VN", Canada:"CA", "United States":"US", USA:"US", Netherlands:"NL",
  Ireland:"IE", Turkey:"TR", "Türkiye":"TR", Egypt:"EG", Italy:"IT", Belgium:"BE", Switzerland:"CH",
  Sweden:"SE", Finland:"FI", Norway:"NO", Poland:"PL", "Czech Republic":"CZ", Czechia:"CZ",
  Austria:"AT", Australia:"AU", "New Zealand":"NZ", Brazil:"BR", Mexico:"MX", "South Africa":"ZA",
  Mauritius:"MU", Ukraine:"UA", Russia:"RU", Bulgaria:"BG", Estonia:"EE", Israel:"IL", Portugal:"PT",
  Slovakia:"SK", Slovenia:"SI", Latvia:"LV", Lithuania:"LT", Macau:"MO", Philippines:"PH",
  "Sri Lanka":"LK", Nepal:"NP", Mongolia:"MN", Kazakhstan:"KZ", Uzbekistan:"UZ", Iran:"IR",
  Azerbaijan:"AZ", Croatia:"HR", Hungary:"HU", Greece:"GR", Romania:"RO", Serbia:"RS", Iceland:"IS",
};
const nameToAlpha2 = (name) => {
  if (!name) return "";
  const n = name.trim();
  if (n.length === 2) return n.toUpperCase();
  return NAME2[n] || (IOC2[n.toUpperCase()] || "");
};

const LEVEL_POINTS = {
  "World Tour Finals": 13000,
  "Super 1000": 12000,
  "Super 750": 11000,
  "Super 500": 9200,
  "Super 300": 7000,
  "Super 100": 5000,
};
const levelPoints = (lvl) => {
  for (const k of Object.keys(LEVEL_POINTS)) if (lvl && lvl.includes(k)) return LEVEL_POINTS[k];
  return 4000;
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function api(params, attempt = 0) {
  const url = API + "?" + new URLSearchParams({ format: "json", ...params });
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch (e) {
    if (attempt < 3) {
      await sleep(800 * (attempt + 1)); // 백오프 후 재시도
      return api(params, attempt + 1);
    }
    throw new Error(`wiki API 실패 (${params.page || ""}): ${e.message}`);
  }
}

async function getPageWikitext(page) {
  const d = await api({ action: "parse", page, prop: "wikitext", redirects: "1" });
  if (d.error) return null;
  return d.parse?.wikitext?.["*"] || null;
}

// 문서 제목들 → 대표사진 썸네일 URL 맵 (title → url). pageimages, 50개씩 배치.
async function fetchPhotos(titles) {
  const out = {};
  const uniq = [...new Set(titles)].filter(Boolean);
  for (let i = 0; i < uniq.length; i += 50) {
    const batch = uniq.slice(i, i + 50);
    let d;
    try {
      d = await api({
        action: "query",
        prop: "pageimages",
        piprop: "thumbnail",
        pithumbsize: "240",
        pilimit: "50",
        redirects: "1",
        titles: batch.join("|"),
      });
    } catch {
      continue;
    }
    const q = d.query || {};
    const remap = {}; // requested → final(정규화/리디렉션)
    (q.normalized || []).forEach((n) => (remap[n.from] = n.to));
    (q.redirects || []).forEach((r) => (remap[r.from] = r.to));
    const byFinal = {};
    for (const pid in q.pages || {}) {
      const p = q.pages[pid];
      if (p.thumbnail?.source) byFinal[p.title] = p.thumbnail.source;
    }
    for (const reqTitle of batch) {
      let f = reqTitle;
      for (let k = 0; k < 3 && remap[f]; k++) f = remap[f];
      if (byFinal[f]) out[reqTitle] = byFinal[f];
    }
    await sleep(200);
  }
  return out;
}

// 위키데이터 API (wikidata.org)
async function wdApi(params, attempt = 0) {
  const url = "https://www.wikidata.org/w/api.php?" + new URLSearchParams({ format: "json", ...params });
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch (e) {
    if (attempt < 2) {
      await sleep(800 * (attempt + 1));
      return wdApi(params, attempt + 1);
    }
    throw e;
  }
}

// 위키 문서(slug→title) → 위키데이터 인물정보.
// 반환: { photoBySlug(P18 Commons URL), bioBySlug({birthYear, heightCm}) }
async function fetchPeopleInfo(titleBySlug) {
  const photoBySlug = {};
  const bioBySlug = {};
  const slugByTitle = {};
  for (const [s, t] of Object.entries(titleBySlug)) if (t && !slugByTitle[t]) slugByTitle[t] = s;
  const titles = [...new Set(Object.values(titleBySlug))].filter(Boolean);

  // 1) 문서 제목 → 위키데이터 Q-id (en.wiki pageprops)
  const qidByTitle = {};
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    let d;
    try {
      d = await api({ action: "query", prop: "pageprops", ppprop: "wikibase_item", redirects: "1", titles: batch.join("|") });
    } catch {
      continue;
    }
    const q = d.query || {};
    const remap = {};
    (q.normalized || []).forEach((n) => (remap[n.from] = n.to));
    (q.redirects || []).forEach((r) => (remap[r.from] = r.to));
    const byFinal = {};
    for (const pid in q.pages || {}) {
      const p = q.pages[pid];
      if (p.pageprops?.wikibase_item) byFinal[p.title] = p.pageprops.wikibase_item;
    }
    for (const reqTitle of batch) {
      let f = reqTitle;
      for (let k = 0; k < 3 && remap[f]; k++) f = remap[f];
      if (byFinal[f]) qidByTitle[reqTitle] = byFinal[f];
    }
    await sleep(200);
  }

  // 2) Q-id → claims (P18 사진, P569 생년월일, P2048 키)
  const infoByQid = {};
  const qids = [...new Set(Object.values(qidByTitle))];
  for (let i = 0; i < qids.length; i += 50) {
    const batch = qids.slice(i, i + 50);
    let d;
    try {
      d = await wdApi({ action: "wbgetentities", ids: batch.join("|"), props: "claims" });
    } catch {
      continue;
    }
    for (const q of batch) {
      const c = d.entities?.[q]?.claims || {};
      const img = c.P18?.[0]?.mainsnak?.datavalue?.value || null;
      const dob = c.P569?.[0]?.mainsnak?.datavalue?.value?.time || null;
      let h = c.P2048?.[0]?.mainsnak?.datavalue?.value?.amount || null;
      let heightCm = null;
      if (h) {
        h = parseFloat(h);
        heightCm = h > 0 && h < 3 ? Math.round(h * 100) : Math.round(h); // m → cm 보정
      }
      infoByQid[q] = { image: img, birthYear: dob ? parseInt(dob.slice(1, 5)) : 0, heightCm };
    }
    await sleep(200);
  }

  // 3) slug 로 매핑
  for (const [title, qid] of Object.entries(qidByTitle)) {
    const slug = slugByTitle[title];
    const info = infoByQid[qid];
    if (!slug || !info) continue;
    if (info.image) {
      photoBySlug[slug] = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(info.image.replace(/ /g, "_"))}?width=320`;
    }
    bioBySlug[slug] = { birthYear: info.birthYear, heightCm: info.heightCm };
  }
  return { photoBySlug, bioBySlug };
}

// ---- 위키텍스트 파싱 유틸 ----

// 셀 라인에서 실제 내용 추출 ("| style=.. | content" → content)
function cellBody(line) {
  let s = line.replace(/^\|\s?/, "");
  // 속성부가 있는 경우(첫 '|' 앞에 '=' 포함) → 그 뒤가 내용
  const pipe = s.indexOf("|");
  if (pipe !== -1 && /=/.test(s.slice(0, pipe)) && !s.slice(0, pipe).includes("[[")) {
    s = s.slice(pipe + 1);
  }
  return s.trim();
}

// 한 행(row) 텍스트 → 셀 배열
function rowToCells(rowText) {
  const cells = [];
  for (const raw of rowText.split("\n")) {
    const line = raw.trimEnd();
    if (!line) continue;
    if (line.startsWith("|-") || line.startsWith("|}") || line.startsWith("{|")) continue;
    if (line.startsWith("!")) continue; // 헤더 셀 무시
    if (line.startsWith("|")) {
      cells.push(cellBody(line));
    } else if (cells.length) {
      cells[cells.length - 1] += "\n" + line.trim();
    }
  }
  return cells;
}

// 셀에서 {{flagicon|XXX}} [[Link|Name]] 들을 추출
// → {players:[표시이름], titles:[문서제목], country:alpha2}
// titles 는 위키 문서 대표사진(pageimages) 조회용으로 링크 대상을 그대로 보존.
function parseEntry(cell) {
  if (!cell) return null;
  const re = /\{\{flag(?:icon|athlete|IOCathlete)\|([A-Za-z]{3})[^}]*\}\}\s*(?:'''')?\s*\[\[([^\]]+)\]\]/g;
  const players = [];
  const titles = [];
  let country = null;
  let m;
  while ((m = re.exec(cell)) !== null) {
    if (!country) country = toAlpha2(m[1].toUpperCase());
    const raw = m[2];
    let title = raw, name = raw;
    if (raw.includes("|")) {
      const idx = raw.indexOf("|");
      title = raw.slice(0, idx).trim();
      name = raw.slice(idx + 1).trim();
    }
    name = name.replace(/\s*\(badminton\)\s*/i, "").trim();
    players.push(name);
    titles.push(title.trim());
  }
  if (!players.length) return null;
  return { players, titles, country: country || "" };
}

// 월별 Finals 표 텍스트 → 대회 배열
function parseMonth(monthText, year) {
  // 표 본문만
  const start = monthText.indexOf("{|");
  if (start === -1) return [];
  let end = monthText.indexOf("\n|}", start);
  if (end === -1) end = monthText.length;
  const body = monthText.slice(start, end);
  const rows = body.split(/\n\|-/); // 행 분리

  const tournaments = [];
  let cur = null;
  let discIdx = 0;

  for (const rowText of rows) {
    if (!/\S/.test(rowText)) continue;
    const cells = rowToCells(rowText);
    if (!cells.length) continue;

    const joined = cells.join("\n");
    const isInfo = /'''Level:'''|Level:/.test(joined) && /\[\[/.test(joined);
    const isScore = /'''?Score:'''?/.test(joined) || cells.some((c) => /Score:/.test(c));

    if (isInfo) {
      // 새 대회 시작
      const infoCell = cells.find((c) => /Level:/.test(c)) || "";
      const nameM = infoCell.match(/'''\s*\[\[([^\]]+)\]\]/);
      let name = nameM ? nameM[1] : "";
      if (name.includes("|")) name = name.split("|")[name.split("|").length - 1];
      name = name.replace(/\s*\(badminton\)\s*/i, "").trim();
      const levelM = infoCell.match(/Level:'''?\s*([^\n|]+)/);
      const level = levelM ? levelM[1].replace(/'+/g, "").trim() : "";
      const hostM = infoCell.match(/Host:'''?\s*([^\n|]+)/);
      let location = "", country = "";
      if (hostM) {
        const host = hostM[1].replace(/\[\[|\]\]|'+/g, "").trim();
        const parts = host.split(",").map((s) => s.trim());
        location = (parts[0] || "").split("|").pop();
        country = parts[1] || "";
      }
      const dateCell = cells.find((c) => /\d/.test(c) && /January|February|March|April|May|June|July|August|September|October|November|December|\d+\s*[–-]/.test(c) && !/\[\[/.test(c)) || "";
      const dates = dateCell.replace(/'+/g, "").trim();

      cur = { name, level, location, country, dates, finals: [] };
      tournaments.push(cur);
      discIdx = 0;

      // 같은 행에 첫 종목(MS) 우승/준우승 셀이 함께 들어있음 → 마지막 2개 flagicon 셀
      const entryCells = cells.filter((c) => /flag(?:icon|athlete)/.test(c));
      if (entryCells.length >= 2) {
        addFinal(cur, discIdx, entryCells[entryCells.length - 2], entryCells[entryCells.length - 1]);
        discIdx++;
      }
    } else if (isScore && cur && cur.finals.length) {
      const sm = joined.match(/Score:'''?\s*([0-9–\-,\s]+)/);
      if (sm) cur.finals[cur.finals.length - 1].score = sm[1].replace(/–/g, "-").replace(/\s+/g, " ").trim().replace(/,\s*$/, "");
    } else if (cur && /flag(?:icon|athlete)/.test(joined)) {
      const entryCells = cells.filter((c) => /flag(?:icon|athlete)/.test(c));
      if (entryCells.length >= 2 && discIdx < CAT_ORDER.length) {
        addFinal(cur, discIdx, entryCells[0], entryCells[1]);
        discIdx++;
      }
    }
  }
  return tournaments.map((t) => ({ ...t, year }));
}

function addFinal(t, idx, champCell, runnerCell) {
  if (idx >= CAT_ORDER.length) return;
  const champion = parseEntry(champCell);
  const runnerUp = parseEntry(runnerCell);
  if (!champion) return;
  t.finals.push({ category: CAT_ORDER[idx], champion, runnerUp: runnerUp || { players: [], titles: [], country: "" }, score: "" });
}

// 페이지 전체 위키텍스트 → 그 해 대회 배열
function parseYear(wikitext, year) {
  const tournaments = [];
  for (let i = 0; i < MONTHS.length; i++) {
    const mh = new RegExp(`\\n===\\s*${MONTHS[i]}\\s*===`);
    const m = wikitext.match(mh);
    if (!m) continue;
    const startIdx = m.index + m[0].length;
    // 다음 === 또는 == 헤딩까지
    const rest = wikitext.slice(startIdx);
    const nextH = rest.search(/\n==+[^=]/);
    const monthText = nextH === -1 ? rest : rest.slice(0, nextH);
    tournaments.push(...parseMonth(monthText, year));
  }
  return tournaments;
}

// ---- 데이터셋 빌드 ----

function slug(name) {
  return ("w-" + name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) || "w-unknown";
}
const entryKey = (cat, players) => cat + ":" + players.map((p) => p.toLowerCase()).sort().join("+");
const genderOf = (cat) => (cat === "WS" || cat === "WD" ? "F" : cat === "MS" || cat === "MD" ? "M" : null);

export async function generate({ today }) {
  const currentYear = today.getUTCFullYear();
  const startYear = 2018; // BWF World Tour 출범 연도

  // 연도별 대회 수집
  const byYear = new Map();
  for (let y = currentYear; y >= startYear; y--) {
    try {
      const wt = await getPageWikitext(`${y} BWF World Tour`);
      if (wt) {
        const tournaments = parseYear(wt, y);
        if (tournaments.length) byYear.set(y, tournaments);
      }
    } catch (e) {
      console.warn(`[wikipedia] ${y}년 건너뜀: ${e.message}`); // 한 해 실패해도 계속
    }
    await sleep(400); // 예의상 지연
  }
  if (!byYear.size) throw new Error("위키피디아에서 BWF World Tour 데이터를 가져오지 못했습니다.");

  const years = [...byYear.keys()].sort((a, b) => b - a);

  // slug → 위키 문서 제목 (대표사진 조회용)
  const titleBySlug = {};
  for (const y of years) {
    for (const t of byYear.get(y)) {
      for (const f of t.finals) {
        for (const side of [f.champion, f.runnerUp]) {
          if (!side) continue;
          (side.players || []).forEach((n, i) => {
            const s = slug(n);
            if (!titleBySlug[s]) titleBySlug[s] = (side.titles && side.titles[i]) || n;
          });
        }
      }
    }
  }

  // 연도별 종목별 시즌 성적 순위 산출
  // standings[year][cat] = [{rank, key, players:[{id,name}], country, points, tournaments, titles}]
  const standings = {};
  for (const y of years) {
    const acc = {}; // cat -> key -> agg
    for (const t of byYear.get(y)) {
      const pts = levelPoints(t.level);
      for (const f of t.finals) {
        const reg = (entry, isChamp) => {
          if (!entry || !entry.players.length) return;
          const k = entryKey(f.category, entry.players);
          const a = (acc[f.category] ||= {})[k] || (acc[f.category][k] = {
            key: k, players: entry.players, country: entry.country, points: 0, tournaments: 0, titles: 0,
          });
          a.points += isChamp ? pts : Math.round(pts * 0.84);
          a.tournaments += 1;
          if (isChamp) a.titles += 1;
          if (!a.country && entry.country) a.country = entry.country;
        };
        reg(f.champion, true);
        reg(f.runnerUp, false);
      }
    }
    standings[y] = {};
    for (const cat of CAT_ORDER) {
      const list = Object.values(acc[cat] || {}).sort((x, z) => z.points - x.points);
      standings[y][cat] = list.map((a, i) => ({
        rank: i + 1,
        key: a.key,
        players: a.players.map((n) => ({ id: slug(n), name: n })),
        country: a.country,
        points: a.points,
        tournaments: a.tournaments,
        titles: a.titles,
      }));
    }
  }

  const latest = years[0];
  const prev = years[1];

  // 현재(=최신 시즌) 랭킹 — 전년 대비 변동 포함
  const rankings = {};
  for (const cat of CAT_ORDER) {
    const cur = standings[latest][cat];
    const prevRankByKey = {};
    if (prev) standings[prev][cat].forEach((e) => (prevRankByKey[e.key] = e.rank));
    rankings[cat] = {
      category: cat,
      updatedAt: today.toISOString(),
      entries: cur.map((e) => {
        const pr = prevRankByKey[e.key] ?? null;
        return {
          rank: e.rank,
          previousRank: pr,
          change: pr == null ? 0 : pr - e.rank,
          points: e.points,
          country: e.country,
          players: e.players,
          tournaments: e.tournaments,
        };
      }),
    };
  }

  // 연도별(시즌) 랭킹 — 상위 50
  const history = years.map((y) => ({
    year: y,
    categories: Object.fromEntries(
      CAT_ORDER.map((cat) => [
        cat,
        standings[y][cat].slice(0, 50).map((e) => ({ rank: e.rank, points: e.points, country: e.country, players: e.players })),
      ])
    ),
  }));

  // 대회·경기 결과
  const matches = years.map((y) => ({
    year: y,
    tournaments: byYear.get(y).map((t, i) => ({
      id: `${y}-${slug(t.name).replace(/^w-/, "")}-${i}`,
      name: t.name,
      location: t.location,
      country: nameToAlpha2(t.country),
      level: t.level,
      startDate: t.dates ? `${t.dates} ${y}` : `${y}`,
      endDate: "",
      finals: t.finals.map((f) => ({
        category: f.category,
        champion: { players: f.champion.players, country: f.champion.country },
        runnerUp: { players: f.runnerUp.players, country: f.runnerUp.country },
        score: f.score,
      })),
    })),
  }));

  // 선수 프로필 (랭킹/결승 등장 선수)
  const players = new Map(); // id -> profile accumulator
  const ensure = (id, name, cat) => {
    let p = players.get(id);
    if (!p) {
      p = { id, name, country: "", gender: null, birthYear: 0, currentRankings: {}, rankingHistory: [], stats: { matchesPlayed: 0, wins: 0, losses: 0, titles: 0 }, recentMatches: [], _best: 999, _bestCat: cat };
      players.set(id, p);
    }
    const g = genderOf(cat);
    if (g && !p.gender) p.gender = g;
    return p;
  };

  // 랭킹 이력 + 현재 랭킹 + best
  for (const y of years) {
    for (const cat of CAT_ORDER) {
      for (const e of standings[y][cat]) {
        for (const ref of e.players) {
          const p = ensure(ref.id, ref.name, cat);
          if (e.country && !p.country) p.country = e.country;
          p.rankingHistory.push({ year: y, category: cat, rank: e.rank, points: e.points });
          if (e.rank < p._best) { p._best = e.rank; p._bestCat = cat; }
          if (y === latest) p.currentRankings[cat] = Math.min(p.currentRankings[cat] ?? 999, e.rank);
        }
      }
    }
  }

  // 결승 기반 통계 + 최근 경기
  const allFinals = [];
  for (const y of years) for (const t of byYear.get(y)) for (const f of t.finals) allFinals.push({ y, t, f });
  for (const { y, t, f } of allFinals) {
    const sides = [
      { side: f.champion, win: true, opp: f.runnerUp },
      { side: f.runnerUp, win: false, opp: f.champion },
    ];
    for (const s of sides) {
      if (!s.side || !s.side.players.length) continue;
      for (const name of s.side.players) {
        const id = slug(name);
        const p = players.get(id);
        if (!p) continue;
        p.stats.matchesPlayed += 1;
        if (s.win) { p.stats.wins += 1; p.stats.titles += 1; } else p.stats.losses += 1;
        p.recentMatches.push({
          _y: y,
          date: t.dates ? `${t.dates} ${y}` : `${y}`,
          tournament: t.name,
          category: f.category,
          round: "결승",
          opponent: (s.opp?.players || []).join(" / ") || "—",
          opponentCountry: s.opp?.country || "",
          result: s.win ? "승" : "패",
          score: f.score || "",
        });
      }
    }
  }

  const playersOut = [];
  const playerIndex = [];
  for (const p of players.values()) {
    // 랭킹 이력 정렬, 최근 경기 정렬/제한
    p.rankingHistory.sort((a, b) => a.year - b.year || CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category));
    p.recentMatches.sort((a, b) => b._y - a._y);
    p.recentMatches = p.recentMatches.slice(0, 10).map(({ _y, ...m }) => m);
    const cats = [...new Set(p.rankingHistory.map((h) => h.category))];
    if (!p.gender) p.gender = "M";
    const out = {
      id: p.id, name: p.name, country: p.country, gender: p.gender, birthYear: p.birthYear,
      currentRankings: p.currentRankings,
      bestRanking: { category: p._bestCat, rank: p._best === 999 ? (p.rankingHistory[0]?.rank || 0) : p._best },
      rankingHistory: p.rankingHistory,
      stats: p.stats,
      recentMatches: p.recentMatches,
    };
    playersOut.push(out);
    playerIndex.push({ id: p.id, name: p.name, country: p.country, gender: p.gender, bestRank: out.bestRanking.rank, categories: cats });
  }
  playerIndex.sort((a, b) => a.bestRank - b.bestRank);

  // 선수 사진 + 인물정보 수집.
  //  - 위키데이터(P18)를 우선 사진 소스로(커버리지 높음, 생년/키 동반), pageimages 는 폴백.
  const wantTitles = playersOut.map((p) => titleBySlug[p.id]).filter(Boolean);
  const photoByTitle = await fetchPhotos(wantTitles); // pageimages 폴백
  const { photoBySlug, bioBySlug } = await fetchPeopleInfo(titleBySlug); // 위키데이터
  const photos = {};
  let bioCount = 0;
  for (const p of playersOut) {
    const t = titleBySlug[p.id];
    const photo = photoBySlug[p.id] || (t && photoByTitle[t]) || null;
    if (photo) photos[p.id] = photo;
    const bio = bioBySlug[p.id];
    if (bio) {
      if (bio.birthYear) p.birthYear = bio.birthYear;
      if (bio.heightCm) p.heightCm = bio.heightCm;
      if (bio.birthYear || bio.heightCm) bioCount++;
    }
  }
  console.log(`[wikipedia] 선수 사진 ${Object.keys(photos).length}/${playersOut.length}명, 인물정보 ${bioCount}명`);

  const meta = {
    generatedAt: today.toISOString(),
    source: "wikipedia",
    currentYear: latest,
    years,
    categories: CATEGORIES,
    playerCount: playerIndex.length,
    tournamentCountThisYear: byYear.get(latest)?.length || 0,
  };

  return { meta, rankings, history, players: playersOut, playerIndex, matches, photos };
}

// 단독 실행 시 파싱 점검: node scripts/sources/wikipedia.mjs 2024
if (import.meta.url === `file://${process.argv[1]}`) {
  const year = Number(process.argv[2] || 2024);
  const wt = await getPageWikitext(`${year} BWF World Tour`);
  if (!wt) { console.error("페이지 없음"); process.exit(1); }
  const ts = parseYear(wt, year);
  console.log(`${year}: 대회 ${ts.length}개`);
  for (const t of ts.slice(0, 3)) {
    console.log(`\n■ ${t.name} [${t.level}] @ ${t.location}, ${t.country} (${t.dates})`);
    for (const f of t.finals) console.log(`  ${f.category}: 우승 ${f.champion.players.join("/")}(${f.champion.country}) / 준우승 ${f.runnerUp.players.join("/")}(${f.runnerUp.country}) | ${f.score}`);
  }
  const last = ts[ts.length - 1];
  if (last) { console.log(`\n■(마지막) ${last.name} [${last.level}] finals=${last.finals.length}`); }
}
