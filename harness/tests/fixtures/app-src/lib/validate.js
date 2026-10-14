// 테스트용 입력 검증 함수 (PRD 4-3 규칙을 지키는 정상 예시)
export const normalizePhone = (s) => String(s ?? '').replace(/\D/g, '')

export const isValidName = (s) => {
  const t = String(s ?? '').trim()
  return t.length >= 1 && t.length <= 20
}

export const isValidPhone = (s) => /^010\d{8}$/.test(normalizePhone(s))

export const canSubmit = ({ name, phone, agreed }) => isValidName(name) && isValidPhone(phone) && agreed === true
