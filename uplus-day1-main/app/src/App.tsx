import { useEffect } from "react";
import type { ComponentType } from "react";
import { routes } from "./routes";
import { navigate, useLocation, matchPath } from "./lib/router";

type ScreenModule = { default: ComponentType<{ params: Record<string, string> }> };

// 아직 만들지 않은 화면 파일이 있어도 빌드가 깨지지 않도록 glob으로 찾는다.
const modules = import.meta.glob("./screens/*.tsx", { eager: true }) as Record<string, ScreenModule>;

export default function App() {
  const loc = useLocation();
  const pathname = loc.split("?")[0];

  let Screen: ScreenModule["default"] | null = null;
  let params: Record<string, string> = {};
  let matched = false;
  for (const r of routes) {
    const p = matchPath(r.path, pathname);
    if (p) {
      matched = true;
      params = p;
      Screen = modules["./screens/" + r.screen + ".tsx"]?.default ?? null;
      break;
    }
  }

  useEffect(() => {
    if (!matched) navigate("/plans", true);
  }, [matched]);

  if (!Screen) return null;
  return <Screen params={params} />;
}
