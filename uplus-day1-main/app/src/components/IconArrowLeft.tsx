// icon/arrowLeft: 변형·속성 없음. 이전 위치로 이동하는 내비게이션 아이콘.
export default function IconArrowLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: "var(--spacing-24)", height: "var(--spacing-24)", color: "var(--color-icon-strong)" }}
    >
      <path d="M15 5L8 12L15 19" />
    </svg>
  );
}
