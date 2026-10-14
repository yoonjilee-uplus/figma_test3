# CLAUDE.md — 화면 구현 하네스 (오케스트레이터 규칙)

이 저장소에서 메인 대화는 **오케스트레이터**다. 직접 구현하지 않는다.
에이전트를 부르고, 게이트 스크립트를 돌리고, 결과에 따라 다음 단계로 넘기거나 되돌린다.

경로는 `harness/config.json`을 따른다. 아래에서 `APP` = `uplus-day1-main/app`, `DOCS` = `uplus-day1-main/docs`, `OUT` = `harness/out`.

## 절대 규칙
1. 메인 대화는 `APP/src/`, `OUT/` 파일을 직접 쓰거나 고치지 않는다. 편집은 담당 에이전트·스크립트만 한다.
2. `DOCS/`, `uplus-day1-main/reference/`는 읽기만 한다. (예외: 사용자가 PRD 검토를 요청해 `prd-checker`가 승인된 수정안을 `DOCS/PRD.md`에 반영하는 경우)
3. 비주얼 값의 유일한 기준은 `DOCS/tokens.json`이다. 토큰 밖 값(숫자 px, 16진수 색, rgb/hsl, Tailwind 임의 값·간격·색 클래스, 정의되지 않은 var())은 쓰지 않는다.
4. 생성 파일(`APP/src/styles/`, `OUT/tokens/`, `OUT/report/`, `OUT/state.json`)은 손으로 고치지 않는다. 다시 만들려면 해당 스크립트를 다시 돌린다.
5. 게이트를 통과했을 때만 커밋한다. push는 사람이 승인한 뒤에만 한다.
6. 문서끼리 충돌하면 PRD.md > Design.md·tokens.json > screens.md > reference/ 순으로 따른다.

## 파이프라인
| # | 단계 | 담당 | 출력 | 게이트 |
|---|---|---|---|---|
| 1 | spec | `spec-writer` | `OUT/spec/01-spec.json` | G1 |
| 2 | pages | `page-planner` | `OUT/pages/02-pages.json` | G2 → **사람 승인** |
| 3 | tokens | `node harness/scripts/build-tokens.mjs` → `node harness/scripts/scaffold-app.mjs` → `APP`에서 `npm install` | `APP/src/styles/tokens.css`, `OUT/tokens/03-allowed-values.json`, `APP/` 뼈대 | — |
| 4 | screens | `screen-builder` (화면 1개씩, spec routes 순서) | `02-pages.json`의 `screens[].file`과 공용 파일 | G3·G4·G5·G6·G8 (`--screen <route>`) |
| 5 | verify | `gate-judge` (읽기 전용) | `OUT/report/05-report.json` (스크립트가 씀) | G1~G8 전체 + PRD 규칙 1·7 판정 |

### 단계 진행 절차
1. 시작할 때 `node harness/scripts/state.mjs show`로 다음 할 일을 확인하고 거기서부터 이어 한다.
2. 담당을 부른다. 4단계는 `screen-builder`에게 route 하나와 `02-pages.json`의 그 화면 항목을 넘긴다.
3. 게이트를 돌린다.
   - 1단계: `node harness/scripts/run-gates.mjs G1`
   - 2단계: `node harness/scripts/run-gates.mjs G2`
   - 4단계: `node harness/scripts/run-gates.mjs G3 G4 G5 G6 G8 --screen <route>`
   - 5단계: `gate-judge`를 부른다(내부에서 `run-gates.mjs all`).
4. 통과하면 `node harness/scripts/state.mjs done <단계> [route]` → `git add -A` → `git commit -m "harness(<단계>[/<화면>]): <요약>"`.
5. 실패하면 `node harness/scripts/state.mjs fail <route 또는 단계>`를 실행하고 아래 복귀 규칙대로 담당을 다시 부른다. 게이트 출력의 "무엇이 | 어디서 | 어떻게"를 그대로 넘긴다.

### 실패 시 복귀
- G4·G5·G6·G7·G8 실패, PRD 규칙 1·7 `아니오` → 4단계, **실패한 화면만** 다시 (`screen-builder`)
- G2·G3 실패 → `state.mjs reopen pages` 후 2단계
- G1 실패 → `state.mjs reopen spec` 후 1단계
- `state.mjs fail`이 종료 코드 3(STOP)을 내면 **멈추고** 사람에게 보고한다. 보고는 실패 게이트마다 "무엇이 / 어디서 / 어떻게 고칠지" 한 줄씩.

## 게이트 (`node harness/scripts/run-gates.mjs <ID...|all> [--screen <route>]`)
- G1 spec: routes 수 = PRD "화면 구조" 표 행 수, 요금제 필드 = PRD Plan 블록 필드, 요금제 값 = PRD "요금제 데이터" 표(금액·속도·문구·추천), rules에 A·B, 신청 검증 사례 8개 이상 + 기대값 = PRD 입력 규칙 + 필수 유형 7가지
- G2 pages: screens 수 = routes 수, 컴포넌트가 Design.md 4장 목록 안, 화면 파일 경로 규칙, 규칙 표시
- G3 routes: 사람 승인 기록, 라우터 `path:` 등록 = routes, 화면 파일 존재
- G4 token-only (훅에서도 실행): `APP/src` 안 토큰 밖 값 0건
- G5 rule-A ★: `Original` 0회, 금액 문자열 직접 사용 0건, 금액 필드는 monthly_price·price_after_discount만
- G6 rule-B ★: 모든 요금제에 throttle_after 키, formatThrottle 결과가 규칙 정규식과 일치, 목록·상세에서 호출 / R2 추천 1개 / R4 할인 종료 후 금액 ↔ 할인 기간 일치 / plans.json = spec plans
- G7 build·lint: `APP`에서 `tsc --noEmit`, `vite build` 종료 코드 0
- G8 apply-lock: `canSubmit()`이 spec의 신청 검증 사례 기대값과 모두 일치

★ = PRD의 "어기면 안 되는 것"을 어기면 걸리는 게이트

## 사람 승인 (1곳)
2단계 G2 통과 후, 화면별 컴포넌트·상태·이동·conflicts를 표로 보여 주고 사용자가 "승인"이라고 말하기 전에는 3단계로 가지 않는다.
승인하면 `node harness/scripts/state.mjs approve pages`. 승인하지 않으면 받은 의견을 `page-planner`에게 넘겨 2단계를 다시 돈다.

## 하네스 자체를 고칠 때
`harness/scripts/`, `harness/hooks/`, `harness/config.json`, `harness/tests/`를 고친 뒤에는 `node harness/tests/selftest.mjs`가 전부 통과해야 커밋한다. 구조는 `harness/README.md` 참고.

## 부르는 말
| 말 | 동작 |
|---|---|
| "화면 만들어줘" | `state.mjs show` 기준으로 이어서 1→5 전체 |
| "명세 뽑아줘" | 1단계 + G1 |
| "화면 나눠줘" | 2단계 + G2 + 사람 승인 요청 |
| "토큰 만들어줘" | 3단계 스크립트 |
| "<화면 이름> 만들어줘" | 4단계 해당 화면 + G3·G4·G5·G6·G8 |
| "검증해줘" | 5단계 `gate-judge` |
