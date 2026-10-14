import { useEffect, useRef, useState } from "react";
import plans from "../data/plans.json";
import Header from "../components/Header";
import ListRow from "../components/ListRow";
import Input from "../components/Input";
import Checkbox from "../components/Checkbox";
import BottomCTA from "../components/BottomCTA";
import Button from "../components/Button";
import { navigate, useLocation } from "../lib/router";
import { formatPrice, formatAfterDiscount, makeSubscriptionId } from "../lib/display.js";
import { canSubmit, isValidName, isValidPhone, normalizePhone } from "../lib/validate.js";

const STORAGE_KEY = "subscriptions";

const MSG_NAME = "이름을 입력해 주세요.";
const MSG_PHONE = "휴대폰 번호는 010으로 시작하는 숫자 11자리로 입력해 주세요.";
const MSG_AGREE = "개인정보 수집·이용에 동의해야 신청할 수 있어요.";
const MSG_SAVE = "신청을 저장하지 못했어요. 다시 시도해 주세요.";
const AGREE_TEXT =
  "[필수] 개인정보 수집·이용에 동의합니다. 수집 항목: 이름, 휴대폰 번호 / 이용 목적: 구독 신청 접수와 신청 내역 표시 / 보관 기간: 브라우저 탭을 닫을 때까지(탭을 닫으면 삭제)";

export default function ApplyPage() {
  const loc = useLocation();
  const planId = new URLSearchParams(loc.split("?")[1] ?? "").get("plan");
  const plan = plans.find((p) => p.id === planId);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [focused, setFocused] = useState<"name" | "phone" | null>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [agreeError, setAgreeError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const savingRef = useRef(false);

  // 잘못된 plan: /plans로 교체 이동
  useEffect(() => {
    if (!plan) navigate("/plans", true);
  }, [plan]);

  if (!plan) return null;

  const nameBad = nameTouched && !isValidName(name);
  const phoneBad = phoneTouched && !isValidPhone(phone);

  const nameState = nameBad ? "caution" : focused === "name" ? "focus" : name ? "filled" : "default";
  const phoneState = phoneBad ? "caution" : focused === "phone" ? "focus" : phone ? "filled" : "default";

  const submitEnabled = canSubmit({ name, phone, agreed }) && !saving;

  function submit() {
    if (!plan || savingRef.current || !canSubmit({ name, phone, agreed })) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      const list: { id: string }[] = raw ? JSON.parse(raw) : [];
      const now = new Date();
      const id = makeSubscriptionId(
        now,
        list.map((s) => s.id),
      );
      list.push({
        id,
        name: name.trim(),
        phone: normalizePhone(phone),
        plan_id: plan.id,
        monthly_price: plan.monthly_price,
        agreed_privacy: true,
        created_at: now.toISOString(),
      } as { id: string });
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      navigate("/complete?id=" + id, true);
    } catch {
      savingRef.current = false;
      setSaving(false);
      setSaveError(true);
    }
  }

  const afterDiscount = formatAfterDiscount(plan);
  const detailPath = "/plans/" + plan.id;

  return (
    <div
      className="flex flex-col w-full min-h-screen"
      style={{ backgroundColor: "var(--color-bg-default)", fontFamily: "var(--font-family-family-font)" }}
    >
      <div
        className="flex flex-col w-full min-h-screen"
        style={{ maxWidth: "var(--spacing-390)", marginLeft: "auto", marginRight: "auto" }}
      >
        <Header Type="default" Title="구독 신청" onBack={() => navigate(detailPath)} />

        <main
          className="flex flex-col"
          style={{ padding: "var(--spacing-16)", gap: "var(--spacing-24)", color: "var(--color-text-primary)" }}
        >
          <section
            className="flex flex-col w-full"
            style={{
              paddingLeft: "var(--spacing-20)",
              paddingRight: "var(--spacing-20)",
              borderRadius: "var(--radius-16)",
              backgroundColor: "var(--color-bg-surface)",
            }}
          >
            <ListRow Type="default" Label="요금제" Value={plan.name} />
            <ListRow Type="default" Label="매달 내는 금액" Value={formatPrice(plan.monthly_price)} />
            {afterDiscount ? <ListRow Type="default" Label="할인 종료 후 금액" Value={afterDiscount} /> : null}
          </section>

          <div className="flex flex-col" style={{ gap: "var(--spacing-16)" }}>
            <Input
              Label="이름"
              Value={name}
              State={nameState}
              errorMessage={MSG_NAME}
              autoComplete="off"
              onChange={setName}
              onFocus={() => setFocused("name")}
              onBlur={() => {
                setFocused(null);
                setNameTouched(true);
              }}
            />
            <Input
              Label="휴대폰 번호"
              Value={phone}
              State={phoneState}
              errorMessage={MSG_PHONE}
              inputMode="numeric"
              autoComplete="off"
              onChange={(v) => setPhone(v.replace(/\D/g, ""))}
              onFocus={() => setFocused("phone")}
              onBlur={() => {
                setFocused(null);
                setPhoneTouched(true);
              }}
            />
          </div>

          <div className="flex flex-col" style={{ gap: "var(--spacing-8)" }}>
            <Checkbox
              Label={AGREE_TEXT}
              State={agreed ? "active" : "default"}
              onToggle={() => {
                const next = !agreed;
                setAgreed(next);
                setAgreeError(!next);
              }}
            />
            {agreeError ? (
              <p role="alert" className="ts-caption-medium" style={{ color: "var(--color-text-error)" }}>
                {MSG_AGREE}
              </p>
            ) : null}
          </div>
        </main>

        <BottomCTA Layout="double" Notice={saveError ? MSG_SAVE : null}>
          <Button Type="Secondary" Size="xl" Label="취소" fullWidth onClick={() => navigate(detailPath)} />
          <Button
            Type="Primary"
            Size="xl"
            Label="신청하기"
            fullWidth
            State={submitEnabled ? "Default" : "Disabled"}
            onClick={submit}
          />
        </BottomCTA>
      </div>
    </div>
  );
}
