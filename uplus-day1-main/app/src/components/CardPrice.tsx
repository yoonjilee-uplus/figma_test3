type CardPriceProps = {
  Label: string;
  // 강조 값(매달 내는 금액) 1개
  Value: string;
  // 보조 설명(할인 종료 후 금액). 없으면 줄을 표시하지 않는다.
  Sub?: string | null;
};

// Card/Price: 레이블, 강조 값, 보조 설명. 핵심 값은 하나만 강조한다.
export default function CardPrice({ Label, Value, Sub }: CardPriceProps) {
  return (
    <section
      className="flex flex-col w-full"
      style={{
        gap: "var(--spacing-4)",
        padding: "var(--spacing-20)",
        borderRadius: "var(--radius-16)",
        backgroundColor: "var(--color-bg-surface)",
        color: "var(--color-text-primary)",
      }}
    >
      <p className="ts-body-small-medium" style={{ color: "var(--color-text-secondary)" }}>
        {Label}
      </p>
      <p className="ts-heading-h3">{Value}</p>
      {Sub ? (
        <p className="ts-caption-medium" style={{ color: "var(--color-text-secondary)" }}>
          {Sub}
        </p>
      ) : null}
    </section>
  );
}
