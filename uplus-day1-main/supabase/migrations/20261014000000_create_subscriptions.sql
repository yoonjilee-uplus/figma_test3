-- 구독 신청(Subscription) 저장 테이블 — PRD 5장 Subscription 모델 기준 추천안
-- Supabase 대시보드 > SQL Editor에 붙여 실행한다.
-- 주의: PRD는 현재 sessionStorage 저장·"탭을 닫으면 삭제"로 정해져 있다. 이 테이블을 쓰기 전에 PRD와 동의 문구의 보관 기간을 먼저 고친다.

create table public.subscriptions (
  id              text        primary key check (id ~ '^S[0-9]{10}$'),          -- 신청 번호: S + YYMMDD + 임의 4자리
  name            text        not null check (char_length(btrim(name)) between 1 and 20),
  phone           text        not null check (phone ~ '^010[0-9]{8}$'),        -- 010으로 시작하는 숫자 11자리
  plan_id         text        not null check (plan_id in ('p01', 'p02', 'p03', 'p04')),
  plan_name       text        not null,                                         -- 신청 당시 요금제 이름
  monthly_price   integer     not null check (monthly_price > 0),               -- 신청 당시 매달 내는 금액(원)
  agreed_privacy  boolean     not null check (agreed_privacy),                  -- 동의한 신청만 저장
  privacy_version text        not null,                                         -- 동의한 문구 버전
  agreed_at       timestamptz not null default now(),
  created_at      timestamptz not null default now()                            -- 신청 일시
);

-- 브라우저(공개 키)는 신청 추가만 할 수 있고, 테이블을 직접 조회할 수 없다.
alter table public.subscriptions enable row level security;

create policy "anon can insert subscriptions"
  on public.subscriptions for insert
  to anon
  with check (agreed_privacy);

-- 신청 완료 화면용: 신청 번호로 1건만, 휴대폰 번호를 뺀 항목만 돌려준다.
create or replace function public.get_subscription(p_id text)
returns table (id text, name text, plan_id text, plan_name text, monthly_price integer, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.plan_id, s.plan_name, s.monthly_price, s.created_at
  from public.subscriptions s
  where s.id = p_id;
$$;

revoke all on function public.get_subscription(text) from public;
grant execute on function public.get_subscription(text) to anon;
