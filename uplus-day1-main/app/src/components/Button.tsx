type ButtonProps = {
  Label: string;
  Type?: "Primary" | "Secondary";
  Size?: "sm" | "lg" | "xl";
  State?: "Default" | "Hover" | "Disabled";
  onClick?: () => void;
  fullWidth?: boolean;
};

// Button: Type = Primary | Secondary, Size = sm | lg | xl, State = Default | Hover | Disabled
export default function Button({
  Label,
  Type = "Primary",
  Size = "lg",
  State = "Default",
  onClick,
  fullWidth = false,
}: ButtonProps) {
  const disabled = State === "Disabled";
  const primary = Type === "Primary";
  const hover = State === "Hover";
  const minHeight = Size === "sm" ? "var(--spacing-40)" : Size === "lg" ? "var(--spacing-48)" : "var(--spacing-58)";

  let background = primary ? "var(--color-fill-primary)" : "var(--color-fill-tertiary)";
  let color = primary ? "var(--color-text-on-dark)" : "var(--color-text-primary)";
  if (primary && hover) background = "var(--color-fill-primary-hover)";
  if (disabled) {
    background = "var(--color-fill-disabled)";
    color = "var(--color-text-on-disabled)";
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={(Size === "sm" ? "ts-body-small-strong" : "ts-body-strong") + " flex items-center justify-center" + (fullWidth ? " w-full" : "")}
      style={{
        minHeight,
        paddingLeft: "var(--spacing-16)",
        paddingRight: "var(--spacing-16)",
        borderRadius: "var(--radius-12)",
        backgroundColor: background,
        color,
      }}
    >
      {Label}
    </button>
  );
}
