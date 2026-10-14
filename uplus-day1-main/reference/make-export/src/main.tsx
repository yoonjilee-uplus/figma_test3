/*
 * ===== 이 파일은 무엇인가요? =====
 * 이 앱의 "시작 버튼" 같은 파일이에요.
 * 브라우저가 가장 먼저 실행하는 코드로, React 앱 전체(App)를 웹페이지에 붙여 화면에 보이게 만들어요.
 *
 * ===== 전체 흐름 =====
 * 1. 브라우저가 index.html을 열어요.
 * 2. index.html 안의 <script src="/src/main.tsx">가 이 파일을 실행해요.
 * 3. 이 파일이 index.html의 빈 상자 <div id="root"></div>를 찾아요.
 * 4. 그 상자 안에 <App /> 컴포넌트를 그려 넣어요. → 화면이 나타나요!
 *
 * ===== 미리 알아두면 좋은 용어 =====
 * - 컴포넌트(component): 화면의 한 조각을 만드는 함수예요. 레고 블록처럼 조립해서 화면을 만들어요.
 * - JSX: <App />처럼 JS 코드 안에 HTML 비슷하게 쓰는 문법이에요. .tsx 파일에서 쓸 수 있어요.
 * - DOM: 브라우저가 웹페이지를 다루기 위해 만든 "페이지 구조 지도"예요. HTML 태그 하나하나가 지도 위의 칸이에요.
 */

// ----- 1단계: 필요한 도구 불러오기 (import) -----
// import는 "다른 파일이나 라이브러리에 있는 기능을 가져와서 쓰겠다"는 뜻이에요.

// React: 화면을 컴포넌트 단위로 만들 수 있게 해주는 라이브러리예요. 아래 <React.StrictMode>를 쓰려고 불러와요.
import React from 'react'
// ReactDOM: React로 만든 화면을 실제 웹페이지(DOM)에 그려주는 역할이에요.
// 'react-dom/client'는 브라우저에서 쓰는 버전이라는 뜻이에요.
import ReactDOM from 'react-dom/client'
// App: 이 프로젝트의 화면 전체를 담고 있는 가장 큰 컴포넌트예요. 같은 폴더의 App.tsx에 있어요.
// ('./App'처럼 확장자 .tsx는 생략해도 알아서 찾아줘요.)
import App from './App'
// CSS 파일은 이렇게 불러오기만 해도 앱 전체에 스타일(색, 글꼴, 여백 등)이 적용돼요.
import './index.css'

// ----- 2단계: 화면에 앱 그리기 -----
// 아래 한 줄은 세 부분으로 나눠 읽으면 쉬워요.
//  ① document.getElementById('root')
//     → index.html에서 id가 "root"인 빈 <div>를 찾아요. 앱이 들어갈 "자리"예요.
//     → 끝의 느낌표(!)는 TypeScript 문법이에요. "이 요소는 꼭 있으니 비어 있을(null) 걱정은 안 해도 돼"라고
//       TypeScript에게 알려주는 표시예요. (없으면 TypeScript가 "못 찾을 수도 있어요"라며 경고해요.)
//  ② ReactDOM.createRoot(...)
//     → 찾은 자리를 React가 관리하는 "뿌리(root)"로 만들어요. 이제부터 이 안의 화면은 React가 그려요.
//  ③ .render(...)
//     → 괄호 안의 컴포넌트를 그 뿌리 안에 실제로 그려요.
ReactDOM.createRoot(document.getElementById('root')!).render(
  // React.StrictMode: 개발할 때만 동작하는 "검사 모드"예요.
  // 실수하기 쉬운 코드를 찾아 콘솔에 경고를 보여줘요. 실제 배포된 화면 모양에는 영향을 주지 않아요.
  // (참고: 개발 중에는 일부 코드가 일부러 두 번 실행될 수 있어요. 문제를 빨리 찾기 위한 동작이니 놀라지 않아도 돼요.)
  <React.StrictMode>
    {/* 앱 화면 전체. 실제 화면 내용은 App.tsx에서 만들어요. */}
    <App />
  </React.StrictMode>,
)
