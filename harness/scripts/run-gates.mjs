// 게이트 실행기
// 사용: node harness/scripts/run-gates.mjs <G1..G8 | all> [--screen <route>]
//   --screen: 4단계에서 화면 1개만 만든 직후, 아직 안 만든 화면 때문에 실패하지 않도록 범위를 그 화면으로 좁힌다.
// 결과: 콘솔에 게이트별 PASS/FAIL과 "무엇이 | 어디서 | 어떻게", harness/out/report/05-report.json. 하나라도 실패하면 종료 코드 1.
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { loadConfig, outPaths, appPath, abs, exists, readText, readJSON, writeJSON, walk, maskComments } from './lib/common.mjs'
import { checkTokens, CODE_EXTS } from './lib/token-check.mjs'

const cfg = loadConfig()
const P = outPaths(cfg)
const BACK = { G1: 'spec', G2: 'pages', G3: 'pages', G4: 'screens', G5: 'screens', G6: 'screens', G7: 'screens', G8: 'screens' }
const RULE_KINDS = ['price-fields', 'throttle-text', 'single-flag', 'paired-null']
const SRC = `${cfg.appDir}/src`
const JS_EXTS = ['.ts', '.tsx', '.js', '.jsx']
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function add(g, what, where, fix, route = '-') {
  g.pass = false
  g.issues.push({ what, where, fix, route })
}

let pagesCache
function routeOf(file) {
  pagesCache ??= exists(P.pages) ? readJSON(P.pages) : { screens: [] }
  return pagesCache.screens.find((s) => s.file === file)?.route ?? '-'
}

