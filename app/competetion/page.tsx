// 사용자가 자주 쓰는 철자 오타(competetion) → 정식 경로로 리다이렉트
import { redirect } from "next/navigation";

export default function CompetetionRedirect() {
  redirect("/competition");
}
