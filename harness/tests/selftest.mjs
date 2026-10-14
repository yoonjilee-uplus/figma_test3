// 하네스 자체 테스트
// 임시 폴더에 저장소 사본(harness 스크립트·훅·설정, docs, reference 앱 package.json)을 만들고
// 정상 fixture는 통과하고, 일부러 규칙을 어긴 fixture는 정확한 게이트에서 실패하는지 확인한다.
// 실제 harness/out/, app/은 건드리지 않는다.
// 사용: node harness/tests/selftest.mjs [--keep]   (--keep: 임시 폴더를 지우지 않음)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT, loadConfig } from '../scripts/lib/common.mjs'

const cfg = loadConfig()
const FIX = path.join(ROOT, 'harness', 'tests', 'fixtures')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-selftest-'))
const T = (...p) => path.join(TMP, ...p)
const OUT = T(cfg.outDir)
const SRC = T(cfg.appDir, 'src')

const write = (p, text) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text) }
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const writeJ = (p, o) => write(p, JSON.stringify(o, null, 2))
const edit = (p, fn) => write(p, fn(fs.readFileSync(p, 'utf8')))
const editJ = (p, fn) => { const o = readJ(p); fn(o); writeJ(p, o) }

// ---- 사본 만들기 ----
fs.cpSync(path.join(ROOT, 'harness', 'scripts'), T('harness', 'scripts'), { recursive: true })
fs.cpSync(path.join(ROOT, 'harness', 'hooks'), T('harness', 'hooks'), { recursive: true })
const CONFIG_TEXT = fs.readFileSync(path.join(ROOT, 'harness', 'config.json'), 'utf8') // 테스트 중 config를 바꿔도 매번 원래대로 복구
fs.cpSync(path.join(ROOT, cfg.docsDir), T(cfg.docsDir), { recursive: true })
write(T(cfg.referenceApp, 'package.json'), fs.readFileSync(path.join(ROOT, cfg.referenceApp, 'package.json')))

const run = (script, args = [], input) => {
  const r = spawnSync(process.execPath, [T('harness', ...script.split('/')), ...args], { cwd: TMP, input, encoding: 'utf8' })
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}
const gates = (...a) => run('scripts/run-gates.mjs', a)
const hook = (tool, file, toolInput, agent) =>
  run('hooks/guard-write.mjs', [], JSON.stringify({
    tool_name: tool, cwd: TMP, ...(agent ? { agent_type: agent } : {}),
    tool_input: { file_path: T(file), ...toolInput },
  }))

const SPEC = path.join(OUT, 'spec', '01-spec.json')
const PAGES = path.join(OUT, 'pages', '02-pages.json')
const SCREEN = (n) => path.join(SRC, 'screens', `${n}.tsx`)
const DISPLAY = path.join(SRC, 'lib', 'display.js')
const VALIDATE = path.join(SRC, 'lib', 'validate.js')
const PLANS = path.join(SRC, 'data', 'plans.json')

// 매 테스트 전에 "모든 게이트를 통과하는 정상 상태"로 되돌린다
function reset() {
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.rmSync(T(cfg.appDir), { recursive: true, force: true })
  write(T('harness', 'config.json'), CONFIG_TEXT)
  write(SPEC, fs.readFileSync(path.join(FIX, 'spec.json')))
  write(PAGES, fs.readFileSync(path.join(FIX, 'pages.json')))
  fs.cpSync(path.join(FIX, 'app-src'), SRC, { recursive: true })
  writeJ(PLANS, readJ(SPEC).plans)
  run('scripts/build-tokens.mjs')
  run('scripts/state.mjs', ['done', 'spec'])
  run('scripts/state.mjs', ['done', 'pages'])
  run('scripts/state.mjs', ['approve', 'pages'])
}

