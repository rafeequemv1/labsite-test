create extension if not exists "pgcrypto";

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  lab_name text not null,
  contact_email text not null,
  headline text not null default '',
  description text not null default '',
  status text not null check (status in ('draft', 'published')) default 'draft',
  subdomain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sites_user_id on public.sites(user_id);

create table if not exists public.domains (
  site_id uuid not null references public.sites(id) on delete cascade,
  domain text not null,
  status text not null check (status in ('pending_input', 'dns_configured', 'verified', 'active', 'failed')),
  records jsonb not null default '[]'::jsonb,
  vercel_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (site_id, domain)
);

alter table public.sites enable row level security;
alter table public.domains enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sites' and policyname = 'sites_owner_access'
  ) then
    create policy sites_owner_access on public.sites
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'domains' and policyname = 'domains_owner_access'
  ) then
    create policy domains_owner_access on public.domains
      for all
      using (
        exists (
          select 1
          from public.sites s
          where s.id = site_id
            and s.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.sites s
          where s.id = site_id
            and s.user_id = auth.uid()
        )
      );
  end if;
end $$;
