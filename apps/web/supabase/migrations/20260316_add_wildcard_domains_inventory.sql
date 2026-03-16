create table if not exists public.wildcard_domains (
  id uuid primary key default gen_random_uuid(),
  hostname text not null unique,
  status text not null check (status in ('available', 'reserved', 'active')) default 'available',
  site_id uuid references public.sites(id) on delete set null,
  reserved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wildcard_domains enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'wildcard_domains' and policyname = 'wildcards_read_access'
  ) then
    create policy wildcards_read_access on public.wildcard_domains
      for select
      using (auth.uid() is not null);
  end if;
end $$;

insert into public.wildcard_domains (hostname, status)
values
  ('atlas.labsites.app', 'available'),
  ('nova.labsites.app', 'available'),
  ('aurora.labsites.app', 'available'),
  ('helix.labsites.app', 'available'),
  ('vital.labsites.app', 'available'),
  ('zenith.labsites.app', 'available')
on conflict (hostname) do nothing;
