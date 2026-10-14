// 화면 경로 목록. path는 01-spec.json routes와 같은 문자열을 쓴다.
// screen은 src/screens/<screen>.tsx 의 default export 파일 이름이다.
export const routes = [
  { path: "/plans", screen: "PlansPage" },
  { path: "/plans/[id]", screen: "PlanDetailPage" },
  { path: "/apply", screen: "ApplyPage" },
  { path: "/complete", screen: "CompletePage" },
];
