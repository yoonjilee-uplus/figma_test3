// 신청 입력 검증 (PRD 입력 규칙). 순수 함수만 둔다.

// 숫자 외 문자(하이픈·공백)를 제거한다.
export function normalizePhone(s) {
  return String(s == null ? "" : s).replace(/\D/g, "");
}

// 앞뒤 공백을 제외하고 1~20자.
export function isValidName(s) {
  const t = String(s == null ? "" : s).trim();
  return t.length >= 1 && t.length <= 20;
}

// 010으로 시작하는 숫자 11자리.
export function isValidPhone(s) {
  return /^010\d{8}$/.test(normalizePhone(s));
}

export function canSubmit({ name, phone, agreed }) {
  return isValidName(name) && isValidPhone(phone) && agreed === true;
}
