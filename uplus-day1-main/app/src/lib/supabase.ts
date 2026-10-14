import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const key = import.meta.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const missing: string[] = [];
if (!url) missing.push("VITE_PUBLIC_SUPABASE_URL");
if (!key) missing.push("VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

if (missing.length > 0) {
  throw new Error(`Supabase 환경변수가 비어 있습니다: ${missing.join(", ")}`);
}

export const supabase = createClient(url, key);
