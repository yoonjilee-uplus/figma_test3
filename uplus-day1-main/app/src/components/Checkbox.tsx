type CheckboxProps = {
  State?: "default" | "active";
  Label: string;
  onToggle?: () => void;
};

// Checkbox: State = default | active. 상태는 체크 표시(✓)와 색을 함께 쓴다.
export default function Checkbox({ State = "default", Label, onToggle }: CheckboxProps) {
  const active = State === "active";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onToggle}
      className="flex items-center text-left w-full"
      style={{ gap: "var(--spacing-12)", backgroundColor: "transparent", color: "var(--color-text-primary)" }}
    >
      <span
        aria-hidden="true"
        className="ts-body-strong flex items-center justify-center"
        style={{
          minWidth: "var(--spacing-24)",
          minHeight: "var(--spacing-24)",
          borderRadius: "var(--radius-4)",
          backgroundColor: active ? "var(--color-fill-primary)" : "var(--color-fill-disabled)",
          color: "var(--color-text-on-dark)",
        }}
      >
        {active ? "✓" : ""}
      </span>
      <span className="ts-caption-medium">{Label}</span>
    </button>
  );
}
