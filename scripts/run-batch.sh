#!/usr/bin/env bash
# cron에서 호출하는 야간 배치 래퍼.
# - 프로젝트 경로를 자동 인식하고
# - 로그를 logs/batch-YYYY-MM-DD.log 로 남긴다.
#
# crontab 등록 예시 (매일 새벽 4시 5분):
#   5 4 * * * /Users/kyle/workspace/badminton-rank/scripts/run-batch.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# nvm/asdf 등으로 설치한 node를 cron에서도 찾도록 PATH 보강 (필요시 수정)
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -1)/bin:$PATH"

mkdir -p logs
LOG="logs/batch-$(date +%F).log"

{
  echo "===== $(date '+%F %T') 배치 시작 ====="
  # 위키피디아(BWF World Tour) 실데이터로 갱신.
  # 네트워크 불가/오프라인 폴백이 필요하면 DATA_SOURCE=mock 으로 변경.
  DATA_SOURCE=wikipedia node scripts/update-data.mjs
  echo "===== $(date '+%F %T') 배치 종료 ====="
} >>"$LOG" 2>&1
