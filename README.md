# 🏸 셔틀랭크 — 세계 배드민턴 랭킹 대시보드

세계 배드민턴 상위권 선수들의 **시즌 성적 순위 / 연도별 랭킹 / 대회·경기 결과**를 한눈에 보는 대시보드입니다.
**야간 배치(cron)** 로 매일 데이터를 갱신합니다.

**데이터 출처: 위키피디아 (영문 "{연도} BWF World Tour" 문서)** — 무료·합법(공개 API)이며 BWF 사이트를 직접 긁지 않습니다.

> ⚠️ **순위에 대한 중요한 전제**
> 여기서 "랭킹"은 **BWF 공식 주간 랭킹이 아닙니다.** BWF 공식 랭킹은 무료로 접근할 방법이 없어(공식 사이트는 봇 차단),
> 대신 위키피디아의 **실제 대회 결과**(우승/준우승)에 대회 등급별 포인트를 부여·합산한 **"시즌 성적 순위"** 를 산출해 보여줍니다.
> 즉 *대회 성적 기반의 시즌 랭킹*이며, 선수 이름·국가·대회 결과·스코어는 모두 **실제 데이터**입니다.

## 기술 스택

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (다크 대시보드 테마)
- **Recharts** (연도별 랭킹 추이 차트)
- 데이터 배치: 순수 Node 스크립트(`scripts/`), 외부 의존성 없음(Node 18+ 내장 `fetch` 사용)

## 동작 구조

```
scripts/update-data.mjs ─(생성)→ public/data/*.json ─(fetch)→ 프론트엔드(브라우저)
        ▲
   scripts/sources/{wikipedia,mock}.mjs   ← 데이터 소스 (DATA_SOURCE 로 선택)
```

핵심: **배치가 `public/data/` 의 JSON을 덮어쓰고, 프론트는 그 JSON을 `fetch`** 합니다.
따라서 매일 배치만 돌리면 **재빌드·재배포 없이** 최신 데이터가 반영됩니다.

데이터 소스(`DATA_SOURCE` 환경변수):

| 값 | 설명 |
|---|---|
| `wikipedia` (기본) | 위키피디아 BWF World Tour 실데이터 (네트워크 필요) |
| `mock` | 합성 데모 데이터 (오프라인/개발용 폴백) |

생성되는 파일:

| 경로 | 내용 |
|---|---|
| `public/data/meta.json` | 메타(갱신시각, 출처, 연도 목록, 종목, 선수 수 등) |
| `public/data/rankings/{MS,WS,MD,WD,XD}.json` | 종목별 **최신 시즌** 순위 (전년 대비 변동 포함) |
| `public/data/history/{year}.json` | **연도별 시즌** 순위 (전 종목, 상위 50) |
| `public/data/players/index.json` | 선수 색인(목록/검색용) |
| `public/data/players/{id}.json` | 선수 상세(연도별 순위 이력, 결승 전적, 최근 결승) |
| `public/data/matches/{year}.json` | 연도별 대회·결승 결과(우승/준우승/스코어) |

## 빠른 시작

```bash
npm install
npm run batch      # 1) 위키피디아 실데이터 생성 (최초 1회 필수, 약 10~20초)
npm run dev        # 2) 개발 서버 → http://localhost:3000
```

오프라인이거나 빠르게 보고 싶으면: `npm run batch:mock`

프로덕션:

```bash
npm run build && npm run start
```

## 페이지

- `/` — **대시보드**: 요약 통계, 국가별 강세, 종목별 최신 시즌 톱10
- `/rankings` — **랭킹**: 종목 탭 + (최신 시즌 / 연도별) 전환
- `/players` — **선수**: 이름 검색, 성별·국가 필터 (수백 명)
- `/players/[id]` — **선수 상세**: 연도별 순위 추이 차트, 결승 전적, 최근 결승
- `/matches` — **대회·경기**: 연도 선택, 대회별 5개 종목 결승(우승/준우승/스코어)

## 야간 배치 (cron)

`scripts/run-batch.sh` 가 경로 인식 + 로그 기록까지 처리하는 래퍼입니다(기본으로 `wikipedia` 소스 사용).

```bash
crontab -e
# 매일 새벽 4시 5분 실행
5 4 * * * /Users/kyle/workspace/badminton-rank/scripts/run-batch.sh
```

- 로그: `logs/batch-YYYY-MM-DD.log`
- node 경로 문제가 나면 `scripts/run-batch.sh` 의 `PATH` 줄을 환경에 맞게 수정하세요.
- 수동 실행/검증: `bash scripts/run-batch.sh` 또는 `npm run batch`

> 서버(`npm run dev`/`start`)가 떠 있는 상태로 배치를 돌려도 됩니다.
> 브라우저는 `cache: "no-store"` 로 항상 최신 JSON을 읽으므로 **재시작이 필요 없습니다.**

## 데이터 수집 방식 (위키피디아)

`scripts/sources/wikipedia.mjs` 의 `generate()`:

1. 연도별로 영문 위키 `{연도} BWF World Tour` 문서의 **전체 위키텍스트를 1회** 받음(연 1회 호출, 백오프 재시도, 한 해 실패 시 건너뜀).
2. **Finals(월별) 표**를 파싱 → 대회별 우승/준우승/스코어/등급/개최지 추출 → 대회·경기 결과.
3. 그 결과에 대회 등급별 포인트(Super 1000/750/500/300/100, World Tour Finals)를 부여·합산 → **종목/연도별 시즌 성적 순위** 산출.
4. 순위 등장 선수로 **선수 프로필**(연도별 순위 이력, 결승 전적, 최근 결승) 구성.

조정 포인트:
- 포인트 가중치: `LEVEL_POINTS`
- IOC 코드/국가명 → 국기용 alpha-2 매핑: `IOC2`, `NAME2`
- 수집 시작 연도: `startYear`(기본 2018, BWF World Tour 출범)

## 다른 소스로 확장

`scripts/sources/<name>.mjs` 에 `generate({ today })` 를 추가하고(반환 형태는 `lib/types.ts`),
`DATA_SOURCE=<name>` 으로 실행하면 됩니다. 참고용 스텁:
- `scripts/sources/bwf.mjs` — BWF 직접 스크래핑(미구현, 공식 사이트 봇 차단 주의)

## 디렉토리

```
app/                    # Next.js 페이지 (대시보드/랭킹/선수/경기)
components/              # UI 컴포넌트 (테이블, 차트, 탭 등)
lib/                    # 타입, 포맷 유틸, 데이터 fetch 훅
scripts/
  update-data.mjs       # 배치 진입점 (JSON 기록)
  run-batch.sh          # cron 래퍼 (로그 포함)
  sources/wikipedia.mjs # 위키피디아 실데이터 소스 (기본)
  sources/mock.mjs      # 합성 데모 데이터 (폴백)
  sources/bwf.mjs       # BWF 직접 스크래핑 (스텁)
public/data/            # 배치 산출물 (매일 덮어씀)
```

## 한계 / 메모

- **현재 랭킹 = 최신 시즌(올해) 누적 성적** 기준이라, BWF 공식 주간 랭킹과는 다릅니다.
- 위키피디아 대회 페이지는 자원봉사 에디터가 갱신하므로 **최근 대회는 며칠 지연**될 수 있습니다.
- 선수 생년/나이는 위키 대회 문서에 없어 표시하지 않습니다(추후 Wikidata로 보강 가능).
- 표 형식이 연도마다 조금씩 달라 일부 파싱 누락이 있을 수 있습니다(대회 결과·시즌 순위는 안정적).
