type FilterChipProps = {
  Label: string;
  State?: "default" | "selected";
  onClick?: () => void;
};

// FilterChip: State = default | selected. 같은 그룹에서는 하나만 selected.
export default function FilterChip({ Label, State = "default", onClick }: FilterChipProps) {
  const selected = State === "selected";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={(selected ? "ts-caption-bold" : "ts-caption-medium") + " flex items-center justify-center shrink-0 whitespace-nowrap"}
      style={{
        minHeight: "var(--spacing-40)",
        paddingLeft: "var(--spacing-10)",
        paddingRight: "var(--spacing-10)",
        borderRadius: "var(--radius-full)",
        backgroundColor: selected ? "var(--color-fill-secondary)" : "var(--color-fill-tertiary)",
        color: selected ? "var(--color-text-on-dark)" : "var(--color-text-primary)",
      }}
    >
      {Label}
    </button>
  );
}
