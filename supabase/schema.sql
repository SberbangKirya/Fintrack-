-- FinTrack schema: run this whole file in Supabase SQL Editor.
-- The browser uses only the publishable/anon key; RLS protects every user's records.

create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  amount numeric(14,2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category text not null default 'Другое',
  transaction_date date not null default current_date,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);
create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  limit_amount numeric(14,2) not null check (limit_amount > 0),
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists budgets_user_month_idx
  on public.budgets (user_id, month desc);

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

drop policy if exists "Users can read own transactions" on public.transactions;
create policy "Users can read own transactions"
  on public.transactions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own transactions" on public.transactions;
create policy "Users can create own transactions"
  on public.transactions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions"
  on public.transactions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions"
  on public.transactions for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read own budgets" on public.budgets;
create policy "Users can read own budgets"
  on public.budgets for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own budgets" on public.budgets;
create policy "Users can create own budgets"
  on public.budgets for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own budgets" on public.budgets;
create policy "Users can update own budgets"
  on public.budgets for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own budgets" on public.budgets;
create policy "Users can delete own budgets"
  on public.budgets for delete to authenticated
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
