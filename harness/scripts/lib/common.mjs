// 하네스 스크립트 공용 함수: 설정 읽기, 경로 변환, JSON 입출력, 파일 탐색
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export function loadConfig() {
  const raw = JSON.parse(stripBom(fs.readFileSync(path.join(ROOT, 'harness', 'config.json'), 'utf8')))
  const sub = (s) =>
    s.replaceAll('{docsDir}', raw.docsDir)
      .replaceAll('{referenceDir}', raw.referenceDir)
      .replaceAll('{appDir}', raw.appDir)
      .replaceAll('{outDir}', raw.outDir)
  const deep = (v) =>
    typeof v === 'string' ? sub(v)
      : Array.isArray(v) ? v.map(deep)
        : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)]))
          : v
  return deep(raw)
}

export function outPaths(cfg) {
  return {
    spec: `${cfg.outDir}/spec/01-spec.json`,
    pages: `${cfg.outDir}/pages/02-pages.json`,
    allowed: `${cfg.outDir}/tokens/03-allowed-values.json`,
    report: `${cfg.outDir}/report/05-report.json`,
    state: `${cfg.outDir}/state.json`,
  }
}

export const appPath = (cfg, key) => `${cfg.appDir}/${cfg.app[key]}`
export const abs = (p) => path.resolve(ROOT, p)
export const rel = (p) => path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join('/')
export const exists = (p) => fs.existsSync(abs(p))
export const stripBom = (s) => s.replace(/^﻿/, '')
export const readText = (p) => stripBom(fs.readFileSync(abs(p), 'utf8'))
export const readJSON = (p) => JSON.parse(readText(p))

export function writeText(p, text) {
  fs.mkdirSync(path.dirname(abs(p)), { recursive: true })
  fs.writeFileSync(abs(p), text, 'utf8')
}
export const writeJSON = (p, data) => writeText(p, JSON.stringify(data, null, 2) + '\n')

// dir 아래에서 확장자가 exts 중 하나인 파일의 저장소 기준 상대 경로 목록
export function walk(dir, exts, skip = []) {
  const out = []
  if (!exists(dir)) return out
  const visit = (d) => {
    for (const ent of fs.readdirSync(abs(d), { withFileTypes: true })) {
      const p = `${d}/${ent.name}`
      if (ent.name === 'node_modules' || skip.some((s) => p.startsWith(s))) continue
      if (ent.isDirectory()) visit(p)
      else if (exts.some((e) => ent.name.endsWith(e))) out.push(p)
    }
  }
  visit(dir.replace(/\/$/, ''))
  return out
}

// 주석 줄(//, /*, *)은 검사에서 빼기 위해 공백으로 바꾼다. 줄 번호는 유지한다.
export function maskComments(text) {
  return text
    .split(/\r?\n/)
    .map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? '' : line.replace(/\s\/\/\s.*$/, '')))
}