const results = []
function t(group, name, expect, mutate, exec, contains) {
  reset()
  mutate?.()
  const r = exec()
  const codeOk = expect === 'pass' ? r.code === 0 : expect === 'block' ? r.code === 2 : expect === 'stop' ? r.code === 3 : r.code === 1
  const textOk = !contains || r.out.includes(contains)
  results.push({ group, name, expect, ok: codeOk && textOk, code: r.code, out: r.out })
}

// ---- 3단계 토큰 ----
t('tokens', 'tokens.css에 semantic 색·간격·글자 스타일이 생성된다', 'pass', null, () => {
  const css = fs.readFileSync(path.join(SRC, 'styles', 'tokens.css'), 'utf8')
  const allowed = readJ(path.join(OUT, 'tokens', '03-allowed-values.json'))
  const ok = css.includes('--color-text-primary: #181A1B;') && css.includes('--spacing-16: 16px;') && css.includes('.ts-heading-h1 {') &&
    allowed.cssVars.includes('--radius-full') && !allowed.cssVars.includes('--color-gray-900')
  return { code: ok ? 0 : 1, out: ok ? '' : css.slice(0, 400) }
})
t('tokens', '같은 입력이면 같은 결과(결정적)', 'pass', null, () => {
  const p = path.join(SRC, 'styles', 'tokens.css')
  const a = fs.readFileSync(p, 'utf8'); run('scripts/build-tokens.mjs'); const b = fs.readFileSync(p, 'utf8')
  return { code: a === b ? 0 : 1, out: '' }
})

// ---- G1 spec ----
t('G1', '정상 spec 통과', 'pass', null, () => gates('G1'))
t('G1', '라우트 1개 누락', 'fail', () => editJ(SPEC, (s) => s.routes.pop()), () => gates('G1'), '라우트 /complete 누락')
t('G1', '요금제 필드 누락(throttle_after)', 'fail', () => editJ(SPEC, (s) => delete s.plans[0].throttle_after), () => gates('G1'), '필드 누락')
t('G1', 'PRD에 없는 필드 추가(original_price)', 'fail', () => editJ(SPEC, (s) => { s.plans[0].original_price = 1 }), () => gates('G1'), 'PRD에 없는 필드')
t('G1', '어기면 안 되는 것 B 누락', 'fail', () => editJ(SPEC, (s) => { s.rules = s.rules.filter((r) => r.id !== 'B') }), () => gates('G1'), '어기면 안 되는 것 B')
t('G1', '신청 검증 사례 5개', 'fail', () => editJ(SPEC, (s) => { s.applyCases = s.applyCases.slice(0, 5) }), () => gates('G1'), '8개 이상')
t('G1', '요금제 금액이 PRD 표와 다름(p03 59000→69000)', 'fail', () => editJ(SPEC, (s) => { s.plans[2].monthly_price = 69000 }), () => gates('G1'), 'PRD 표 금액')
t('G1', '할인 없는 요금제에 할인 종료 후 금액', 'fail', () => editJ(SPEC, (s) => { s.plans[0].price_after_discount = 45000 }), () => gates('G1'), 'p01 금액')
t('G1', '할인 종료 후 금액을 null로 누락(p03)', 'fail', () => editJ(SPEC, (s) => { s.plans[2].price_after_discount = null }), () => gates('G1'), 'p03 금액')
t('G1', '소진 후 속도가 PRD 표와 다름(p04 null→5Mbps)', 'fail', () => editJ(SPEC, (s) => { s.plans[3].throttle_after = '5Mbps' }), () => gates('G1'), 'p04.throttle_after')
t('G1', '이름·데이터 문구가 PRD 표와 다름', 'fail', () => editJ(SPEC, (s) => { s.plans[2].data = '100GB' }), () => gates('G1'), 'p03.data')
t('G1', '추천 요금제가 PRD와 다름(p01)', 'fail', () => editJ(SPEC, (s) => { s.plans[0].recommended = true; s.plans[1].recommended = false }), () => gates('G1'), 'recommended=true')
t('G1', '요금제 1개 누락', 'fail', () => editJ(SPEC, (s) => { s.plans.pop() }), () => gates('G1'), '요금제 p04 누락')
t('G1', '사례 기대값이 PRD 입력 규칙과 다름(하이픈 false)', 'fail', () => editJ(SPEC, (s) => { s.applyCases[5].expected = false }), () => gates('G1'), '기대값')
t('G1', '하이픈 포함 사례 누락', 'fail', () => editJ(SPEC, (s) => { s.applyCases[5] = { ...s.applyCases[0] } }), () => gates('G1'), '"하이픈 포함 번호" 유형 없음')
t('G1', '이름 21자 사례 누락', 'fail', () => editJ(SPEC, (s) => { s.applyCases[2] = { ...s.applyCases[0], name: '가가' } }), () => gates('G1'), '"이름 21자" 유형 없음')
t('G1', '동의 안 함 사례가 다른 조건도 어긋남(원인 둘)', 'fail', () => editJ(SPEC, (s) => { s.applyCases[6].phone = '0101234567' }), () => gates('G1'), '"동의 안 함" 유형 없음')

