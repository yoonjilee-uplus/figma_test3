import { useCallback, useEffect, useState } from "react";
import Header from "../components/Header";
import IconDoneMark from "../components/IconDoneMark";
import ListRow from "../components/ListRow";
import BottomCTA from "../components/BottomCTA";
import Button from "../components/Button";
import { navigate, useLocation } from "../lib/router";
import { formatPrice, formatDateTime } from "../lib/display.js";
import { getSubscription, type SubscriptionRow } from "../lib/subscriptions";

const ID_PATTERN = /^S\d{10}$/;
const MSG_LOAD = "신청 내역을 불러오지 못했어요. 다시 시도해 주세요.";

export default function CompletePage() {
  const loc = useLocation();
  const id = new URLSearchParams(loc.split("?")[1] ?? "").get("id");
  const validId = id !== null && ID_PATTERN.test(id);
  const [sub, setSub] = useState<SubscriptionRow | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!validId || id === null) {
      navigate("/plans", true);
      return;
    }
    let cancelled = false;
    setSub(null);
    getSubscription(id)
      .then((row) => {
        if (cancelled) return;
        if (row === null) navigate("/plans", true);
        else setSub(row);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, validId, attempt]);

  if (!validId) return null;

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
            {sub && (
              <>
                <ListRow Type="default" Label="신청 번호" Value={sub.id} />
                <ListRow Type="default" Label="요금제" Value={sub.plan_name} />
                <ListRow Type="default" Label="월 요금" Value={formatPrice(sub.monthly_price)} />
                <ListRow Type="default" Label="신청 일시" Value={formatDateTime(new Date(sub.created_at))} />
                <ListRow Type="default" Label="신청자" Value={sub.name} />
              </>
            )}
          </section>

          {failed && (
            <div className="flex flex-col items-center" style={{ gap: "var(--spacing-12)" }}>
              <p role="alert" className="ts-caption-medium" style={{ color: "var(--color-text-error)" }}>
                {MSG_LOAD}
              </p>
              <Button Type="Secondary" Size="lg" Label="다시 시도" onClick={load} />
            </div>
          )}
        </main>

        <BottomCTA Layout="single">
          <Button Type="Primary" Size="xl" Label="요금제 더 보기" onClick={() => navigate("/plans")} />
        </BottomCTA>
      </div>
    </div>
  );
}
