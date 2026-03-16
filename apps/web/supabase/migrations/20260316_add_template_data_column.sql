alter table public.sites
add column if not exists template_data jsonb not null default '{}'::jsonb;