// ---- G2 pages ----
t('G2', '정상 pages 통과', 'pass', null, () => gates('G2'))
t('G2', 'Design.md에 없는 컴포넌트(Modal)', 'fail', () => editJ(PAGES, (p) => p.screens[0].components.push('Modal')), () => gates('G2'), 'Design.md에 없는 컴포넌트 "Modal"')
t('G2', '화면 파일 경로 규칙 위반', 'fail', () => editJ(PAGES, (p) => { p.screens[0].file = 'uplus-day1-main/app/src/Plans.tsx' }), () => gates('G2'), '경로 규칙 위반')
t('G2', '화면 수 ≠ 라우트 수', 'fail', () => editJ(PAGES, (p) => p.screens.pop()), () => gates('G2'), '화면 3개 ≠ 라우트 4개')
t('G2', '규칙 A·B 표시 누락', 'fail', () => editJ(PAGES, (p) => { p.screens[0].rules = [] }), () => gates('G2'), '표시 누락')

// ---- G3 routes ----
t('G3', '정상 통과', 'pass', null, () => gates('G3'))
t('G3', '사람 승인 전이면 실패', 'fail', () => run('scripts/state.mjs', ['reopen', 'pages']), () => gates('G3'), '승인하지 않음')
t('G3', '화면 파일 없음', 'fail', () => fs.rmSync(SCREEN('CompletePage')), () => gates('G3'), '화면 파일 없음')
t('G3', '--screen으로 범위를 좁히면 아직 없는 화면은 무시', 'pass', () => fs.rmSync(SCREEN('CompletePage')), () => gates('G3', '--screen', '/plans'))
t('G3', '라우터에 경로 누락', 'fail', () => edit(path.join(SRC, 'routes.tsx'), (s) => s.replace('{ path: "/apply" },', '')), () => gates('G3'), '라우터에 /apply 없음')

