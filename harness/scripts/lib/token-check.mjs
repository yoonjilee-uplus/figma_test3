// G4 token-only 검사. 훅(guard-write.mjs)과 run-gates.mjs가 같은 규칙을 쓴다.
// 반환: [{ line, what, fix }]
import { maskComments } from './common.mjs'

// Tailwind에서 허용하는 크기·정렬 클래스 (토큰과 무관한 레이아웃 값)
const LAYOUT_OK = new Set([
  'w-full', 'h-full', 'w-screen', 'h-screen', 'min-h-screen', 'min-h-full', 'w-auto', 'h-auto',
  'max-w-full', 'text-left', 'text-center', 'text-right',
])

// 토큰을 우회하는 Tailwind 클래스 (간격·크기·색·글자·모서리·그림자)
const FORBIDDEN_CLASS = [
  /^-?(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me)-/,
  /^-?(gap|gap-x|gap-y|space-x|space-y)-/,
  /^-?(top|right|bottom|left|inset|inset-x|inset-y|start|end)-/,
  /^(w|h|min-w|min-h|max-w|max-h|size|basis)-/,
  /^(text|bg|border|border-[trblxyse]|rounded|rounded-[a-z]+|font|leading|tracking|shadow|ring|ring-offset|outline|fill|stroke|from|via|to|decoration|divide|placeholder|caret|accent)(-|$)/,
]

const RULES = [
  { re: /(^|[^&\w])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/, what: '16진수 색', fix: '색은 var(--color-...) 토큰으로 바꾼다' },
  { re: /\b(rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/i, what: 'rgb/hsl 등 색 함수', fix: '색은 var(--color-...) 토큰으로 바꾼다' },
  { re: /(?<![\w-])-?\d+(\.\d+)?(px|rem|em|pt)\b/, what: '숫자 단위 값(px/rem/em/pt)', fix: '간격은 var(--spacing-N), 모서리는 var(--radius-N), 글자는 ts-* 클래스로 바꾼다' },
  {
    re: /\b(padding|margin|gap|rowGap|columnGap|top|right|bottom|left|inset|width|height|minWidth|minHeight|maxWidth|maxHeight|fontSize|lineHeight|letterSpacing|borderRadius|borderWidth|outlineWidth|fontWeight)(Top|Right|Bottom|Left|Inline|Block|Start|End|X|Y)?\s*:\s*-?(?!0\b)\d/,
    what: 'style 속성의 숫자 값', fix: "'var(--spacing-16)'처럼 토큰 변수 문자열로 바꾼다",
  },
  { re: /\b(font-weight|line-height|font-size|letter-spacing)\s*:\s*\d/, what: 'CSS 글자 속성의 숫자 값', fix: 'ts-* 글자 스타일 클래스를 쓴다' },
]

function classTokens(line) {
  const out = []
  const attr = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*[`"']([^`"']*)[`"']\s*\})/g
  for (const m of line.matchAll(attr)) out.push(...(m[1] ?? m[2] ?? m[3] ?? '').split(/\s+/))
  const fn = /\b(?:clsx|cn|classNames)\(([^)]*)\)/g
  for (const m of line.matchAll(fn)) for (const s of m[1].matchAll(/["'`]([^"'`]*)["'`]/g)) out.push(...s[1].split(/\s+/))
  return out.filter(Boolean)
}

export function checkTokens(text, filePath, allowed) {
  const issues = []
  const lines = maskComments(text)
  const vars = allowed ? new Set(allowed.cssVars) : null
  const isCss = filePath.endsWith('.css')

  lines.forEach((line, i) => {
    const n = i + 1
    for (const r of RULES) if (r.re.test(line)) issues.push({ line: n, what: r.what, fix: r.fix, snippet: line.trim().slice(0, 80) })

    for (const raw of classTokens(line)) {
      const cls = raw.replace(/^!/, '').split(':').pop()
      if (LAYOUT_OK.has(cls)) continue
      if (/\[.*\]/.test(cls)) issues.push({ line: n, what: `Tailwind 임의 값 클래스 "${raw}"`, fix: '토큰 변수나 ts-* 클래스로 바꾼다' })
      else if (FORBIDDEN_CLASS.some((re) => re.test(cls))) issues.push({ line: n, what: `토큰 밖 Tailwind 클래스 "${raw}"`, fix: "style={{ padding: 'var(--spacing-16)' }}처럼 토큰 변수를 쓰거나 ts-* 클래스를 쓴다" })
    }

    if (vars) {
      for (const m of line.matchAll(/var\(\s*(--[\w-]+)/g)) {
        if (!vars.has(m[1])) issues.push({ line: n, what: `정의되지 않은 변수 ${m[1]}`, fix: '03-allowed-values.json의 cssVars에 있는 변수만 쓴다' })
      }
    }
    if (isCss && /^\s*--[\w-]+\s*:/.test(line)) issues.push({ line: n, what: '새 CSS 변수 정의', fix: '변수는 tokens.json → tokens.css로만 만든다(3단계)' })
  })
  return issues
}

export const CODE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css']
