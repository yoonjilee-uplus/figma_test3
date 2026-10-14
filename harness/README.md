# harness — 화면 구현 하네스

`docs/`(PRD·screens·Design·tokens)를 넣으면 에이전트가 단계별로 화면을 만들고, 게이트 스크립트가 규칙 위반을 셉니다.
운영 규칙은 저장소 맨 위 `CLAUDE.md`, 경로·권한 설정은 `harness/config.json`을 따릅니다.

## 폴더 구조

```
CLAUDE.md                     오케스트레이터 규칙 (메인 대화는 구현하지 않고 부르고·검사만)
.claude/
  agents/
    spec-writer.md            1단계  PRD → out/spec/01-spec.json
    page-planner.md           2단계  spec + screens·Design → out/pages/02-pages.json
    screen-builder.md         4단계  화면 1개씩 → app/src/
    gate-judge.md             5단계  읽기 전용 판정자
  settings.json               PreToolUse 훅 연결 (Write·Edit·MultiEdit·NotebookEdit)
harness/
  config.json                 경로, 에이전트별 편집 폴더, 읽기 전용·생성 파일 목록, 컴포넌트 키트
  scripts/
    run-gates.mjs             G1~G8 게이트 실행 → out/report/05-report.json
    build-tokens.mjs          3단계  tokens.json → app/src/styles/tokens.css + out/tokens/03-allowed-values.json
    scaffold-app.mjs          3단계  app/ 뼈대 (src/ 제외)
    state.mjs                 진행 상태·승인·실패 횟수 → out/state.json
    lib/common.mjs            공용 함수
    lib/token-check.mjs       토큰 밖 값 규칙 (훅과 G4가 함께 씀)
  hooks/
    guard-write.mjs           쓰기 직전 검사: 생성 파일·docs·reference 보호, 에이전트 폴더 제한, 토큰 밖 값 거부
  tests/
    selftest.mjs              하네스 자체 테스트 (임시 폴더에서 실행, 실제 out/·app/은 건드리지 않음)
    fixtures/                 규칙을 모두 지키는 정상 예시 spec·pages·app/src
  out/                        단계별 산출물 (실행하면 생김, 커밋함)
```

## 자주 쓰는 명령

```bash
node harness/scripts/state.mjs show
```

```bash
node harness/scripts/run-gates.mjs all
```

```bash
node harness/tests/selftest.mjs
```

하네스 스크립트·훅·fixture를 고친 뒤에는 자체 테스트가 모두 통과하는지 확인합니다.
