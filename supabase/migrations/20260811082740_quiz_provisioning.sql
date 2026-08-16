-- Provisioning from the quiz funnel (quiz.moovebody.com).
--
-- The funnel and this app are separate products on separate Supabase projects,
-- joined by one signed HTTP contract — `fulfillment/v1`, received by the
-- `provision-from-quiz` edge function. Neither database reads the other. See
-- docs/integration/quiz-app-junction.md in the quiz repo.
--
-- This migration adds the three things the receiver needs: a ledger that makes
-- provisioning idempotent, a way to resolve the funnel's plan keys to plans here
-- without hardcoding UUIDs across repositories, and a locale-aware credentials
-- email (the funnel sells in Spanish; this app defaults to pt-BR).

-- ---------------------------------------------------------------- ledger
-- The idempotency key is the Stripe checkout session id, and the unique index on
-- it is the whole defence against duplicate accounts: Stripe redelivers webhooks
-- it did not get a 200 for, and the sender's outbox retries on its own schedule.
-- Both arrive here as the same key, and the second one must be a no-op.
create table if not exists public.quiz_provisions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  source_platform text not null,
  source_tenant_slug text,
  source_quiz_slug text,
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  academy_id uuid references public.academies (id) on delete set null,
  plan_key text,
  locale text,
  -- The whole order as received. Kept because when support asks "what did this
  -- buyer actually answer", the answer must not depend on the sender still
  -- having the row.
  payload jsonb not null,
  -- Email is best-effort and separately retryable: the account existing matters
  -- more than the notification, and re-running the whole delivery to retry a
  -- send would risk touching the account again.
  email_sent boolean not null default false,
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quiz_provisions_email_idx on public.quiz_provisions (email);
create index if not exists quiz_provisions_created_idx on public.quiz_provisions (created_at desc);

-- Only the service role (the edge function) touches this. It holds buyer email
-- and body profile; RLS on with no policy denies anon and authenticated both.
alter table public.quiz_provisions enable row level security;

-- ---------------------------------------------------------------- plan keys
-- The funnel sells "monthly" / "quarterly" / "annual"; this app has plans with
-- UUIDs. A hardcoded UUID in the other repository would be a silent break the
-- first time plans are reseeded.
--
-- A mapping table rather than a column on `plans`, because several funnel keys
-- legitimately resolve to the same plan — monthly, quarterly and annual all buy
-- the same access, they differ only in billing period.
create table if not exists public.plan_external_keys (
  external_key text primary key,
  plan_id uuid not null references public.plans (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.plan_external_keys enable row level security;

do $$
declare
  paid_plan_id uuid;
begin
  select id into paid_plan_id
  from public.plans
  where is_active is not false and coalesce(is_default, false) = false
  order by display_order nulls last, created_at
  limit 1;

  -- No paid plan yet (a fresh reset): leave the table empty. The receiver
  -- treats an unresolved plan key as "provision the account anyway, without a
  -- plan" rather than as a failure — an account with no plan is fixable, a
  -- buyer with no account is a refund.
  if paid_plan_id is not null then
    insert into public.plan_external_keys (external_key, plan_id)
    values ('monthly', paid_plan_id), ('quarterly', paid_plan_id), ('annual', paid_plan_id)
    on conflict (external_key) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------- email
alter type public.email_template_type add value if not exists 'quiz_welcome_credentials';

-- Templates gain a locale. The funnel sells in Spanish and this app's templates
-- are pt-BR; sending a Brazilian-Portuguese credentials email to a buyer who
-- just completed a Spanish quiz is how a paid account goes unopened.
alter table public.email_templates
  add column if not exists locale text not null default 'pt-BR';

-- send-email resolves a template with .maybeSingle(), which errors on more than
-- one row — so (type, locale) has to be unique among active templates, or adding
-- the Spanish copy would break every existing send.
create unique index if not exists email_templates_type_locale_active_idx
  on public.email_templates (type, locale) where is_active;
