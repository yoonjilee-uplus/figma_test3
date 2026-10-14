type ChipProps = {
  Type?: "benefit" | "package" | "sale";
  children: string;
};

// Chip: Type = benefit | package | sale. 짧은 범주·상태 표시용.
export default function Chip({ Type = "benefit", children }: ChipProps) {
  const sale = Type === "sale";
  return (
    <span
      className="ts-caption-small-bold flex items-center justify-center"
      style={{
        minHeight: sale ? "var(--spacing-24)" : "var(--spacing-20)",
        paddingLeft: "var(--spacing-8)",
        paddingRight: "var(--spacing-8)",
        borderRadius: "var(--radius-4)",
        backgroundColor: sale ? "var(--color-fill-primary)" : "var(--color-bg-subtle)",
        color: sale ? "var(--color-text-on-dark)" : "var(--color-text-secondary)",
      }}
    >
      {children}
    </span>
  );
}
