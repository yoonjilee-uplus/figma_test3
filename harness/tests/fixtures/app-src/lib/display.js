// 테스트용 표시 함수 (규칙을 지키는 정상 예시)
export const formatPrice = (n) => `${Number(n).toLocaleString('ko-KR')}원`

export const formatThrottle = (plan) =>
  plan.throttle_after ? `소진 후 ${plan.throttle_after}로 제한` : '속도 제한 없음'

export const formatAfterDiscount = (plan) =>
  plan.price_after_discount == null ? null : `${plan.discount_months + 1}개월째부터 ${formatPrice(plan.price_after_discount)}`
