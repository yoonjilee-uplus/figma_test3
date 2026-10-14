import { useEffect } from "react";
import plans from "../data/plans.json";
import Header from "../components/Header";
import Tag from "../components/Tag";
import CardPrice from "../components/CardPrice";
import ListRow from "../components/ListRow";
import BottomCTA from "../components/BottomCTA";
import Button from "../components/Button";
import { navigate } from "../lib/router";
import { formatPrice, formatThrottle, formatAfterDiscount } from "../lib/display.js";

export default function PlanDetailPage({ params }: { params: Record<string, string> }) {
  const id = params.id;
  const plan = plans.find((p) => p.id === id);

  // 잘못된 id: 화면을 그리지 않고 /plans로 교체 이동
  useEffect(() => {
    if (!plan) navigate("/plans", true);
  }, [plan]);

  if (!plan) return null;

  return (
    <div
      className="flex flex-col w-full min-h-screen"
      style={{ backgroundColor: "var(--color-bg-default)", fontFamily: "var(--font-family-family-font)" }}
    >
      <div
        className="flex flex-col w-full min-h-screen"
        style={{ maxWidth: "var(--spacing-390)", marginLeft: "auto", marginRight: "auto" }}
      >
        <Header Type="default" onBack={() => navigate("/plans")} />

        <main
          className="flex flex-col"
          style={{ padding: "var(--spacing-16)", gap: "var(--spacing-16)", color: "var(--color-text-primary)" }}
        >
          <div className="flex flex-col" style={{ gap: "var(--spacing-8)" }}>
            <div className="flex items-center" style={{ gap: "var(--spacing-8)" }}>
              <h2 className="ts-heading-h3">{plan.name}</h2>
              {plan.recommended ? <Tag>추천</Tag> : null}
            </div>
            <p className="ts-body-small-medium" style={{ color: "var(--color-text-secondary)" }}>
              {plan.description}
            </p>
          </div>

          <CardPrice
            Label="매달 내는 금액"
            Value={formatPrice(plan.monthly_price)}
            Sub={formatAfterDiscount(plan)}
          />

          <section
            className="flex flex-col w-full"
            style={{
              paddingLeft: "var(--spacing-20)",
              paddingRight: "var(--spacing-20)",
              borderRadius: "var(--radius-16)",
              backgroundColor: "var(--color-bg-surface)",
            }}
          >
            <ListRow Type="default" Label="데이터" Value={plan.data} />
            <ListRow Type="default" Label="소진 후 속도" Value={formatThrottle(plan)} />
          </section>
        </main>

        <BottomCTA Layout="price" AmountLabel="매달 내는 금액" Amount={formatPrice(plan.monthly_price)}>
          <Button
            Type="Primary"
            Size="xl"
            Label="구독 신청하기"
            onClick={() => navigate("/apply?plan=" + plan.id)}
          />
        </BottomCTA>
      </div>
    </div>
  );
}
