import type { ReactNode } from "react";
import IconArrowLeft from "./IconArrowLeft";

type HeaderProps = {
  Type?: "default" | "root";
  Title?: string;
  // root일 때 왼쪽에 놓는 브랜드 요소, default일 때 뒤로 가기 버튼
  left?: ReactNode;
  onBack?: () => void;
};

// Header: Type = default | root. 화면당 하나만 배치한다.
export default function Header({ Type = "default", Title, left, onBack }: HeaderProps) {
  return (
    <header
      className="flex items-center w-full"
      style={{
        padding: "var(--spacing-16)",
        gap: "var(--spacing-8)",
        backgroundColor: "var(--color-bg-surface)",
        color: "var(--color-text-primary)",
      }}
    >
      {Type === "default" ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="이전으로"
          className="flex items-center justify-center"
          style={{
            minWidth: "var(--spacing-40)",
            minHeight: "var(--spacing-40)",
            backgroundColor: "transparent",
          }}
        >
          <IconArrowLeft />
        </button>
      ) : (
        left
      )}
      {Title ? (
        <h1 className="ts-subtitle-bold" style={{ color: "var(--color-text-primary)" }}>
          {Title}
        </h1>
      ) : null}
    </header>
  );
}
