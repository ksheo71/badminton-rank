// 배포 헬스체크용 엔드포인트 (deploy.sh 가 /healthz 응답 "ok" 확인)
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", { headers: { "content-type": "text/plain" } });
}
