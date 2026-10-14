// 3단계: <appDir> 뼈대(package.json, tsconfig.json, vite.config.ts, index.html, .gitignore)를 만든다.
// 패키지 버전은 reference 앱의 package.json을 그대로 따른다. 이미 있는 파일은 덮어쓰지 않는다.
// src/ 아래는 만들지 않는다(screen-builder 담당).
// 사용: node harness/scripts/scaffold-app.mjs
import { loadConfig, exists, readJSON, writeText } from './lib/common.mjs'

const cfg = loadConfig()
const dir = cfg.appDir
const kit = cfg.componentKit
const refPkgPath = `${cfg.referenceApp}/package.json`
const ref = exists(refPkgPath) ? readJSON(refPkgPath) : { dependencies: {}, devDependencies: {} }

const deps = { ...ref.dependencies }
// reference가 쓰던 키트를 끄면(componentKit: null) 의존성에서도 뺀다
for (const name of Object.keys(deps)) if (name.startsWith('@make-kits/') && (!kit || kit.package !== name)) delete deps[name]
if (kit) deps[kit.package] = kit.version
const devDeps = { ...ref.devDependencies }
delete devDeps.oxfmt

const files = {
  'package.json': JSON.stringify({
    name: 'harness-app',
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', lint: 'tsc --noEmit', preview: 'vite preview' },
    dependencies: deps,
    devDependencies: devDeps,
  }, null, 2) + '\n',
  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      target: 'ES2020', useDefineForClassFields: true, lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler', baseUrl: '.',
      paths: { '@/*': ['./src/*'] }, allowImportingTsExtensions: true, resolveJsonModule: true,
      allowJs: true, isolatedModules: true, noEmit: true, jsx: 'react-jsx', types: ['node'],
      strict: true, noFallthroughCasesInSwitch: true,
    },
    include: ['src', 'vite.config.ts'],
  }, null, 2) + '\n',
  'vite.config.ts':
    "import { defineConfig } from 'vite'\n" +
    "import react from '@vitejs/plugin-react'\n" +
    "import tailwindcss from '@tailwindcss/vite'\n" +
    "import path from 'node:path'\n\n" +
    'export default defineConfig({\n' +
    '  plugins: [react(), tailwindcss()],\n' +
    "  resolve: { alias: { '@': path.resolve(__dirname, './src') } },\n" +
    '})\n',
  'index.html':
    '<!doctype html>\n<html lang="ko">\n  <head>\n    <meta charset="UTF-8" />\n' +
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    '    <title>app</title>\n  </head>\n  <body>\n    <div id="root"></div>\n' +
    '    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n',
  '.gitignore': 'node_modules/\ndist/\n',
}

for (const [name, text] of Object.entries(files)) {
  const p = `${dir}/${name}`
  if (exists(p)) { console.log(`건너뜀 (이미 있음): ${p}`); continue }
  writeText(p, text)
  console.log(`만듦: ${p}`)
}
if (kit) console.log(`참고: 컴포넌트 키트 ${kit.package}@${kit.version}을 의존성에 넣었다. 공개 npm에 없으면 npm install이 실패한다 → harness/config.json의 componentKit을 null로 바꾸고 다시 실행한다.`)
