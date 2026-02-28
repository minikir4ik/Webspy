-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text default 'free' check (plan in ('free', 'starter', 'pro', 'business')),
  stripe_customer_id text,
  stripe_subscription_id text,
  product_limit int default 10,
  check_interval_minutes int default 1440,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);

-- Tracked Products
create table public.tracked_products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  platform text default 'generic' check (platform in ('shopify', 'amazon', 'walmart', 'generic')),
  product_name text,
  my_price numeric(10,2),
  currency text default 'USD',
  last_check_at timestamptz,
  next_check_at timestamptz,
  last_price numeric(10,2),
  last_stock_status text check (last_stock_status in ('in_stock', 'out_of_stock', 'limited', 'unknown')),
  check_interval_override int,
  status text default 'active' check (status in ('active', 'paused', 'broken', 'pending')),
  consecutive_failures int default 0,
  extraction_config jsonb default '{}',
  created_at timestamptz default now()
);

-- Price Checks (history)
create table public.price_checks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.tracked_products(id) on delete cascade not null,
  price numeric(10,2),
  original_price numeric(10,2),
  currency text,
  stock_status text,
  stock_quantity int,
  raw_extraction jsonb,
  confidence float default 1.0,
  checked_at timestamptz default now()
);

-- Alert Rules
create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.tracked_products(id) on delete cascade not null,
  rule_type text not null check (rule_type in (
    'price_drop_percent', 'price_drop_absolute',
    'price_below', 'price_above',
    'price_increases', 'stock_change',
    'competitor_undercuts_me'
  )),
  threshold numeric(10,2),
  cooldown_minutes int default 360,
  last_triggered_at timestamptz,
  is_active boolean default true,
  notify_channels text[] default '{email}',
  created_at timestamptz default now()
);

-- Alert History
create table public.alert_history (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.alert_rules(id) on delete set null,
  product_id uuid references public.tracked_products(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  old_value text,
  new_value text,
  channels_sent text[],
  created_at timestamptz default now()
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tracked_products enable row level security;
alter table public.price_checks enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alert_history enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can CRUD own projects" on public.projects for all using (auth.uid() = user_id);

create policy "Users can CRUD own tracked products" on public.tracked_products for all using (auth.uid() = user_id);

create policy "Users can view own price checks" on public.price_checks for select using (
  product_id in (select id from public.tracked_products where user_id = auth.uid())
);
create policy "Service can insert price checks" on public.price_checks for insert with check (true);

create policy "Users can CRUD own alert rules" on public.alert_rules for all using (auth.uid() = user_id);

create policy "Users can view own alert history" on public.alert_history for all using (auth.uid() = user_id);

-- Indexes
create index idx_tracked_products_next_check on public.tracked_products(next_check_at) where status = 'active';
create index idx_price_checks_product_time on public.price_checks(product_id, checked_at desc);
create index idx_alert_rules_product on public.alert_rules(product_id) where is_active = true;
create index idx_tracked_products_user on public.tracked_products(user_id);
