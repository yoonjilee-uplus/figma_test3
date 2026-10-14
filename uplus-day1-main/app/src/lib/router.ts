import { useEffect, useState } from "react";

const EVENT = "app:navigate";

// replace=true 이면 기록을 남기지 않는 교체 이동.
export function navigate(to: string, replace = false) {
  if (replace) {
    window.history.replaceState(null, "", to);
  } else {
    window.history.pushState(null, "", to);
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useLocation() {
  const [loc, setLoc] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const update = () => setLoc(window.location.pathname + window.location.search);
    window.addEventListener(EVENT, update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return loc;
}

// "/plans/[id]" 같은 패턴을 실제 경로와 맞춰 본다. 맞으면 파라미터를 돌려준다.
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean);
  const b = pathname.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    const m = /^\[(.+)\]$/.exec(a[i]);
    if (m) params[m[1]] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
