type InputProps = {
  Label: string;
  Value: string;
  State?: "default" | "focus" | "filled" | "caution" | "disabled";
  // caution일 때만 표시한다.
  errorMessage?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric";
  autoComplete?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

// Input: State = default | focus | filled | caution | disabled. 오류 메시지는 caution에서만 노출한다.
export default function Input({
  Label,
  Value,
  State = "default",
  errorMessage,
  placeholder,
  inputMode = "text",
  autoComplete,
  onChange,
  onFocus,
  onBlur,
}: InputProps) {
  const caution = State === "caution";
  const disabled = State === "disabled";
  const focus = State === "focus";

  return (
    <label className="flex flex-col w-full" style={{ gap: "var(--spacing-8)" }}>
      <span className="ts-body-small-medium" style={{ color: "var(--color-text-secondary)" }}>
        {Label}
      </span>
      <input
        type="text"
        value={Value}
        disabled={disabled}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={caution}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="ts-body-medium w-full"
        style={{
          minHeight: "var(--spacing-58)",
          paddingLeft: "var(--spacing-16)",
          paddingRight: "var(--spacing-16)",
          borderRadius: "var(--radius-12)",
          outline: "none",
          backgroundColor: caution
            ? "var(--color-bg-error-subtle)"
            : disabled
              ? "var(--color-fill-disabled)"
              : focus
                ? "var(--color-bg-surface)"
                : "var(--color-bg-subtle)",
          color: disabled ? "var(--color-text-on-disabled)" : "var(--color-text-primary)",
        }}
      />
      {caution && errorMessage ? (
        <span role="alert" className="ts-caption-medium" style={{ color: "var(--color-text-error)" }}>
          {errorMessage}
        </span>
      ) : null}
    </label>
  );
}
