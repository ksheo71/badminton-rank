import type { CategoryKey } from "./types";

// ISO alpha-2 → 국기 이모지
export function flag(code: string): string {
  if (!code || code.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(
    A + (code.toUpperCase().charCodeAt(0) - 65),
    A + (code.toUpperCase().charCodeAt(1) - 65)
  );
}

const COUNTRY_KO: Record<string, string> = {
  CN: "중국", JP: "일본", KR: "대한민국", ID: "인도네시아", DK: "덴마크",
  MY: "말레이시아", IN: "인도", TW: "대만", TH: "태국", ES: "스페인",
  FR: "프랑스", HK: "홍콩", SG: "싱가포르", GB: "영국", DE: "독일",
  VN: "베트남", CA: "캐나다", US: "미국", NL: "네덜란드",
};

export function countryName(code: string): string {
  return COUNTRY_KO[code] || code;
}

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  MS: "남자 단식",
  WS: "여자 단식",
  MD: "남자 복식",
  WD: "여자 복식",
  XD: "혼합 복식",
};

export const CATEGORY_SHORT: Record<CategoryKey, string> = {
  MS: "남단", WS: "여단", MD: "남복", WD: "여복", XD: "혼복",
};

export const CATEGORY_ORDER: CategoryKey[] = ["MS", "WS", "MD", "WD", "XD"];

export function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}