// ---- G4 token-only ----
t('G4', '정상 통과', 'pass', null, () => gates('G4'))
t('G4', '16진수 색', 'fail', () => edit(SCREEN('PlansPage'), (s) => s.replace("'var(--color-bg-default)'", "'#F7F7F7'")), () => gates('G4'), '16진수 색')
t('G4', '숫자 px', 'fail', () => edit(SCREEN('PlansPage'), (s) => s.replace("'var(--spacing-16)'", "'16px'")), () => gates('G4'), '숫자 단위 값')
t('G4', 'style 숫자 값(padding: 16)', 'fail', () => edit(SCREEN('PlansPage'), (s) => s.replace("'var(--spacing-16)'", '16')), () => gates('G4'), 'style 속성의 숫자 값')
t('G4', 'Tailwind 간격 클래스(p-4)', 'fail', () => edit(SCREEN('PlansPage'), (s) => s.replace('className="flex flex-col"', 'className="flex flex-col p-4"')), () => gates('G4'), '"p-4"')
t('G4', 'Tailwind 임의 값(w-[13px])', 'fail', () => edit(SCREEN('CompletePage'), (s) => s.replace('items-center', 'items-center w-[13px]')), () => gates('G4'), '임의 값')
t('G4', 'primitive 변수 직접 사용', 'fail', () => edit(SCREEN('PlansPage'), (s) => s.replace('--color-bg-default', '--color-gray-100')), () => gates('G4'), '정의되지 않은 변수 --color-gray-100')
t('G4', '주석 속 16px는 무시', 'pass', () => edit(SCREEN('CompletePage'), (s) => `// 여백은 16px처럼 직접 쓰지 않는다\n${s}`), () => gates('G4'))

// ---- G5 rule-A ----
t('G5', '정상 통과', 'pass', null, () => gates('G5'))
t('G5', '정가(Original) 속성 사용', 'fail', () => edit(SCREEN('PlansPage'), (s) => s.replace('<h2 className', '<h2 Original={"x"} className')), () => gates('G5'), '금지 속성 Original')
t('G5', '금액 문자열 직접 사용', 'fail', () => edit(SCREEN('PlanDetailPage'), (s) => s.replace('{formatPrice(plan.monthly_price)}', '59,000원')), () => gates('G5'), '금액 문자열을 직접 씀')
t('G5', '허용되지 않은 금액 필드', 'fail', () => edit(SCREEN('PlansPage'), (s) => s.replace('plan.monthly_price', 'plan.original_price')), () => gates('G5'), '.original_price')

// ---- G6 rule-B + R2·R4 ----
t('G6', '정상 통과', 'pass', null, () => gates('G6'))
t('G6', 'formatThrottle 문구가 규칙과 다름', 'fail', () => edit(DISPLAY, (s) => s.replace('로 제한`', ' 제한`')), () => gates('G6'), '형식과 다름')
t('G6', '상세 화면이 formatThrottle을 안 씀', 'fail', () => edit(SCREEN('PlanDetailPage'), (s) => s.replace('{formatThrottle(plan)}', '{plan.data}')), () => gates('G6'), '/plans/[id] 화면이 formatThrottle()')
t('G6', 'plans.json이 spec과 다름', 'fail', () => editJ(PLANS, (p) => { p[0].monthly_price = 1 }), () => gates('G6'), 'plans.json이 01-spec.json')
t('G6', '추천 2개 (R2)', 'fail', () => { editJ(SPEC, (s) => { s.plans[0].recommended = true }); editJ(PLANS, (p) => { p[0].recommended = true }) }, () => gates('G6'), '규칙 R2')
t('G6', '할인 없는데 할인 종료 후 문구 (R4)', 'fail', () => edit(DISPLAY, (s) => s.replace('plan.price_after_discount == null ? null :', '')), () => gates('G6'), '규칙 R4')
t('G6', '--screen /apply 이면 상세 화면 호출 검사는 건너뜀', 'pass', () => edit(SCREEN('PlanDetailPage'), (s) => s.replace('{formatThrottle(plan)}', '{plan.data}')), () => gates('G6', '--screen', '/apply'))

// ---- G7 build·lint ----
t('G7', '패키지 미설치면 실패하고 설치 안내', 'fail', () => run('scripts/scaffold-app.mjs'), () => gates('G7'), 'npm install')

// ---- G8 apply-lock ----
t('G8', '정상 통과', 'pass', null, () => gates('G8'))
t('G8', '동의 없이도 신청 가능(버그)', 'fail', () => edit(VALIDATE, (s) => s.replace(' && agreed === true', '')), () => gates('G8'), '사례 7')
t('G8', '하이픈 번호를 거부(버그)', 'fail', () => edit(VALIDATE, (s) => s.replace("/\\D/g, ''", "/ /g, ''")), () => gates('G8'), '사례 6')

