-- =============================================
-- СМЕНА — Database Schema
-- =============================================

-- Restaurants
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner', 'manager', 'worker')),
  restaurant_id uuid references restaurants(id) on delete cascade,
  avatar_url text,
  created_at timestamptz default now()
);

-- Invites
create table invites (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default gen_random_uuid()::text,
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  role text not null check (role in ('manager', 'worker')),
  created_by uuid references profiles(id) on delete cascade not null,
  email text,
  used boolean default false,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  deadline timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- Row Level Security
-- =============================================

alter table restaurants enable row level security;
alter table profiles enable row level security;
alter table invites enable row level security;
alter table tasks enable row level security;

-- Profiles: read own profile + same restaurant
create policy "profiles_select" on profiles for select
  using (
    id = auth.uid() or
    restaurant_id = (select restaurant_id from profiles where id = auth.uid())
  );

create policy "profiles_insert" on profiles for insert
  with check (id = auth.uid());

create policy "profiles_update" on profiles for update
  using (id = auth.uid());

-- Restaurants: members can read their restaurant
create policy "restaurants_select" on restaurants for select
  using (
    id = (select restaurant_id from profiles where id = auth.uid())
  );

create policy "restaurants_insert" on restaurants for insert
  with check (true);

-- Tasks: members see tasks in their restaurant
create policy "tasks_select" on tasks for select
  using (
    restaurant_id = (select restaurant_id from profiles where id = auth.uid())
  );

create policy "tasks_insert" on tasks for insert
  with check (
    restaurant_id = (select restaurant_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('owner', 'manager')
  );

create policy "tasks_update" on tasks for update
  using (
    restaurant_id = (select restaurant_id from profiles where id = auth.uid())
  );

create policy "tasks_delete" on tasks for delete
  using (
    restaurant_id = (select restaurant_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('owner', 'manager')
  );

-- Invites: owner/manager can manage invites
create policy "invites_select" on invites for select
  using (
    restaurant_id = (select restaurant_id from profiles where id = auth.uid())
  );

create policy "invites_insert" on invites for insert
  with check (
    restaurant_id = (select restaurant_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('owner', 'manager')
  );

create policy "invites_update" on invites for update
  using (true);

-- =============================================
-- Auto-update updated_at
-- =============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();
