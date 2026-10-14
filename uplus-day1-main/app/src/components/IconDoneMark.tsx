// icon/doneMark: 변형·속성 없음. 완료 상태를 대표하는 큰 확인 표시.
export default function IconDoneMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      style={{ width: "var(--spacing-80)", height: "var(--spacing-80)" }}
    >
      <circle cx="32" cy="32" r="32" style={{ fill: "var(--color-fill-primary)" }} />
      <path
        d="M19 33L28 42L45 24"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--color-icon-on-dark)" }}
      />
    </svg>
  );
}
