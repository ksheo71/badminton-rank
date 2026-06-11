#!/usr/bin/env bash
# 셔틀랭크(badminton-rank) 운영 배포 스크립트 (pdfsnap/art-galleries deploy.sh 패턴).
#
# 위치: /opt/stack/services/public/myazit.kr/badminton-rank/repo/scripts/deploy.sh
#   (GitHub clone 의 일부 — 자기 자신도 git reset 으로 갱신된다)
#
# 호출 경로:
#   - GitHub Actions(.github/workflows/deploy.yml)가 main push 시 self-hosted runner 에서 실행
#   - 운영자가 맥미니에서 직접 실행해도 동일하게 동작
#
# 동작:
#   1. origin/main 강제 동기화
#   2. 호스트 node 로 데이터 배치 1회 실행(public/data 생성/갱신) — 위키피디아 실패 시 mock 폴백
#   3. docker compose up -d --build (Next.js 빌드 → badminton-rank-frontend:3200)
#   4. /healthz 헬스체크 (최대 60초)
set -euo pipefail

DEPLOY_ROOT="/opt/stack/services/public/myazit.kr/badminton-rank"
REPO_DIR="$DEPLOY_ROOT/repo"
COMPOSE_FILE="$REPO_DIR/docker-compose.yml"
CONTAINER="badminton-rank-frontend"
PORT=3200
NODE="/Users/kyle/.local/bin/node"

log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[deploy:FAIL]\033[0m %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null            || fail "docker 미설치"
docker compose version >/dev/null 2>&1  || fail "docker compose 플러그인 필요"
[ -d "$REPO_DIR/.git" ]                 || fail "repo 없음: $REPO_DIR (git clone 필요)"
[ -f "$COMPOSE_FILE" ]                  || fail "compose 없음: $COMPOSE_FILE"

cd "$REPO_DIR"

log "origin/main 동기화"
git fetch --prune origin
BEFORE_SHA=$(git rev-parse --short HEAD || echo none)
git reset --hard origin/main
AFTER_SHA=$(git rev-parse --short HEAD)
log "HEAD: $BEFORE_SHA → $AFTER_SHA"

log "데이터 배치 실행(위키피디아 → 실패 시 mock 폴백)"
mkdir -p "$REPO_DIR/public/data"
if [ -x "$NODE" ]; then
  DATA_SOURCE=wikipedia "$NODE" scripts/update-data.mjs \
    || DATA_SOURCE=mock "$NODE" scripts/update-data.mjs \
    || log "배치 실패 — 기존 데이터 유지"
else
  log "호스트 node($NODE) 없음 — 배치 건너뜀(기존 데이터 유지)"
fi

log "docker compose up -d --build --force-recreate"
docker compose -f "$COMPOSE_FILE" up -d --build --force-recreate --remove-orphans

log "dangling 이미지 정리"
docker image prune -f >/dev/null

log "$CONTAINER /healthz 헬스체크 (최대 60초)"
for i in $(seq 1 30); do
  if docker exec "$CONTAINER" wget -qO- --timeout=2 "http://127.0.0.1:$PORT/healthz" 2>/dev/null | grep -qx "ok"; then
    log "정상 (attempt $i) — deploy OK ($AFTER_SHA)"
    exit 0
  fi
  sleep 2
done

fail "/healthz 60초 내 응답 없음 — docker logs $CONTAINER 확인"
