#!/bin/bash
# 셔틀랭크 야간 배치 — 위키피디아에서 데이터를 받아 public/data/*.json 갱신.
# launchd(com.myazit.badminton.batch)가 매일 새벽 호출한다.
# 컨테이너는 public/data 를 읽기전용 마운트로 서빙하므로, 파일만 갱신하면 재시작 불필요.
set -euo pipefail

DEPLOY_ROOT="/opt/stack/services/public/myazit.kr/badminton-rank"
REPO_DIR="$DEPLOY_ROOT/repo"
NODE="/Users/kyle/.local/bin/node"
LOG="$DEPLOY_ROOT/wikipedia-batch.log"

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') badminton batch 시작 ==="
  cd "$REPO_DIR"
  mkdir -p "$REPO_DIR/public/data"
  DATA_SOURCE=wikipedia "$NODE" scripts/update-data.mjs
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') 완료 ==="
} >> "$LOG" 2>&1
