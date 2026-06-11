// 목업 데이터 소스.
// 실제 BWF 스크래핑으로 교체할 때 이 파일과 동일한 형태의 데이터셋 객체를 반환하는
// generate() 만 새로 구현하면 된다. (scripts/sources/bwf.mjs 등)
//
// 반환 형태:
// { meta, rankings:{cat:RankingFile}, history:[HistoryFile], players:[PlayerProfile],
//   playerIndex:[PlayerIndexItem], matches:[MatchesFile] }

// ---- 결정적 난수 (mulberry32) ----
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ROSTER_SEED = 20240101; // 선수 명단/과거 이력은 고정 시드로 안정적으로 유지

// ---- 메타 ----
const CATEGORIES = [
  { key: "MS", label: "남자 단식", short: "남단", gender: "M", type: "single" },
  { key: "WS", label: "여자 단식", short: "여단", gender: "F", type: "single" },
  { key: "MD", label: "남자 복식", short: "남복", gender: "M", type: "double" },
  { key: "WD", label: "여자 복식", short: "여복", gender: "F", type: "double" },
  { key: "XD", label: "혼합 복식", short: "혼복", gender: "X", type: "double" },
];

// 배드민턴 강국 + 가중치(강할수록 상위 랭커가 많이 나옴)
const COUNTRIES = [
  { code: "CN", weight: 10, name: "중국" },
  { code: "JP", weight: 9, name: "일본" },
  { code: "KR", weight: 8, name: "대한민국" },
  { code: "ID", weight: 8, name: "인도네시아" },
  { code: "DK", weight: 7, name: "덴마크" },
  { code: "MY", weight: 6, name: "말레이시아" },
  { code: "IN", weight: 6, name: "인도" },
  { code: "TW", weight: 5, name: "대만" },
  { code: "TH", weight: 5, name: "태국" },
  { code: "ES", weight: 3, name: "스페인" },
  { code: "FR", weight: 3, name: "프랑스" },
  { code: "HK", weight: 3, name: "홍콩" },
  { code: "SG", weight: 2, name: "싱가포르" },
  { code: "GB", weight: 3, name: "영국" },
  { code: "DE", weight: 2, name: "독일" },
  { code: "VN", weight: 2, name: "베트남" },
  { code: "CA", weight: 1, name: "캐나다" },
  { code: "US", weight: 1, name: "미국" },
  { code: "NL", weight: 1, name: "네덜란드" },
];