// ---- 전체 ----
t('all', '정상 상태에서 G1~G6·G8 모두 통과', 'pass', null, () => gates('G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G8'))
t('all', '보고서 05-report.json 생성', 'pass', null, () => {
  gates('G1')
  const p = path.join(OUT, 'report', '05-report.json')
  return { code: fs.existsSync(p) && readJ(p).gates[0].id === 'G1' ? 0 : 1, out: '' }
})

// ---- 훅 guard-write ----
const okTsx = "export const X = () => <div style={{ padding: 'var(--spacing-16)' }} />\n"
t('hook', '메인 대화가 docs/PRD.md 수정 → 거부', 'block', null, () => hook('Edit', `${cfg.docsDir}/PRD.md`, { old_string: 'a', new_string: 'b' }), '읽기 전용')
t('hook', 'prd-checker가 docs/PRD.md 수정 → 허용', 'pass', null, () => hook('Edit', `${cfg.docsDir}/PRD.md`, { old_string: 'a', new_string: 'b' }, 'prd-checker'))
t('hook', 'prd-checker가 screens.md 수정 → 거부', 'block', null, () => hook('Edit', `${cfg.docsDir}/screens.md`, { old_string: 'a', new_string: 'b' }, 'prd-checker'), '안만 편집')
t('hook', 'reference 수정 → 거부', 'block', null, () => hook('Write', `${cfg.referenceDir}/flow.md`, { content: 'x' }), '읽기 전용')
t('hook', '생성 파일 tokens.css 수정 → 거부', 'block', null, () => hook('Write', `${cfg.appDir}/src/styles/tokens.css`, { content: 'x' }, 'screen-builder'), '생성 파일')
t('hook', '생성 파일 state.json 수정 → 거부', 'block', null, () => hook('Write', `${cfg.outDir}/state.json`, { content: '{}' }), '생성 파일')
t('hook', 'screen-builder가 spec 폴더 수정 → 거부', 'block', null, () => hook('Write', `${cfg.outDir}/spec/01-spec.json`, { content: '{}' }, 'screen-builder'), '안만 편집')
t('hook', 'spec-writer가 spec 폴더 수정 → 허용', 'pass', null, () => hook('Write', `${cfg.outDir}/spec/01-spec.json`, { content: '{}' }, 'spec-writer'))
t('hook', 'page-planner가 app/src 수정 → 거부', 'block', null, () => hook('Write', `${cfg.appDir}/src/x.tsx`, { content: okTsx }, 'page-planner'), '안만 편집')
t('hook', 'screen-builder 정상 코드 → 허용', 'pass', null, () => hook('Write', `${cfg.appDir}/src/screens/X.tsx`, { content: okTsx }, 'screen-builder'))
t('hook', 'screen-builder 16진수 색 → 거부(G4)', 'block', null, () => hook('Write', `${cfg.appDir}/src/screens/X.tsx`, { content: "const c = '#FF2E98'\n" }, 'screen-builder'), '토큰 밖 값')
t('hook', 'Edit new_string의 px → 거부(G4)', 'block', null, () => hook('Edit', `${cfg.appDir}/src/screens/X.tsx`, { old_string: 'a', new_string: "style={{ margin: '8px' }}" }, 'screen-builder'), '숫자 단위 값')
t('hook', 'MultiEdit의 Tailwind 색 클래스 → 거부(G4)', 'block', null, () => hook('MultiEdit', `${cfg.appDir}/src/screens/X.tsx`, { edits: [{ old_string: 'a', new_string: '<p className="text-pink-500" />' }] }, 'screen-builder'), 'text-pink-500')
t('hook', '저장소 밖 파일 → 관여 안 함', 'pass', null, () => run('hooks/guard-write.mjs', [], JSON.stringify({ tool_name: 'Write', cwd: TMP, tool_input: { file_path: path.join(os.tmpdir(), 'elsewhere.txt'), content: '#fff' } })))

