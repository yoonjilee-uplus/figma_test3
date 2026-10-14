import { useState } from "react";
import plans from "../data/plans.json";
import Header from "../components/Header";
import Logo from "../components/Logo";
import FilterChip from "../components/FilterChip";
import CardPlan from "../components/CardPlan";
import { navigate } from "../lib/router";
import { formatThrottle, formatAfterDiscount } from "../lib/display.js";

// PRD 4-1: 단일 선택 칩 4개
const FILTERS = [
  { key: "all", label: "전체", ids: ["p01", "p02", "p03", "p04"] },
  { key: "lte50", label: "50GB 이하", ids: ["p01", "p02"] },
  { key: "gte100", label: "100GB 이상", ids: ["p03", "p04"] },
  { key: "nothrottle", label: "속도 제한 없음", ids: ["p04"] },
];

export default function PlansPage() {
  const [selected, setSelected] = useState("all");
  const filter = FILTERS.find((f) => f.key === selected) ?? FILTERS[0];

  // 기본 정렬: 매달 내는 금액이 낮은 순
  const visible = plans
    .filter((p) => filter.ids.includes(p.id))
    .sort((a, b) => a.monthly_price - b.monthly_price);

  return (
    <div
      className="flex flex-col w-full min-h-screen"
      style={{ backgroundColor: "var(--color-bg-default)", fontFamily: "var(--font-family-family-font)" }}
    >
      <div
        className="flex flex-col w-full"
        style={{ maxWidth: "var(--spacing-390)", marginLeft: "auto", marginRight: "auto" }}
      >
        <Header Type="root" Title="요금제" left={<Logo />} />

        <main
          className="flex flex-col"
          style={{ padding: "var(--spacing-16)", gap: "var(--spacing-16)" }}
        >
          <div
            role="group"
            aria-label="요금제 필터"
            className="flex"
            style={{ gap: "var(--spacing-8)" }}
          >
            {FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                Label={f.label}
                State={f.key === selected ? "selected" : "default"}
                onClick={() => setSelected(f.key)}
              />
            ))}
          </div>

          <div className="flex flex-col" style={{ gap: "var(--spacing-16)" }}>
            {visible.map((plan) => (
              <CardPlan
                key={plan.id}
                plan={plan}
                throttleText={formatThrottle(plan)}
                afterDiscountText={formatAfterDiscount(plan)}
                onDetail={() => navigate("/plans/" + plan.id)} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
