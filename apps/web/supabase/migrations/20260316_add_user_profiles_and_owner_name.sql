create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sites
add column if not exists owner_name text not null default '';

alter table public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_profiles' and policyname = 'profiles_owner_access'
  ) then
    create policy profiles_owner_access on public.user_profiles
      for all
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;
