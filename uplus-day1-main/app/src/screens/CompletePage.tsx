import { useEffect } from "react";
import plans from "../data/plans.json";
import Header from "../components/Header";
import IconDoneMark from "../components/IconDoneMark";
import ListRow from "../components/ListRow";
import BottomCTA from "../components/BottomCTA";
import Button from "../components/Button";
import { navigate, useLocation } from "../lib/router";
import { formatPrice, formatDateTime } from "../lib/display.js";

type Subscription = {
  id: string;
  name: string;
  plan_id: string;
  monthly_price: number;
  created_at: string;
};

function findSubscription(id: string | null): Subscription | null {
  if (!id) return null;
  try {
    const raw = window.sessionStorage.getItem("subscriptions");
    const list: Subscription[] = raw ? JSON.parse(raw) : [];
    return list.find((s) => s.id === id) ?? null;
  } catch {
    return null;
  }
}

export default function CompletePage() {
  const loc = useLocation();
  const id = new URLSearchParams(loc.split("?")[1] ?? "").get("id");
  const sub = findSubscription(id);
  const plan = sub ? plans.find((p) => p.id === sub.plan_id) : undefined;
  const valid = Boolean(sub && plan);

  // 신청 번호가 없거나 저장된 Subscription에 없으면 /plans로 교체 이동
  useEffect(() => {
    if (!valid) navigate("/plans", true);
  }, [valid]);

  if (!sub || !plan) return null;

  return (
    <div
      className="flex flex-col w-full min-h-screen"
      style={{ backgroundColor: "var(--color-bg-default)", fontFamily: "var(--font-family-family-font)" }}
    >
      <div
        className="flex flex-col w-full min-h-screen"
        style={{ maxWidth: "var(--spacing-390)", marginLeft: "auto", marginRight: "auto" }}
      >
        <Header Type="default" Title="신청 완료" onBack={() => navigate("/plans")} />

        <main
          className="flex flex-col items-center"
          style={{ padding: "var(--spacing-16)", gap: "var(--spacing-24)", color: "var(--color-text-primary)" }}
        >
          <div className="flex flex-col items-center" style={{ gap: "var(--spacing-16)", paddingTop: "var(--spacing-24)" }}>
            <IconDoneMark />
            <h2 className="ts-heading-h4">구독 신청이 완료됐어요</h2>
          </div>

          <section
            className="flex flex-col w-full"
            style={{
              paddingLeft: "var(--spacing-20)",
              paddingRight: "var(--spacing-20)",
              borderRadius: "var(--radius-16)",
              backgroundColor: "var(--color-bg-surface)",
            }}
          >
            <ListRow Type="default" Label="신청 번호" Value={sub.id} />
            <ListRow Type="default" Label="요금제" Value={plan.name} />
            <ListRow Type="default" Label="월 요금" Value={formatPrice(sub.monthly_price)} />
            <ListRow Type="default" Label="신청 일시" Value={formatDateTime(new Date(sub.created_at))} />
            <ListRow Type="default" Label="신청자" Value={sub.name} />
          </section>
        </main>

        <BottomCTA Layout="single">
          <Button Type="Primary" Size="xl" Label="요금제 더 보기" onClick={() => navigate("/plans")} />
        </BottomCTA>
      </div>
    </div>
  );
}
