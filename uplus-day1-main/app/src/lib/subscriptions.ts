import { supabase } from "./supabase";
import { makeSubscriptionId } from "./display.js";

export const PRIVACY_VERSION = "2026-10-14";

const TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 3;

export type SubscriptionInput = {
  name: string;
  phone: string;
  plan_id: string;
  plan_name: string;
  monthly_price: number;
};

export type SubscriptionRow = {
  id: string;
  name: string;
  plan_id: string;
  plan_name: string;
  monthly_price: number;
  created_at: string;
};

/** 저장 실패. lastId는 마지막으로 시도한 신청 번호(네트워크 오류 재시도용), 충돌 상한 초과면 null. */
export class SaveError extends Error {
  lastId: string | null;
  constructor(message: string, lastId: string | null) {
    super(message);
    this.name = "SaveError";
    this.lastId = lastId;
  }
}

export async function saveSubscription(input: SubscriptionInput, reuseId?: string): Promise<string> {
  let id = reuseId || makeSubscriptionId(new Date(), []);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let error: { code?: string; message?: string } | null;
    try {
      const res = await supabase
        .from("subscriptions")
        .insert({
          id,
          name: input.name.trim(),
          phone: input.phone,
          plan_id: input.plan_id,
          plan_name: input.plan_name,
          monthly_price: input.monthly_price,
          agreed_privacy: true,
          privacy_version: PRIVACY_VERSION,
        })
        .abortSignal(controller.signal);
      error = res.error;
    } catch (e) {
      throw new SaveError(e instanceof Error ? e.message : "network error", id);
    } finally {
      clearTimeout(timer);
    }
    if (!error) return id;
    if (error.code === "23505") {
      if (attempt === MAX_ATTEMPTS) throw new SaveError("id conflict", null);
      id = makeSubscriptionId(new Date(), []);
      continue;
    }
    throw new SaveError(error.message ?? "save failed", id);
  }
  throw new SaveError("save failed", null);
}

export async function getSubscription(id: string): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase.rpc("get_subscription", { p_id: id });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SubscriptionRow[];
  return rows.length > 0 ? rows[0] : null;
}
