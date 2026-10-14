type ListRowProps = {
  Label: string;
  Value: string;
  Type?: "default" | "check";
};

// List/Row: Type = default | check. 라벨은 왼쪽, 값은 오른쪽으로 일관되게 정렬한다.
export default function ListRow({ Label, Value, Type = "default" }: ListRowProps) {
  return (
    <div
      className="flex items-center justify-between w-full"
      style={{
        minHeight: "var(--spacing-48)",
        gap: "var(--spacing-12)",
        color: "var(--color-text-primary)",
      }}
    >
      <span className="ts-body-small-medium" style={{ color: "var(--color-text-secondary)" }}>
        {Type === "check" ? "✓ " + Label : Label}
      </span>
      <span className="ts-body-small-strong text-right">{Value}</span>
    </div>
  );
}
