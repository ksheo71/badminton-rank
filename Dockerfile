# 셔틀랭크(badminton-rank) — Next.js 프로덕션 이미지.
# 맥미니 운영: docker compose 가 이 Dockerfile 로 빌드 → next start (포트 3200).
# 데이터(public/data)는 이미지에 포함하지 않고, 호스트 야간 배치가 생성한 파일을
# 볼륨 마운트로 주입한다(docker-compose.yml 참고).

# ---- 빌드 단계 ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- 실행 단계 ----
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3200
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
EXPOSE 3200
CMD ["npm", "run", "start", "--", "-p", "3200", "-H", "0.0.0.0"]
