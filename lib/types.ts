// 배드민턴 랭킹 대시보드 공용 타입.
// 배치 스크립트(scripts/update-data.mjs)가 생성하는 JSON 구조와 1:1 대응한다.

export type CategoryKey = "MS" | "WS" | "MD" | "WD" | "XD";

export interface CategoryInfo {
  key: CategoryKey;
  label: string; // 한국어 라벨 (예: "남자 단식")
  short: string; // 짧은 라벨 (예: "남단")
}

export interface Meta {
  generatedAt: string; // ISO 8601
  source: string; // "mock" | "bwf" 등 데이터 출처
  currentYear: number;
  years: number[]; // 과거 연도별 랭킹이 존재하는 연도 목록 (내림차순)
  categories: CategoryInfo[];
  playerCount: number;
  tournamentCountThisYear: number;
}

export interface PlayerRef {
  id: string;
  name: string;
}

// 현재 랭킹 한 줄(단식은 선수 1명, 복식은 2명)
export interface RankingEntry {
  rank: number;
  previousRank: number | null; // null = 신규 진입
  change: number; // +면 상승, -면 하락 (previousRank - rank)
  points: number;
  country: string; // ISO alpha-2 (예: "KR")
  players: PlayerRef[];
  tournaments: number; // 집계 대회 수
}

export interface RankingFile {
  category: CategoryKey;
  updatedAt: string;
  entries: RankingEntry[];
}

// 연도별(연말 기준) 랭킹 — 한 파일에 전 종목 포함
export interface HistoryEntry {
  rank: number;
  points: number;
  country: string;
  players: PlayerRef[];
}

export interface HistoryFile {
  year: number;
  categories: Record<CategoryKey, HistoryEntry[]>;
}

export interface RankingHistoryPoint {
  year: number;
  category: CategoryKey;
  rank: number;
  points: number;
}

export interface PlayerMatch {
  date: string;
  tournament: string;
  category: CategoryKey;
  round: string; // 예: "결승", "준결승"
  opponent: string;
  opponentCountry: string;
  result: "승" | "패";
  score: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  country: string;
  gender: "M" | "F";
  birthYear: number;
  heightCm?: number;
  currentRankings: Partial<Record<CategoryKey, number>>;
  bestRanking: { category: CategoryKey; rank: number };
  rankingHistory: RankingHistoryPoint[];
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    titles: number;
  };
  recentMatches: PlayerMatch[];
  partners?: { id: string; name: string; category: CategoryKey }[];
}

export interface PlayerIndexItem {
  id: string;
  name: string;
  country: string;
  gender: "M" | "F";
  bestRank: number;
  categories: CategoryKey[];
}

export interface TournamentFinal {
  category: CategoryKey;
  champion: { players: string[]; country: string };
  runnerUp: { players: string[]; country: string };
  score: string;
}

export interface Tournament {
  id: string;
  name: string;
  location: string;
  country: string;
  level: string; // 예: "Super 1000", "World Championships"
  startDate: string;
  endDate: string;
  finals: TournamentFinal[];
}

export interface MatchesFile {
  year: number;
  tournaments: Tournament[];
}
