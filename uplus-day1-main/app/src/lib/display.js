// 표시 규칙 (PRD 표시 규칙). 순수 함수만 둔다.

export function formatPrice(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "원";
}

export function formatThrottle(plan) {
  if (plan.throttle_after) {
    return "소진 후 " + plan.throttle_after + "로 제한";
  }
  return "속도 제한 없음";
}

export function formatAfterDiscount(plan) {
  if (plan.price_after_discount == null || plan.discount_months == null) {
    return null;
  }
  return plan.discount_months + 1 + "개월째부터 " + formatPrice(plan.price_after_discount);
}

function kstParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const out = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

// "YYYY.MM.DD HH:mm" (24시간, 한국 시간)
export function formatDateTime(date) {
  const p = kstParts(date);
  return p.year + "." + p.month + "." + p.day + " " + p.hour + ":" + p.minute;
}

// "S" + YYMMDD + 임의 숫자 4자리. 이미 있는 번호면 다시 생성한다.
export function makeSubscriptionId(date, existingIds) {
  const p = kstParts(date);
  const prefix = "S" + p.year.slice(2) + p.month + p.day;
  const used = new Set(existingIds || []);
  for (;;) {
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const id = prefix + rand;
    if (!used.has(id)) return id;
  }
}
