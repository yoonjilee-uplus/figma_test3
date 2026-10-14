import type { ReactNode } from "react";

type BottomCTAProps = {
  Layout?: "single" | "double" | "price";
  AmountLabel?: string;
  Amount?: string;
  // 버튼 위에 표시하는 안내 문구(예: 저장 실패)
  Notice?: string | null;
  children: ReactNode;
};

// BottomCTA: Layout = single | double | price.
// double은 보조+핵심 액션을 가로로 나란히 둔다. price는 요약 값과 핵심 액션을 함께 둔다.
export default function BottomCTA({ Layout = "single", AmountLabel, Amount, Notice, children }: BottomCTAProps) {
  return (
    <div
      className="flex flex-col w-full"
      style={{
        marginTop: "auto",
        gap: "var(--spacing-12)",
        paddingTop: "var(--spacing-16)",
        paddingLeft: "var(--spacing-16)",
        paddingRight: "var(--spacing-16)",
        paddingBottom: "var(--spacing-32)",
        backgroundColor: "var(--color-bg-surface)",
      }}
    >
      {Layout === "price" ? (
        <div className="flex items-center justify-between">
          <span className="ts-body-small-medium" style={{ color: "var(--color-text-secondary)" }}>
            {AmountLabel}
          </span>
          <span className="ts-subtitle-bold" style={{ color: "var(--color-text-primary)" }}>
            {Amount}
          </span>
        </div>
      ) : null}
      {Notice ? (
        <p role="alert" className="ts-caption-medium" style={{ color: "var(--color-text-error)" }}>
          {Notice}
        </p>
      ) : null}
      <div
        className={Layout === "double" ? "flex" : "flex flex-col"}
        style={{ gap: "var(--spacing-8)" }}
      >
        {children}
      </div>
    </div>
  );
}
