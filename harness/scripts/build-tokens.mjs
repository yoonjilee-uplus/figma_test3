// 3단계: docs/tokens.json → <appDir>/src/styles/tokens.css + harness/out/tokens/03-allowed-values.json
// 같은 입력이면 항상 같은 결과를 만든다. 두 출력 파일은 손으로 고치지 않는다.
// 사용: node harness/scripts/build-tokens.mjs
import { loadConfig, outPaths, appPath, readJSON, writeText, writeJSON } from './lib/common.mjs'

const cfg = loadConfig()
const P = outPaths(cfg)
const src = `${cfg.docsDir}/tokens.json`
const tj = readJSON(src)
const mode = tj.meta?.defaultMode ?? 'Default'
const slug = (s) => s.replace(/\//g, '-')
const px = (n) => (n === 0 ? '0' : `${n}px`)

const vars = new Map()
let skipped = 0
for (const t of tj.tokens) {
  const raw = t.values?.[mode]
  const val = raw && typeof raw === 'object' ? raw.resolved : raw
  // primitive 색은 화면에 직접 쓰지 않는다(Design.md 1장). 변수로 내보내지 않아 쓰면 G4에서 걸린다.
  if (t.collection === 'primitive' && t.type === 'color') { skipped++; continue }
  if (t.type === 'color') vars.set(`--color-${slug(t.name)}`, val)
  else if (t.type === 'string') vars.set(`--${slug(t.name)}`, `"${val}", sans-serif`)
  else if (typeof val === 'number') vars.set(`--${slug(t.name)}`, px(val))
}

// 글자 스타일 → .ts-<이름> 클래스. 변수가 연결된 값은 var()로, 아니면 tokens.json 값 그대로.
const varRef = (ref) => {
  const name = `--${slug(ref.variable.split('/').slice(1).join('/'))}`
  return vars.has(name) ? `var(${name})` : null
}
const classes = []
const rules = []
for (const ts of tj.textStyles ?? []) {
  const cls = `ts-${slug(ts.name)}`
  const family = ts.fontFamily?.variable ? varRef(ts.fontFamily) : null
  const size = ts.fontSize?.variable ? varRef(ts.fontSize) : null
  const fontSize = size ?? px(ts.fontSize?.resolved ?? ts.fontSize)
  const letter = ts.letterSpacing ? `${ts.letterSpacing / 100}em` : '0'
  classes.push(cls)
  rules.push(
    `.${cls} {\n` +
      `  font-family: ${family ?? `"${ts.fontFamily?.resolved ?? ts.fontFamily}", sans-serif`};\n` +
      `  font-size: ${fontSize};\n` +
      `  line-height: ${px(ts.lineHeight)};\n` +
      `  font-weight: ${ts.fontWeight};\n` +
      `  letter-spacing: ${letter};\n` +
      `}`,
  )
}

const css =
  `/* 자동 생성 파일 — 직접 수정 금지.\n * 원본: ${src}\n * 생성: node harness/scripts/build-tokens.mjs\n */\n\n` +
  `:root {\n${[...vars].map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n\n` +
  rules.join('\n\n') + '\n'

const cssPath = `${appPath(cfg, 'styles')}/tokens.css`
writeText(cssPath, css)
writeJSON(P.allowed, {
  generatedFrom: src,
  cssVars: [...vars.keys()],
  textStyleClasses: classes,
  skippedPrimitiveColors: skipped,
})
console.log(`tokens.css: 변수 ${vars.size}개, 글자 스타일 ${classes.length}개 (primitive 색 ${skipped}개 제외)`)
console.log(`→ ${cssPath}`)
console.log(`→ ${P.allowed}`)
