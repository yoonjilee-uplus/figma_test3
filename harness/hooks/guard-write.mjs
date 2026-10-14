// PreToolUse 훅 (Write | Edit | MultiEdit | NotebookEdit)
// 막는 것: ① 생성 파일 수정 ② docs/·reference/ 수정 ③ 에이전트가 자기 폴더 밖을 수정 ④ APP/src에 토큰 밖 값(G4)
// 막을 때는 종료 코드 2와 이유(stderr)를 돌려준다. Claude Code가 이 메시지를 에이전트에게 그대로 전달한다.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadConfig, outPaths, exists, readJSON, stripBom } from '../scripts/lib/common.mjs'
import { checkTokens, CODE_EXTS } from '../scripts/lib/token-check.mjs'

try {
  const input = JSON.parse(stripBom(fs.readFileSync(0, 'utf8')) || '{}')
  const ti = input.tool_input ?? {}
  const file = ti.file_path ?? ti.notebook_path
  if (!file) process.exit(0)

  const relPath = path.relative(ROOT, path.resolve(input.cwd ?? ROOT, file)).split(path.sep).join('/')
  if (relPath.startsWith('..')) process.exit(0) // 저장소 밖 파일은 관여하지 않는다

  const cfg = loadConfig()
  const P = outPaths(cfg)
  const norm = (s) => (process.platform === 'win32' ? s.toLowerCase() : s)
  const under = (p, prefix) => (prefix.endsWith('/') ? norm(p).startsWith(norm(prefix)) : norm(p) === norm(prefix))
  const block = (msg) => {
    process.stderr.write(`[harness] 쓰기 거부: ${relPath}\n${msg}\n`)
    process.exit(2)
  }

  // 서브에이전트 안에서 실행되면 Claude Code가 agent_type을 넣어 준다. 없으면 메인 대화이거나 하네스 밖 에이전트다.
  const agent = input.agent_type
  const scopes = agent ? cfg.writeScopes[agent] : undefined

  if (cfg.generated.some((g) => under(relPath, g))) {
    block('생성 파일이다. 손으로 고치지 말고 build-tokens.mjs / run-gates.mjs / state.mjs를 다시 돌린다.')
  }
  if (scopes) {
    if (!scopes.some((s) => under(relPath, s))) block(`${agent}는 ${scopes.join(', ')} 안만 편집할 수 있다.`)
  } else if (cfg.readOnly.some((r) => under(relPath, r))) {
    block(`${cfg.docsDir}/와 ${cfg.referenceDir}/는 읽기 전용이다.`)
  }

  // G4 token-only: APP/src 코드 파일에 새로 쓰는 내용만 검사한다
  const isAppCode =
    under(relPath, `${cfg.appDir}/src/`) &&
    !under(relPath, `${cfg.appDir}/${cfg.app.styles}/`) &&
    CODE_EXTS.some((e) => relPath.endsWith(e))
  if (isAppCode) {
    const text =
      ti.content ?? ti.new_string ?? (Array.isArray(ti.edits) ? ti.edits.map((e) => e.new_string).join('\n') : '')
    const allowed = exists(P.allowed) ? readJSON(P.allowed) : null
    const issues = checkTokens(text, relPath, allowed)
    if (issues.length) {
      const lines = issues.slice(0, 10).map((v) => `- 무엇이: ${v.what} | 어디서: 쓰려는 내용 ${v.line}번째 줄 | 어떻게: ${v.fix}`)
      if (issues.length > 10) lines.push(`... 외 ${issues.length - 10}건`)
      block(`토큰 밖 값 ${issues.length}건 (G4)\n${lines.join('\n')}`)
    }
  }
  process.exit(0)
} catch (e) {
  // 훅 자체 오류는 작업을 막지 않는다(종료 코드 1 = 비차단 오류)
  process.stderr.write(`[harness] guard-write 훅 오류: ${e.message}\n`)
  process.exit(1)
}