// 국가별 성/이름 풀 (합성 이름 — 실명 아님). 이름은 성별(m/f)로 분리.
const NAME_POOLS = {
  CN: { last: ["Chen", "Li", "Wang", "Zhang", "Liu", "Huang", "Zhao", "Wu", "Lin", "Shi"], m: ["Jun", "Wei", "Hao", "Bin", "Lei", "Kai", "Long", "Peng", "Gang", "Tao"], f: ["Yu", "Ning", "Fei", "Tian", "Xin", "Yan", "Hui", "Jing", "Mei", "Qian"] },
  JP: { last: ["Yamamoto", "Takahashi", "Sato", "Watanabe", "Kobayashi", "Nakamura", "Ito", "Suzuki", "Kato", "Yoshida"], m: ["Kento", "Yuta", "Riku", "Daiki", "Sho", "Kenta", "Takuma", "Hayato", "Sora", "Ren"], f: ["Akane", "Nozomi", "Sayaka", "Haruka", "Mayu", "Aya", "Saki", "Yui", "Misaki", "Rina"] },
  KR: { last: ["Kim", "Lee", "Park", "Choi", "Jeong", "Kang", "Yoon", "Seo", "An", "Hong"], m: ["Minho", "Junseo", "Seokho", "Taeyang", "Jihun", "Woojin", "Hyun", "Sungmin", "Doyoon", "Jaehyun"], f: ["Jiwon", "Seoyeon", "Hara", "Doyeon", "Yuna", "Sora", "Eunji", "Hayoung", "Soeun", "Minji"] },
  ID: { last: ["Pratama", "Wijaya", "Santoso", "Saputra", "Hidayat", "Kusuma", "Gunawan", "Setiawan", "Nugroho", "Permana"], m: ["Anthony", "Rizki", "Bagas", "Fajar", "Rian", "Kevin", "Jonatan", "Hendra", "Marcus", "Wahyu"], f: ["Greysia", "Putri", "Apriyani", "Siti", "Dewi", "Gregoria", "Ribka", "Indah", "Lanny", "Ayu"] },
  DK: { last: ["Andersen", "Jensen", "Nielsen", "Hansen", "Pedersen", "Larsen", "Christensen", "Sorensen", "Madsen", "Vittinghus"], m: ["Viktor", "Anders", "Mads", "Emil", "Rasmus", "Lasse", "Magnus", "Kim", "Frederik", "Jonas"], f: ["Mia", "Line", "Freja", "Ida", "Mette", "Sara", "Anna", "Julie", "Maja", "Emma"] },
  MY: { last: ["Lee", "Tan", "Goh", "Soh", "Chia", "Wong", "Teo", "Ng", "Lim", "Yeoh"], m: ["Aaron", "Wooi", "Jin", "Soon", "Kean", "Zii", "Wei", "Chong", "Liang", "Yew"], f: ["Pearly", "Thinaah", "Mei", "Vivian", "Ying", "Lydia", "Hooi", "Yen", "Wen", "Shevon"] },
  IN: { last: ["Sharma", "Reddy", "Nair", "Sen", "Verma", "Rao", "Kashyap", "Ponnappa", "Shetty", "Rankireddy"], m: ["Lakshya", "Kidambi", "Chirag", "Satwik", "Arjun", "Sai", "Kiran", "Rohan", "Aditya", "Varun"], f: ["Pusarla", "Saina", "Ashwini", "Aakarshi", "Treesa", "Anupama", "Malvika", "Gayatri", "Tanya", "Riya"] },
  TW: { last: ["Tai", "Chou", "Lee", "Wang", "Hsu", "Chiang", "Lin", "Yang", "Pai", "Hung"], m: ["Chih", "Po", "Wei", "Jung", "Yu", "Cheng", "Hao", "Chien", "Kuan", "Yi"], f: ["Tzu", "Tien", "Ching", "Hsuan", "Ying", "Wen", "Chia", "Hui", "Yun", "Pei"] },
  TH: { last: ["Intanon", "Vongsa", "Phuangphuapet", "Ongbamrungphan", "Sornsi", "Charoenkitamorn", "Pakkawat", "Saensomboonsuk", "Kunlavut", "Vitidsarn"], m: ["Kunlavut", "Dechapol", "Kantaphon", "Sitthikom", "Bodin", "Kittinupong", "Tanongsak", "Pannawit", "Adulrach", "Wachirawit"], f: ["Ratchanok", "Busanan", "Pornpawee", "Sapsiree", "Supanida", "Jongkolphan", "Rawinda", "Benyapa", "Phataimas", "Chasinee"] },
  DEFAULT: { last: ["Smith", "Garcia", "Martin", "Mueller", "Nguyen", "Tran", "Brown", "Dubois", "Rossi", "Novak"], m: ["Alex", "Marco", "Carlos", "Lucas", "Toby", "Pablo", "Leo", "Liam", "Noah", "Adam"], f: ["Anna", "Marin", "Sofia", "Clara", "Lena", "Julia", "Nina", "Eva", "Lara", "Maya"] },
};