// ---- 문서에서 기준값 읽기 (서비스 이름·라우트를 스크립트에 박지 않는다) ----
function prdRoutes() {
  const text = readText(`${cfg.docsDir}/PRD.md`)
  const start = text.indexOf('### 화면 구조')
  if (start < 0) return []
  const after = text.slice(start + 1)
  const end = after.search(/\n#{2,3} /)
  const block = end < 0 ? after : after.slice(0, end)
  return [...block.matchAll(/^\|[^|\n]*\|[^|\n]*\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1])
}

// PRD 5장 Plan 블록: [{ field, comment }]
function prdPlanBlock() {
  const lines = readText(`${cfg.docsDir}/PRD.md`).split(/\r?\n/)
  const i = lines.findIndex((l) => /^Plan:/.test(l))
  if (i < 0) return []
  const fields = []
  for (let j = i + 1; j < lines.length; j++) {
    const m = lines[j].match(/^\s{2,}(\w+):[^#]*(?:#\s*(.*))?$/)
    if (!m) break
    fields.push({ field: m[1], comment: m[2] ?? '' })
  }
  return fields
}
const prdPlanFields = () => prdPlanBlock().map((f) => f.field)

// PRD "요금제 데이터" 표: id(첫 열) → 칸 목록. 표가 없으면 null
function prdPlanRows() {
  const text = readText(`${cfg.docsDir}/PRD.md`)
  const start = text.indexOf('### 요금제 데이터')
  if (start < 0) return null
  const after = text.slice(start + 1)
  const end = after.search(/\n#{2,3} /)
  const block = end < 0 ? after : after.slice(0, end)
  const lines = block.split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|[\s:|-]+\|?\s*$/.test(l)).slice(1) // 머리글 행 제외
  const rows = new Map()
  for (const l of lines) {
    const cells = l.split('|').slice(1, -1).map((c) => c.trim())
    rows.set(cells[0], cells)
  }
  return rows
}

// PRD 4-3 "입력 규칙" 문장에서 이름 길이·번호 접두사·자릿수를 읽는다. 못 찾으면 null
function prdApplyRule() {
  const line = readText(`${cfg.docsDir}/PRD.md`).split(/\r?\n/).find((l) => l.includes('입력 규칙:'))
  const name = line?.match(/이름은[^.]*?(\d+)~(\d+)자/)
  const phone = line?.match(/(\d+)으로 시작하는 (\d+)자리/)
  if (!name || !phone) return null
  return { min: +name[1], max: +name[2], prefix: phone[1], len: +phone[2] }
}

// 요금제 값이 PRD 표·Plan 블록과 같은지 (필드 이름만이 아니라 값까지)
function checkPlanValues(g, spec) {
  const PRD = `${cfg.docsDir}/PRD.md`
  const rows = prdPlanRows()
  if (!rows?.size) return add(g, 'PRD "요금제 데이터" 표를 찾지 못함', PRD, 'PRD 4장에 ### 요금제 데이터 표를 두고 첫 열을 id로 한다')
  const plans = spec.plans ?? []
  const ids = plans.map((p) => p.id)
  for (const id of [...rows.keys()].filter((x) => !ids.includes(x))) add(g, `요금제 ${id} 누락`, P.spec, 'PRD 요금제 데이터 표의 행마다 plans 1개')
  for (const id of ids.filter((x) => !rows.has(x))) add(g, `PRD 표에 없는 요금제 ${id}`, P.spec, 'plans에서 지운다')

  const rules = spec.rules ?? []
  const priceFields = rules.find((r) => r.kind === 'price-fields')?.allowedPriceFields ?? []
  const speedField = rules.find((r) => r.kind === 'throttle-text')?.field
  const unit = plans.map((p) => String(p[speedField] ?? '').match(/^[\d.]+(\D+)$/)?.[1]).find(Boolean)
  const num = (s) => new RegExp(`(?<![\\d,.])${esc(s)}(?![\\d,])`)
  const sortJ = (a) => JSON.stringify([...a].sort())

  for (const p of plans) {
    const cells = rows.get(p.id)
    if (!cells) continue
    const row = cells.join(' | ')
    const fix = `PRD 표 ${p.id} 행: ${row}`
    for (const [k, v] of Object.entries(p)) {
      if (k === 'id' || k === speedField || v == null || typeof v === 'boolean') continue // 속도는 아래에서 따로 비교
      const ok = typeof v === 'number' ? num(v.toLocaleString('en-US')).test(row) || num(String(v)).test(row) : cells.includes(String(v)) // 문자열은 칸 전체가 같아야 함
      if (!ok) add(g, `요금제 ${p.id}.${k} = ${JSON.stringify(v)}가 PRD 표에 없음`, P.spec, fix)
    }
    // 반대 방향: 표에 있는 금액·속도가 spec에서 빠지거나 null이면 안 된다
    if (priceFields.length) {
      const want = [...row.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)원/g)].map((m) => Number(m[1].replace(/,/g, '')))
      const got = priceFields.map((f) => p[f]).filter((v) => v != null)
      if (sortJ(want) !== sortJ(got)) add(g, `요금제 ${p.id} 금액 [${got}] ≠ PRD 표 금액 [${want}]`, P.spec, `${priceFields.join('·')}를 표와 맞춘다 (없음은 null). ${fix}`)
    }
    if (speedField && unit) {
      const want = row.match(new RegExp(`\\d+(?:\\.\\d+)?${esc(unit)}`, 'g')) ?? []
      const got = p[speedField] == null ? [] : [String(p[speedField])]
      if (sortJ(want) !== sortJ(got)) add(g, `요금제 ${p.id}.${speedField} ${JSON.stringify(p[speedField])} ≠ PRD 표 [${want}]`, P.spec, `제한 없음은 null. ${fix}`)
    }
  }

  // boolean 필드: Plan 블록 주석이 "p02만 true"처럼 id를 짚으면 그 요금제만 true
  for (const { field, comment } of prdPlanBlock()) {
    const named = [...rows.keys()].filter((id) => num(id).test(comment))
    if (!named.length || !/true/.test(comment) || !plans.some((p) => typeof p[field] === 'boolean')) continue
    const got = plans.filter((p) => p[field] === true).map((p) => p.id)
    if (sortJ(got) !== sortJ(named)) add(g, `${field}=true 요금제 [${got}] ≠ PRD [${named}]`, P.spec, `PRD Plan 블록 주석: "${comment}"`)
  }
}

// 신청 검증 사례: 기대값이 PRD 입력 규칙과 같은지 + 필수 유형이 모두 있는지
function checkApplyCases(g, cases) {
  const rule = prdApplyRule()
  if (!rule) return add(g, 'PRD 4-3 "입력 규칙"에서 이름 길이·번호 규칙을 찾지 못함', `${cfg.docsDir}/PRD.md`, '"이름은 … 1~20자", "010으로 시작하는 11자리" 형식 문장을 둔다')
  const { min, max, prefix, len } = rule
  const digits = (c) => String(c.phone ?? '').replace(/\D/g, '')
  const nameOk = (c) => { const n = String(c.name ?? '').trim().length; return n >= min && n <= max }
  const phoneOk = (c) => digits(c).length === len && digits(c).startsWith(prefix)
  const valid = (c) => nameOk(c) && phoneOk(c) && c.agreed === true

  for (const [i, c] of cases.entries()) {
    if (typeof c.expected === 'boolean' && c.expected !== valid(c))
      add(g, `사례 ${i + 1} 기대값 ${c.expected} ≠ PRD 입력 규칙 ${valid(c)} (${JSON.stringify(c)})`, P.spec, `이름 앞뒤 공백 제거 후 ${min}~${max}자, 번호는 숫자만 남겨 ${prefix}로 시작하는 ${len}자리, 동의 true일 때만 true`)
  }

  // 각 유형은 해당 조건 하나만 어긋나고 나머지는 정상이어야 한다 (원인을 하나로 좁히기 위해)
  const rest = (c) => phoneOk(c) && c.agreed === true
  const types = [
    ['정상', (c) => valid(c) && /^\d+$/.test(String(c.phone))],
    ['이름 공백만', (c) => String(c.name ?? '').length > 0 && !String(c.name).trim() && rest(c)],
    [`이름 ${max + 1}자`, (c) => String(c.name ?? '').trim().length === max + 1 && rest(c)],
    [`번호 ${len - 1}자리`, (c) => nameOk(c) && c.agreed === true && /^\d+$/.test(String(c.phone)) && digits(c).length === len - 1],
    [`${prefix}이 아닌 접두사`, (c) => nameOk(c) && c.agreed === true && digits(c).length === len && !digits(c).startsWith(prefix)],
    ['하이픈 포함 번호', (c) => nameOk(c) && c.agreed === true && String(c.phone).includes('-') && phoneOk(c)],
    ['동의 안 함', (c) => nameOk(c) && phoneOk(c) && c.agreed === false],
  ]
  for (const [label, hit] of types) if (!cases.some(hit)) add(g, `신청 검증 사례에 "${label}" 유형 없음`, P.spec, '이 조건 하나만 어긋나고 나머지는 정상인 사례를 추가한다')
}

function designComponents() {
  const text = readText(`${cfg.docsDir}/Design.md`)
  const start = text.search(/^## .*컴포넌트/m)
  if (start < 0) return []
  const after = text.slice(start + 1)
  const end = after.search(/^## /m)
  const block = end < 0 ? after : after.slice(0, end)
  return [...block.matchAll(/^####\s+`([^`]+)`/gm)].map((m) => m[1])
}

async function importFresh(p) {
  return import(pathToFileURL(abs(p)).href + `?t=${Date.now()}`)
}

// ---- 게이트 ----
function G1(g) {
  if (!exists(P.spec)) return add(g, '01-spec.json 없음', P.spec, '1단계 spec-writer를 실행한다')
  const spec = readJSON(P.spec)

  const want = prdRoutes()
  const got = (spec.routes ?? []).map((r) => r.path)
  if (!want.length) add(g, 'PRD "화면 구조" 표에서 라우트를 찾지 못함', `${cfg.docsDir}/PRD.md`, 'PRD 3장 화면 구조 표의 라우트 열을 `/경로` 형식으로 둔다')
  else {
    if (got.length !== want.length) add(g, `spec 라우트 ${got.length}개 ≠ PRD 라우트 ${want.length}개`, P.spec, 'PRD 화면 구조 표의 행마다 routes 1개')
    for (const r of want.filter((x) => !got.includes(x))) add(g, `라우트 ${r} 누락`, P.spec, 'routes에 추가한다')
    for (const r of got.filter((x) => !want.includes(x))) add(g, `PRD에 없는 라우트 ${r}`, P.spec, 'routes에서 지운다')
  }

  const fields = prdPlanFields()
  if (!fields.length) add(g, 'PRD 5장 Plan 블록의 필드를 찾지 못함', `${cfg.docsDir}/PRD.md`, 'PRD 5장 yaml에 Plan: 블록을 둔다')
  if (!spec.plans?.length) add(g, 'plans가 비어 있음', P.spec, 'PRD 요금제 데이터 표를 옮긴다')
  for (const [i, p] of (spec.plans ?? []).entries()) {
    const miss = fields.filter((f) => !(f in p))
    const extra = Object.keys(p).filter((k) => !fields.includes(k))
    if (miss.length) add(g, `요금제 ${p.id ?? i} 필드 누락: ${miss.join(', ')}`, P.spec, 'PRD 표에서 값을 옮긴다 (없음은 null)')
    if (extra.length) add(g, `요금제 ${p.id ?? i}에 PRD에 없는 필드: ${extra.join(', ')}`, P.spec, 'PRD Plan 블록에 없는 필드는 지운다')
  }
  checkPlanValues(g, spec)

  const rules = spec.rules ?? []
  for (const id of ['A', 'B']) if (!rules.some((r) => r.id === id)) add(g, `어기면 안 되는 것 ${id} 규칙 없음`, P.spec, 'rules에 추가한다')
  for (const r of rules) {
    if (!RULE_KINDS.includes(r.kind)) add(g, `규칙 ${r.id}의 kind "${r.kind}"를 게이트가 모름`, P.spec, `kind는 ${RULE_KINDS.join(' | ')} 중 하나`)
    for (const rt of r.routes ?? []) if (!got.includes(rt)) add(g, `규칙 ${r.id}의 라우트 ${rt}가 routes에 없음`, P.spec, 'routes에 있는 경로만 쓴다')
    if (r.pattern) try { new RegExp(r.pattern) } catch { add(g, `규칙 ${r.id}의 pattern이 정규식이 아님`, P.spec, '정규식 문법을 고친다') }
  }

  const cases = spec.applyCases ?? []
  if (cases.length < 8) add(g, `신청 검증 사례 ${cases.length}개 (8개 이상 필요)`, P.spec, 'PRD 4-3 입력 규칙으로 사례를 더 만든다')
  for (const [i, c] of cases.entries()) for (const k of ['name', 'phone', 'agreed', 'expected']) if (!(k in c)) add(g, `사례 ${i + 1}에 ${k} 없음`, P.spec, '필드를 채운다')
  if (!cases.some((c) => c.expected === true) || !cases.some((c) => c.expected === false)) add(g, '통과 사례와 실패 사례가 모두 있어야 함', P.spec, 'expected true/false 사례를 모두 넣는다')
  checkApplyCases(g, cases)

  if (spec.gaps?.length) g.notes = [`PRD에 비어 있는 곳 ${spec.gaps.length}건 (spec.gaps 참고)`]
}

function G2(g) {
  if (!exists(P.spec)) return add(g, '01-spec.json 없음', P.spec, '1단계부터 실행한다')
  if (!exists(P.pages)) return add(g, '02-pages.json 없음', P.pages, '2단계 page-planner를 실행한다')
  const spec = readJSON(P.spec)
  const screens = readJSON(P.pages).screens ?? []
  const routes = spec.routes.map((r) => r.path)

  if (screens.length !== routes.length) add(g, `화면 ${screens.length}개 ≠ 라우트 ${routes.length}개`, P.pages, '라우트마다 화면 1개')
  for (const rt of routes) if (!screens.some((s) => s.route === rt)) add(g, `라우트 ${rt}의 화면 없음`, P.pages, 'screens에 추가한다')

  const comps = designComponents()
  if (!comps.length) add(g, 'Design.md 컴포넌트 목록을 찾지 못함', `${cfg.docsDir}/Design.md`, 'Design.md 4장에 #### `이름` 형식 제목을 둔다')
  const fileRe = new RegExp(`^${esc(SRC)}/${esc(cfg.app.screens.replace(/^src\//, ''))}/[A-Z][A-Za-z0-9]*Page\\.tsx$`)
  const seen = new Set()
  for (const s of screens) {
    const where = `${P.pages} (${s.route})`
    if (!s.components?.length) add(g, '컴포넌트 목록이 비어 있음', where, 'Design.md 컴포넌트로 채운다')
    for (const c of s.components ?? []) if (!comps.includes(c)) add(g, `Design.md에 없는 컴포넌트 "${c}"`, where, `Design.md 4장의 ${comps.length}종 중에서 고른다`)
    if (!s.file || !fileRe.test(s.file)) add(g, `화면 파일 경로 규칙 위반: ${s.file}`, where, `${SRC}/screens/<Name>Page.tsx 형식으로 쓴다`)
    if (seen.has(s.file)) add(g, `화면 파일 중복: ${s.file}`, where, '화면마다 다른 파일')
    seen.add(s.file)
    const want = (spec.rules ?? []).filter((r) => r.routes?.includes(s.route)).map((r) => r.id)
    const miss = want.filter((id) => !(s.rules ?? []).includes(id))
    if (miss.length) add(g, `규칙 ${miss.join(', ')} 표시 누락`, where, 'spec rules의 routes에 맞춰 rules에 넣는다')
  }
}

function G3(g, only) {
  const st = exists(P.state) ? readJSON(P.state) : {}
  if (!st.approvals?.pages) add(g, '2단계 화면 설계를 사람이 아직 승인하지 않음', P.state, '설계표를 보여 주고 승인받은 뒤 state.mjs approve pages')
  const spec = readJSON(P.spec)
  const screens = readJSON(P.pages).screens
  const want = only ? [only] : spec.routes.map((r) => r.path)

  const rf = appPath(cfg, 'routes')
  if (!exists(rf)) add(g, '라우터 파일 없음', rf, `screen-builder가 path: "..." 형식으로 ${rf}를 만든다`, only ?? '-')
  else {
    const got = [...new Set([...readText(rf).matchAll(/\bpath\s*:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]))]
    for (const r of want.filter((x) => !got.includes(x))) add(g, `라우터에 ${r} 없음`, rf, '라우트를 등록한다', r)
    if (!only) {
      if (got.length !== want.length) add(g, `라우터 경로 ${got.length}개 ≠ 라우트 ${want.length}개`, rf, 'spec routes와 같게 등록한다')
      for (const r of got.filter((x) => !want.includes(x))) add(g, `spec에 없는 라우트 ${r}`, rf, '지운다')
    }
  }
  for (const s of screens.filter((s) => want.includes(s.route))) if (!exists(s.file)) add(g, '화면 파일 없음', s.file, '4단계 screen-builder로 만든다', s.route)
}

function G4(g) {
  if (!exists(P.allowed)) return add(g, '03-allowed-values.json 없음', P.allowed, '3단계 build-tokens.mjs를 실행한다')
  const allowed = readJSON(P.allowed)
  for (const f of walk(SRC, CODE_EXTS, [appPath(cfg, 'styles')])) {
    for (const v of checkTokens(readText(f), f, allowed)) add(g, v.what, `${f}:${v.line}`, v.fix, routeOf(f))
  }
}

function G5(g, only) {
  const spec = readJSON(P.spec)
  const screens = readJSON(P.pages).screens
  for (const rule of spec.rules.filter((r) => r.kind === 'price-fields')) {
    const targets = screens.filter((s) => rule.routes.includes(s.route) && (!only || s.route === only)).map((s) => s.file).filter(exists)
    const comps = walk(appPath(cfg, 'components'), JS_EXTS)
    for (const f of [...targets, ...comps]) {
      maskComments(readText(f)).forEach((line, i) => {
        for (const p of rule.forbiddenProps ?? []) {
          if (new RegExp(`\\b${esc(p)}\\s*=\\s*[{"']`).test(line)) add(g, `규칙 ${rule.id}: 금지 속성 ${p} 사용`, `${f}:${i + 1}`, `${p} 속성을 지운다`, routeOf(f))
        }
      })
    }
    for (const f of walk(SRC, JS_EXTS, [appPath(cfg, 'styles')])) {
      maskComments(readText(f)).forEach((line, i) => {
        if (/\d{1,3}(,\d{3})+\s*원/.test(line)) add(g, `규칙 ${rule.id}: 금액 문자열을 직접 씀`, `${f}:${i + 1}`, 'formatPrice(plan.monthly_price)처럼 데이터와 표시 함수로 바꾼다', routeOf(f))
      })
    }
    for (const f of targets) {
      maskComments(readText(f)).forEach((line, i) => {
        for (const m of line.matchAll(/\.(\w*price\w*)\b/gi)) {
          if (!rule.allowedPriceFields.includes(m[1])) add(g, `규칙 ${rule.id}: 허용되지 않은 금액 필드 .${m[1]}`, `${f}:${i + 1}`, `금액은 ${rule.allowedPriceFields.join(', ')}만 쓴다`, routeOf(f))
        }
      })
    }
  }
}

async function G6(g, only) {
  const spec = readJSON(P.spec)
  const screens = readJSON(P.pages).screens
  const pf = appPath(cfg, 'plans')
  const df = appPath(cfg, 'display')
  if (!exists(pf)) return add(g, 'plans.json 없음', pf, '01-spec.json의 plans를 그대로 복사한다')
  const plans = readJSON(pf)
  if (JSON.stringify(plans) !== JSON.stringify(spec.plans)) add(g, 'plans.json이 01-spec.json의 plans와 다름', pf, '01-spec.json plans를 그대로 복사한다 (필드 추가·삭제·값 변경 금지)')

  let display = null
  if (!exists(df)) add(g, 'display.js 없음', df, '표시 함수 파일을 만든다')
  else {
    try { display = await importFresh(df) } catch (e) { add(g, `display.js를 node에서 실행하지 못함: ${e.message}`, df, '외부 import 없는 순수 JS(ESM)로 만든다') }
  }
  const fnOf = (name) => {
    if (!display) return null
    if (typeof display[name] !== 'function') { add(g, `${name} 함수 없음`, df, `${name}을 export 한다`); return null }
    return display[name]
  }
  const call = (fn, p) => { try { return fn(p) } catch (e) { return `(오류: ${e.message})` } }

  for (const r of spec.rules) {
    if (r.kind === 'throttle-text') {
      const re = new RegExp(r.pattern)
      for (const p of plans) if (!(r.field in p)) add(g, `규칙 ${r.id}: 요금제 ${p.id}에 ${r.field} 키 없음`, pf, '키를 넣는다 (제한 없으면 null)')
      const fn = fnOf(r.formatter)
      if (fn) for (const p of plans) {
        const out = call(fn, p)
        if (typeof out !== 'string' || !re.test(out)) add(g, `규칙 ${r.id}: 요금제 ${p.id}의 ${r.formatter} 결과 "${out}"가 형식과 다름`, df, `결과가 ${r.pattern}과 맞게 고친다`)
      }
      for (const s of screens.filter((s) => r.routes.includes(s.route) && (!only || s.route === only))) {
        if (exists(s.file) && !readText(s.file).includes(`${r.formatter}(`)) add(g, `규칙 ${r.id}: ${s.route} 화면이 ${r.formatter}()를 호출하지 않음`, s.file, `소진 후 속도를 ${r.formatter}(plan)로 표시한다`, s.route)
      }
    }
    if (r.kind === 'single-flag') {
      const n = plans.filter((p) => p[r.field] === true).length
      if (n !== r.count) add(g, `규칙 ${r.id}: ${r.field}=true인 요금제 ${n}개 (기준 ${r.count}개)`, pf, '01-spec.json과 같게 맞춘다')
    }
    if (r.kind === 'paired-null') {
      const [a, b] = r.fields
      const fn = r.formatter ? fnOf(r.formatter) : null
      for (const p of plans) {
        if ((p[a] == null) !== (p[b] == null)) add(g, `규칙 ${r.id}: 요금제 ${p.id}의 ${a}와 ${b} 중 하나만 비어 있음`, pf, '둘 다 값이 있거나 둘 다 null')
        if (fn) {
          const out = call(fn, p)
          if ((out == null) !== (p[a] == null)) add(g, `규칙 ${r.id}: 요금제 ${p.id}의 ${r.formatter} 결과 "${out}"가 할인 여부와 맞지 않음`, df, `${a}가 null이면 null, 아니면 문구를 돌려준다`)
        }
      }
    }
  }
}

function G7(g) {
  const dir = cfg.appDir
  if (!exists(`${dir}/package.json`)) return add(g, 'package.json 없음', dir, '3단계 scaffold-app.mjs를 실행한다')
  if (!exists(`${dir}/node_modules`)) return add(g, '패키지가 설치되지 않음', dir, `${dir}에서 npm install을 실행한다`)
  for (const [label, cmd] of [['tsc --noEmit', 'npx tsc --noEmit'], ['vite build', 'npx vite build']]) {
    const r = spawnSync(cmd, { cwd: abs(dir), shell: true, encoding: 'utf8' })
    if (r.status !== 0) {
      const lines = `${r.stdout}\n${r.stderr}`.split(/\r?\n/).filter((l) => /error/i.test(l)).slice(0, 5)
      add(g, `${label} 실패 (종료 코드 ${r.status})`, dir, lines.join(' / ') || '명령 출력을 확인한다')
    }
  }
}

async function G8(g) {
  const spec = readJSON(P.spec)
  const vf = appPath(cfg, 'validate')
  if (!exists(vf)) return add(g, 'validate.js 없음', vf, '입력 검증 함수 파일을 만든다')
  let mod
  try { mod = await importFresh(vf) } catch (e) { return add(g, `validate.js를 node에서 실행하지 못함: ${e.message}`, vf, '외부 import 없는 순수 JS(ESM)로 만든다') }
  if (typeof mod.canSubmit !== 'function') return add(g, 'canSubmit 함수 없음', vf, 'canSubmit({ name, phone, agreed })를 export 한다')
  for (const [i, c] of spec.applyCases.entries()) {
    let out
    try { out = mod.canSubmit({ name: c.name, phone: c.phone, agreed: c.agreed }) } catch (e) { out = `(오류: ${e.message})` }
    if (out !== c.expected) {
      add(g, `사례 ${i + 1}: 기대 ${c.expected}, 결과 ${out} (이름 ${String(c.name).length}자, 번호 ${String(c.phone).length}자, 동의 ${c.agreed})`, vf, 'PRD 4-3 입력 규칙대로 고친다')
    }
  }
}

// ---- 실행 ----
const args = process.argv.slice(2)
let only = null
const si = args.indexOf('--screen')
if (si >= 0) { only = args[si + 1]; args.splice(si, 2) }
const fns = { G1, G2, G3, G4, G5, G6, G7, G8 }
const ids = !args.length || args.includes('all') ? Object.keys(fns) : args.map((s) => s.toUpperCase())

const results = []
for (const id of ids) {
  if (!fns[id]) { console.error(`알 수 없는 게이트: ${id} (G1~G8 또는 all)`); process.exit(2) }
  const g = { id, pass: true, back: BACK[id], issues: [] }
  try { await fns[id](g, only) } catch (e) { add(g, `게이트 실행 오류: ${e.message}`, 'harness/scripts/run-gates.mjs', '앞 단계 출력 파일이 있는지 확인한다') }
  results.push(g)
}

for (const g of results) {
  console.log(`${g.pass ? 'PASS' : 'FAIL'} ${g.id}${g.pass ? '' : ` → ${g.back}`}`)
  for (const it of g.issues.slice(0, 20)) console.log(`  - 무엇이: ${it.what} | 어디서: ${it.where} | 어떻게: ${it.fix}`)
  if (g.issues.length > 20) console.log(`  ... 외 ${g.issues.length - 20}건 (05-report.json 참고)`)
  for (const n of g.notes ?? []) console.log(`  · 참고: ${n}`)
}
const pass = results.every((g) => g.pass)
writeJSON(P.report, { at: new Date().toISOString(), screen: only, pass, gates: results })
process.exit(pass ? 0 : 1)