// ---- state ----
t('state', '같은 화면 3회 연속 실패 → STOP(종료 코드 3)', 'stop', null, () => {
  run('scripts/state.mjs', ['fail', '/plans']); run('scripts/state.mjs', ['fail', '/plans'])
  return run('scripts/state.mjs', ['fail', '/plans'])
}, 'STOP')
t('state', 'show가 다음 할 일을 단계 순서대로 알려준다', 'pass', null, () => {
  const a = run('scripts/state.mjs', ['show']).out
  run('scripts/state.mjs', ['done', 'tokens'])
  const b = run('scripts/state.mjs', ['show']).out
  run('scripts/state.mjs', ['done', 'screens', '/plans'])
  const c = run('scripts/state.mjs', ['show']).out
  const ok = a.includes('다음: 3단계 tokens') && b.includes('4단계 screens: /plans ') && c.includes('4단계 screens: /plans/[id]')
  return { code: ok ? 0 : 1, out: `${a}\n${b}\n${c}` }
})
t('state', '2단계 완료 후 승인 전이면 승인 대기를 알려준다', 'pass', () => run('scripts/state.mjs', ['reopen', 'pages']), () => {
  run('scripts/state.mjs', ['done', 'pages'])
  const r = run('scripts/state.mjs', ['show'])
  return { code: r.out.includes('사람 승인 대기') ? 0 : 1, out: r.out }
})
t('state', '2단계가 안 끝났으면 approve 거부', 'pass', () => fs.rmSync(path.join(OUT, 'state.json')), () => {
  const r = run('scripts/state.mjs', ['approve', 'pages'])
  return { code: r.code === 2 ? 0 : 1, out: r.out }
})

// ---- scaffold ----
t('scaffold', 'componentKit이 있으면 키트 의존성 포함', 'pass', () => editJ(T('harness', 'config.json'), (c) => { c.componentKit = { package: '@make-kits/lg', version: '1.0.1' } }), () => {
  run('scripts/scaffold-app.mjs')
  const pkg = readJ(T(cfg.appDir, 'package.json'))
  return { code: pkg.dependencies['@make-kits/lg'] && pkg.scripts.lint === 'tsc --noEmit' ? 0 : 1, out: JSON.stringify(pkg) }
})
t('scaffold', 'componentKit: null이면 키트 의존성 제거', 'pass', () => editJ(T('harness', 'config.json'), (c) => { c.componentKit = null }), () => {
  run('scripts/scaffold-app.mjs')
  const pkg = readJ(T(cfg.appDir, 'package.json'))
  return { code: Object.keys(pkg.dependencies).some((k) => k.startsWith('@make-kits/')) ? 1 : 0, out: JSON.stringify(pkg.dependencies) }
})
t('scaffold', '이미 있는 파일은 덮어쓰지 않음', 'pass', () => write(T(cfg.appDir, 'index.html'), 'KEEP'), () => {
  run('scripts/scaffold-app.mjs')
  return { code: fs.readFileSync(T(cfg.appDir, 'index.html'), 'utf8') === 'KEEP' ? 0 : 1, out: '' }
})

// ---- 결과 ----
let groupPrev = ''
for (const r of results) {
  if (r.group !== groupPrev) { console.log(`\n[${r.group}]`); groupPrev = r.group }
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}  (기대 ${r.expect}, 종료 코드 ${r.code})`)
  if (!r.ok) console.log(r.out.split('\n').slice(0, 8).map((l) => `      | ${l}`).join('\n'))
}
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length}개 중 ${results.length - failed}개 통과, ${failed}개 실패`)
if (process.argv.includes('--keep')) console.log(`임시 폴더: ${TMP}`)
else fs.rmSync(TMP, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