function pickWeighted(rng, items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

function makeName(rng, country, gender) {
  const pool = NAME_POOLS[country] || NAME_POOLS.DEFAULT;
  const firsts = (gender === "F" ? pool.f : pool.m);
  const last = pool.last[Math.floor(rng() * pool.last.length)];
  const first = firsts[Math.floor(rng() * firsts.length)];
  return `${first} ${last}`;
}

function countryName(code) {
  return (COUNTRIES.find((c) => c.code === code) || {}).name || code;
}

// ---- 선수 명단 생성 (고정 시드) ----
function buildRoster() {
  const rng = mulberry32(ROSTER_SEED);
  const players = [];
  let n = 0;
  const make = (gender, count) => {
    for (let i = 0; i < count; i++) {
      const country = pickWeighted(rng, COUNTRIES);
      n++;
      const id = `p-${String(n).padStart(4, "0")}`;
      // baseSkill: 국가 가중치 보너스 + 개인 편차
      const baseSkill = country.weight * 2 + rng() * 60 + rng() * 40;
      const trend = (rng() - 0.45) * 6; // 연도별 성장/하락 기울기
      players.push({
        id,
        name: makeName(rng, country.code, gender),
        country: country.code,
        gender,
        birthYear: 2026 - (18 + Math.floor(rng() * 16)),
        baseSkill,
        trend,
        noiseSeed: Math.floor(rng() * 1e9),
      });
    }
  };
  make("M", 150);
  make("F", 150);
  return players;
}

// 특정 연도(또는 오늘) 기준 선수 실력 — 추세 + 잡음
function skillAt(player, yearIndex, daySeed) {
  const noise = mulberry32(player.noiseSeed + yearIndex * 7919 + daySeed) ();
  return player.baseSkill + player.trend * yearIndex + (noise - 0.5) * 30;
}

function pointsFromRank(rank, top) {
  // 1위에 가까울수록 점수 급증 (지수 감쇠)
  return Math.round(top * Math.pow(0.97, rank - 1));
}

// 단식 랭킹 한 종목 생성
function singlesRanking(players, gender, yearIndex, daySeed, size) {
  const pool = players
    .filter((p) => p.gender === gender)
    .map((p) => ({ p, s: skillAt(p, yearIndex, daySeed) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, size);
  return pool.map((x, i) => ({ rank: i + 1, player: x.p, skill: x.s }));
}

// 복식 페어 생성 (같은 국가 우선). 캐싱을 위해 종목별 페어 목록을 고정 시드로 1회 구성.
function buildPairs(players, type, gender) {
  const rng = mulberry32(ROSTER_SEED + type.length + (gender || "X").charCodeAt(0));
  const pairs = [];
  if (type === "XD") {
    const men = players.filter((p) => p.gender === "M");
    const women = players.filter((p) => p.gender === "F");
    const byCountryW = {};
    for (const w of women) (byCountryW[w.country] ||= []).push(w);
    const usedW = new Set();
    for (const m of men) {
      const sameW = (byCountryW[m.country] || []).filter((w) => !usedW.has(w.id));
      let partner;
      if (sameW.length && rng() > 0.25) partner = sameW[Math.floor(rng() * sameW.length)];
      else {
        const avail = women.filter((w) => !usedW.has(w.id));
        if (!avail.length) break;
        partner = avail[Math.floor(rng() * avail.length)];
      }
      usedW.add(partner.id);
      pairs.push([m, partner]);
      if (pairs.length >= 90) break;
    }
  } else {
    const g = players.filter((p) => p.gender === gender);
    const byCountry = {};
    for (const p of g) (byCountry[p.country] ||= []).push(p);
    const used = new Set();
    const list = [...g];
    for (const a of list) {
      if (used.has(a.id)) continue;
      const sameC = (byCountry[a.country] || []).filter((b) => b.id !== a.id && !used.has(b.id));
      let b;
      if (sameC.length && rng() > 0.2) b = sameC[Math.floor(rng() * sameC.length)];
      else {
        const avail = list.filter((x) => x.id !== a.id && !used.has(x.id));
        if (!avail.length) break;
        b = avail[Math.floor(rng() * avail.length)];
      }
      used.add(a.id);
      used.add(b.id);
      pairs.push([a, b]);
      if (pairs.length >= 90) break;
    }
  }
  return pairs;
}

function doublesRanking(pairs, yearIndex, daySeed, size) {
  const ranked = pairs
    .map(([a, b]) => ({ a, b, s: (skillAt(a, yearIndex, daySeed) + skillAt(b, yearIndex, daySeed)) / 2 }))
    .sort((x, y) => y.s - x.s)
    .slice(0, size);
  return ranked.map((x, i) => ({ rank: i + 1, pair: [x.a, x.b], skill: x.s }));
}

const SINGLES_SIZE = 100;
const DOUBLES_SIZE = 75;

export function generate({ today }) {
  const currentYear = today.getUTCFullYear();
  const yearStart = currentYear - 7;
  const years = [];
  for (let y = currentYear; y >= yearStart; y--) years.push(y);

  const players = buildRoster();
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));

  // 페어 사전 구성
  const pairsByCat = {
    MD: buildPairs(players, "MD", "M"),
    WD: buildPairs(players, "WD", "F"),
    XD: buildPairs(players, "XD", null),
  };

  // 오늘/어제 day seed (일일 변동)
  const daySeedToday = Math.floor(Date.UTC(currentYear, today.getUTCMonth(), today.getUTCDate()) / 86400000);
  const daySeedYesterday = daySeedToday - 1;

  const catRanked = (yearIndex, daySeed) => ({
    MS: singlesRanking(players, "M", yearIndex, daySeed, SINGLES_SIZE),
    WS: singlesRanking(players, "F", yearIndex, daySeed, SINGLES_SIZE),
    MD: doublesRanking(pairsByCat.MD, yearIndex, daySeed, DOUBLES_SIZE),
    WD: doublesRanking(pairsByCat.WD, yearIndex, daySeed, DOUBLES_SIZE),
    XD: doublesRanking(pairsByCat.XD, yearIndex, daySeed, DOUBLES_SIZE),
  });

  // 현재 랭킹 (오늘 / 어제)
  const todayRanked = catRanked(0, daySeedToday);
  const yestRanked = catRanked(0, daySeedYesterday);

  const entryPlayers = (item) =>
    item.player ? [{ id: item.player.id, name: item.player.name }] : item.pair.map((p) => ({ id: p.id, name: p.name }));
  const entryCountry = (item) => (item.player ? item.player.country : item.pair[0].country);
  const entryKey = (item) => (item.player ? item.player.id : item.pair.map((p) => p.id).sort().join("+"));

  const rankings = {};
  for (const cat of CATEGORIES) {
    const k = cat.key;
    const yestRankByKey = Object.fromEntries(yestRanked[k].map((it) => [entryKey(it), it.rank]));
    const top = k.length === 2 && cat.type === "single" ? 100000 : 95000;
    rankings[k] = {
      category: k,
      updatedAt: today.toISOString(),
      entries: todayRanked[k].map((it) => {
        const prev = yestRankByKey[entryKey(it)] ?? null;
        return {
          rank: it.rank,
          previousRank: prev,
          change: prev == null ? 0 : prev - it.rank,
          points: pointsFromRank(it.rank, top),
          country: entryCountry(it),
          players: entryPlayers(it),
          tournaments: 8 + ((it.rank * 7) % 9),
        };
      }),
    };
  }

  // 연도별(연말) 랭킹
  const history = [];
  const yearIndexOf = (y) => y - currentYear; // 0=올해, 음수=과거
  for (const y of years) {
    const yi = yearIndexOf(y);
    const ranked = catRanked(yi, 555 + y); // 연말 확정용 고정 시드
    const categoriesObj = {};
    for (const cat of CATEGORIES) {
      const k = cat.key;
      const top = cat.type === "single" ? 100000 : 95000;
      categoriesObj[k] = ranked[k].slice(0, 50).map((it) => ({
        rank: it.rank,
        points: pointsFromRank(it.rank, top),
        country: entryCountry(it),
        players: entryPlayers(it),
      }));
    }
    history.push({ year: y, categories: categoriesObj });
  }

  // 선수 프로필 — 현재/과거 랭킹에 등장한 선수만 생성
  const appeared = new Set();
  const recordAppear = (ranked) => {
    for (const cat of CATEGORIES) for (const it of ranked[cat.key]) entryPlayers(it).forEach((p) => appeared.add(p.id));
  };
  recordAppear(todayRanked);
  for (const h of history) {
    for (const cat of CATEGORIES) for (const it of h.categories[cat.key]) it.players.forEach((p) => appeared.add(p.id));
  }

  // 선수별 현재 랭킹 / 카테고리
  const currentRankByPlayer = {}; // id -> {cat: rank}
  for (const cat of CATEGORIES) {
    for (const it of todayRanked[cat.key]) {
      for (const p of entryPlayers(it)) {
        (currentRankByPlayer[p.id] ||= {})[cat.key] = it.rank;
      }
    }
  }

  // 선수별 연도별 랭킹 이력
  const histByPlayer = {}; // id -> [{year,category,rank,points}]
  for (const h of history) {
    for (const cat of CATEGORIES) {
      for (const it of h.categories[cat.key]) {
        for (const p of it.players) {
          (histByPlayer[p.id] ||= []).push({ year: h.year, category: cat.key, rank: it.rank, points: it.points });
        }
      }
    }
  }

  const ROUNDS = ["32강", "16강", "8강", "준준결승", "준결승", "결승"];
  const players_out = [];
  const playerIndex = [];
  for (const id of appeared) {
    const p = playersById[id];
    const cr = currentRankByPlayer[id] || {};
    const hist = (histByPlayer[id] || []).sort((a, b) => a.year - b.year || a.category.localeCompare(b.category));
    const cats = [...new Set([...Object.keys(cr), ...hist.map((h) => h.category)])];
    const allRanks = [...Object.values(cr), ...hist.map((h) => h.rank)];
    const bestRank = allRanks.length ? Math.min(...allRanks) : 999;
    const bestCat =
      Object.entries(cr).sort((a, b) => a[1] - b[1])[0]?.[0] || hist.sort((a, b) => a.rank - b.rank)[0]?.category || cats[0];

    // 최근 경기 (선수 결정적 시드)
    const rng = mulberry32(p.noiseSeed + 31);
    const wins = 18 + Math.floor(rng() * 40);
    const losses = 6 + Math.floor(rng() * 22);
    const titles = Math.max(0, Math.round((100 - bestRank) / 12 + (rng() - 0.5) * 2));
    const recentMatches = [];
    for (let i = 0; i < 8; i++) {
      const oppCountry = pickWeighted(rng, COUNTRIES).code;
      const win = rng() > 0.4;
      // 오늘 기준 과거로 거슬러 올라가는 날짜
      const totalM = today.getUTCFullYear() * 12 + today.getUTCMonth() - i;
      const my = Math.floor(totalM / 12);
      const mm = (totalM % 12) + 1;
      const dd = 3 + ((i * 5) % 24);
      recentMatches.push({
        date: `${my}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
        tournament: TOURNAMENT_NAMES[(p.noiseSeed + i) % TOURNAMENT_NAMES.length],
        category: cats[0] || "MS",
        round: ROUNDS[(p.noiseSeed + i) % ROUNDS.length],
        opponent: makeName(rng, oppCountry, p.gender),
        opponentCountry: oppCountry,
        result: win ? "승" : "패",
        score: win ? randScore(rng, true) : randScore(rng, false),
      });
    }

    players_out.push({
      id,
      name: p.name,
      country: p.country,
      gender: p.gender,
      birthYear: p.birthYear,
      currentRankings: cr,
      bestRanking: { category: bestCat, rank: bestRank },
      rankingHistory: hist,
      stats: { matchesPlayed: wins + losses, wins, losses, titles },
      recentMatches,
    });
    playerIndex.push({ id, name: p.name, country: p.country, gender: p.gender, bestRank, categories: cats });
  }
  playerIndex.sort((a, b) => a.bestRank - b.bestRank);

  // 대회/경기 정보 (연도별)
  const matches = years.map((y) => ({
    year: y,
    tournaments: buildTournaments(y, catRanked(yearIndexOf(y), 999 + y)),
  }));

  const meta = {
    generatedAt: today.toISOString(),
    source: "mock",
    currentYear,
    years,
    categories: CATEGORIES.map((c) => ({ key: c.key, label: c.label, short: c.short })),
    playerCount: playerIndex.length,
    tournamentCountThisYear: matches[0]?.tournaments.length || 0,
  };

  return { meta, rankings, history, players: players_out, playerIndex, matches, photos: {} };
}

function randScore(rng, win) {
  const g = () => {
    const a = 21;
    const b = 13 + Math.floor(rng() * 8);
    return win ? `${a}-${b}` : `${b}-${a}`;
  };
  return rng() > 0.55 ? `${g()}, ${g()}` : `${g()}, ${g()}, ${g()}`;
}

const TOURNAMENT_NAMES = [
  "All England Open",
  "Indonesia Open",
  "Malaysia Open",
  "China Open",
  "Japan Open",
  "Denmark Open",
  "Korea Open",
  "India Open",
  "Thailand Open",
  "Singapore Open",
  "French Open",
  "Hong Kong Open",
  "World Championships",
  "World Tour Finals",
  "Spain Masters",
];

const LEVELS = [
  "Super 1000",
  "Super 750",
  "Super 500",
  "Super 300",
  "World Championships",
  "World Tour Finals",
  "Super 100",
];

const LOCATIONS = {
  "All England Open": ["Birmingham", "GB"],
  "Indonesia Open": ["Jakarta", "ID"],
  "Malaysia Open": ["Kuala Lumpur", "MY"],
  "China Open": ["Changzhou", "CN"],
  "Japan Open": ["Tokyo", "JP"],
  "Denmark Open": ["Odense", "DK"],
  "Korea Open": ["Seoul", "KR"],
  "India Open": ["New Delhi", "IN"],
  "Thailand Open": ["Bangkok", "TH"],
  "Singapore Open": ["Singapore", "SG"],
  "French Open": ["Paris", "FR"],
  "Hong Kong Open": ["Hong Kong", "HK"],
  "World Championships": ["Copenhagen", "DK"],
  "World Tour Finals": ["Hangzhou", "CN"],
  "Spain Masters": ["Madrid", "ES"],
};

function buildTournaments(year, ranked) {
  const rng = mulberry32(year * 13 + 7);
  const cats = ["MS", "WS", "MD", "WD", "XD"];
  return TOURNAMENT_NAMES.map((name, idx) => {
    const [loc, ctry] = LOCATIONS[name] || ["—", "—"];
    const month = 1 + ((idx * 9 + 2) % 12);
    const day = 4 + ((idx * 5) % 18);
    const level = name === "World Championships" ? "World Championships" : name === "World Tour Finals" ? "World Tour Finals" : LEVELS[idx % 4];
    const finals = cats.map((c) => {
      const pool = ranked[c].slice(0, 8);
      const i1 = Math.floor(rng() * pool.length);
      let i2 = Math.floor(rng() * pool.length);
      if (i2 === i1) i2 = (i2 + 1) % pool.length;
      const champ = pool[Math.min(i1, i2)];
      const runner = pool[Math.max(i1, i2)];
      const names = (it) => (it.player ? [it.player.name] : it.pair.map((p) => p.name));
      const ctryOf = (it) => (it.player ? it.player.country : it.pair[0].country);
      return {
        category: c,
        champion: { players: names(champ), country: ctryOf(champ) },
        runnerUp: { players: names(runner), country: ctryOf(runner) },
        score: randScore(rng, true),
      };
    });
    return {
      id: `${year}-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
      name,
      location: loc,
      country: ctry,
      level,
      startDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      endDate: `${year}-${String(month).padStart(2, "0")}-${String(day + 5).padStart(2, "0")}`,
      finals,
    };
  });
}

export { COUNTRIES, countryName, CATEGORIES };
