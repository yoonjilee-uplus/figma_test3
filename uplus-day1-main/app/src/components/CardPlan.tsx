import plans from "../data/plans.json";
import { formatPrice } from "../lib/display.js";
import Tag from "./Tag";
import Chip from "./Chip";
import Button from "./Button";

export type Plan = (typeof plans)[number];

type CardPlanProps = {
  plan: Plan;
  State?: "default" | "selected";
  // 화면에서 formatThrottle(plan)로 만든 문자열
  throttleText: string;
  // 화면에서 formatAfterDiscount(plan)로 만든 문자열 (없으면 null)
  afterDiscountText: string | null;
  onDetail?: () => void;
};

// Card/Plan: State = default | selected.
// 금액은 monthly_price(매달 내는 금액)와 formatAfterDiscount(할인 종료 후 금액, 있을 때만)만 표시한다.
export default function CardPlan({ plan, State = "default", throttleText, afterDiscountText, onDetail }: CardPlanProps) {
  const afterDiscount = afterDiscountText;
  const selected = State === "selected";

  return (
    <article
      className="flex flex-col w-full"
      style={{
        gap: "var(--spacing-12)",
        padding: "var(--spacing-20)",
        borderRadius: "var(--radius-16)",
        backgroundColor: selected ? "var(--color-bg-accent-subtle)" : "var(--color-bg-surface)",
        color: "var(--color-text-primary)",
      }}
    >
      <div className="flex items-center" style={{ gap: "var(--spacing-8)" }}>
        <h2 className="ts-subtitle-bold">{plan.name}</h2>
        {plan.recommended ? <Tag>추천</Tag> : null}
        {plan.discount_months != null ? <Chip Type="sale">{plan.discount_months + "개월 할인"}</Chip> : null}
      </div>

      <p className="ts-body-small-medium" style={{ color: "var(--color-text-secondary)" }}>
        {plan.description}
      </p>

      <div className="flex flex-col" style={{ gap: "var(--spacing-4)" }}>
        <p className="ts-body-small-medium" style={{ color: "var(--color-text-secondary)" }}>
          {"데이터 " + plan.data}
        </p>
        <p className="ts-body-small-strong">{throttleText}</p>
      </div>

      <div className="flex flex-col" style={{ gap: "var(--spacing-4)" }}>
        <p className="flex items-center" style={{ gap: "var(--spacing-8)" }}>
          <span className="ts-caption-medium" style={{ color: "var(--color-text-secondary)" }}>
            매달
          </span>
          <span className="ts-heading-h4">{formatPrice(plan.monthly_price)}</span>
        </p>
        {afterDiscount ? (
          <p className="ts-caption-medium" style={{ color: "var(--color-text-secondary)" }}>
            {afterDiscount}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button Type="Secondary" Size="sm" Label="자세히" onClick={onDetail} />
      </div>
    </article>
  );
}
