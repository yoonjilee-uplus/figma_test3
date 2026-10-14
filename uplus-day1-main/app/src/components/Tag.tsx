// Tag: 변형·속성 없음. 짧은 분류·강조 레이블.
export default function Tag({ children }: { children: string }) {
  return (
    <span
      className="ts-caption-bold flex items-center justify-center"
      style={{
        paddingLeft: "var(--spacing-12)",
        paddingRight: "var(--spacing-12)",
        paddingTop: "var(--spacing-4)",
        paddingBottom: "var(--spacing-4)",
        borderRadius: "var(--radius-full)",
        backgroundColor: "var(--color-bg-accent-subtle)",
        color: "var(--color-text-accent)",
      }}
    >
      {children}
    </span>
  );
}
