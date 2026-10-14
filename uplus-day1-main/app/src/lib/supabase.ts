import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** 처음 호출할 때 환경변수를 확인해 클라이언트를 만들고 캐시한다. 비어 있으면 그때 throw. */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
  const key = import.meta.env.VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push("VITE_PUBLIC_SUPABASE_URL");
  if (!key) missing.push("VITE_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!url || !key) {
    throw new Error(`Supabase 환경변수가 비어 있습니다: ${missing.join(", ")}`);
  }

  client = createClient(url, key);
  return client;
}
