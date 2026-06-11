// 실데이터(BWF) 소스 — 스텁.
//
// 사용법:
//   DATA_SOURCE=bwf node scripts/update-data.mjs
//
// 구현해야 할 것:
//   generate({ today }) 가 mock.mjs 와 "완전히 동일한 형태"의 데이터셋을 반환하면 된다.
//   { meta, rankings:{cat:RankingFile}, history:[HistoryFile], players:[PlayerProfile],
//     playerIndex:[PlayerIndexItem], matches:[MatchesFile] }
//   (각 타입 정의는 lib/types.ts 참고)
//
// 권장 수집 경로:
//   - 현재 랭킹: BWF 공식 랭킹 페이지(bwfbadminton.com) 또는 내부 랭킹 API 응답을
//     HTTP로 받아 파싱. 종목별(MS/WS/MD/WD/XD)로 톱100 추출.
//   - 연도별 랭킹: 연말 스냅샷을 저장해두고 누적(매일 받아 DB/파일에 적재 후 연말 확정).
//   - 대회/경기: BWF Tournament Software 결과 페이지에서 대회별 결승 결과 파싱.
//
// 주의:
//   - robots.txt / 이용약관을 확인하고, 요청 간 지연(throttle)·재시도·캐싱을 둘 것.
//   - 사이트 구조 변경에 대비해 파싱 실패 시 이전 데이터를 보존(이 파일이 throw 하면
//     update-data.mjs 가 실패 종료하므로, 부분 실패를 자체 처리하도록 설계 권장).

export async function generate(/* { today } */) {
  throw new Error(
    "BWF 실데이터 소스는 아직 구현되지 않았습니다. scripts/sources/bwf.mjs 의 generate() 를 구현하세요. " +
      "(현재는 DATA_SOURCE 없이 실행하면 mock 데이터가 사용됩니다.)"
  );
}
