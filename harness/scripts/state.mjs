// 진행 상태 기록: harness/out/state.json (오케스트레이터는 이 스크립트로만 상태를 바꾼다)
// 사용:
//   node harness/scripts/state.mjs show                 마지막 완료 지점과 다음 할 일
//   node harness/scripts/state.mjs done <단계> [route]   단계(또는 4단계 화면 1개) 완료
//   node harness/scripts/state.mjs approve pages        2단계 사람 승인 기록
//   node harness/scripts/state.mjs fail <대상>           실패 횟수 +1, 최대 횟수에 닿으면 종료 코드 3
//   node harness/scripts/state.mjs reopen <단계>         그 단계부터 다시 하도록 이후 기록을 지움
import { loadConfig, outPaths, exists, readJSON, writeJSON } from './lib/common.mjs'

const cfg = loadConfig()
const P = outPaths(cfg)
const STAGES = ['spec', 'pages', 'tokens', 'screens', 'verify']
const empty = { stages: {}, screens: {}, approvals: {}, retries: {}, history: [] }
const st = exists(P.state) ? { ...empty, ...readJSON(P.state) } : empty
const routes = exists(P.spec) ? readJSON(P.spec).routes.map((r) => r.path) : []
const [cmd, a, b] = process.argv.slice(2)

const save = (note) => {
  st.history.push({ at: new Date().toISOString(), note })
  st.updatedAt = new Date().toISOString()
  writeJSON(P.state, st)
}
const fail = (msg) => { console.error(msg); process.exit(2) }

function next() {
  for (const s of STAGES) {
    if (s === 'screens') {
      const todo = routes.filter((r) => st.screens[r] !== 'done')
      if (todo.length) return `4단계 screens: ${todo[0]} (남은 화면 ${todo.length}개)`
      continue
    }
    if (!st.stages[s]) return `${STAGES.indexOf(s) + 1}단계 ${s}`
    if (s === 'pages' && !st.approvals.pages) return '2단계 화면 설계 사람 승인 대기'
  }
  return '완료 (push는 사람 승인 후)'
}

if (cmd === 'show' || !cmd) {
  console.log(`완료 단계: ${STAGES.filter((s) => st.stages[s]).join(', ') || '없음'}`)
  console.log(`화면: ${routes.map((r) => `${r}=${st.screens[r] ?? '-'}`).join(', ') || '(spec 전)'}`)
  console.log(`승인: pages=${!!st.approvals.pages}`)
  const r = Object.entries(st.retries).filter(([, n]) => n > 0)
  if (r.length) console.log(`실패 횟수: ${r.map(([k, n]) => `${k}=${n}`).join(', ')}`)
  console.log(`다음: ${next()}`)
} else if (cmd === 'done') {
  if (!STAGES.includes(a)) fail(`단계 이름은 ${STAGES.join(' | ')}`)
  if (a === 'screens') {
    if (!b) fail('화면 route를 함께 적는다. 예: done screens /plans')
    if (!routes.includes(b)) fail(`spec에 없는 route: ${b}`)
    st.screens[b] = 'done'
    st.retries[b] = 0
    st.stages.screens = routes.every((r) => st.screens[r] === 'done')
  } else {
    st.stages[a] = true
    st.retries[a] = 0
  }
  save(`done ${a}${b ? ` ${b}` : ''}`)
  console.log(`기록함. 다음: ${next()}`)
} else if (cmd === 'approve' && a === 'pages') {
  if (!st.stages.pages) fail('2단계가 끝나지 않았다')
  st.approvals.pages = true
  save('approve pages')
  console.log(`승인 기록함. 다음: ${next()}`)
} else if (cmd === 'fail') {
  if (!a) fail('대상(단계 이름 또는 route)을 적는다')
  st.retries[a] = (st.retries[a] ?? 0) + 1
  save(`fail ${a}`)
  if (st.retries[a] >= cfg.maxRetries) {
    console.log(`STOP: ${a} ${st.retries[a]}회 연속 실패. 멈추고 사람에게 보고한다.`)
    process.exit(3)
  }
  console.log(`${a} 실패 ${st.retries[a]}/${cfg.maxRetries}회`)
} else if (cmd === 'reopen') {
  const i = STAGES.indexOf(a)
  if (i < 0) fail(`단계 이름은 ${STAGES.join(' | ')}`)
  for (const s of STAGES.slice(i)) st.stages[s] = false
  if (i <= STAGES.indexOf('pages')) st.approvals.pages = false
  if (i <= STAGES.indexOf('screens')) st.screens = {}
  save(`reopen ${a}`)
  console.log(`${a}부터 다시 한다. 다음: ${next()}`)
} else {
  fail('명령: show | done <단계> [route] | approve pages | fail <대상> | reopen <단계>')
}
