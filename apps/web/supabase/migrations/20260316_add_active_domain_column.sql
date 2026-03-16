alter table public.sites
  add column if not exists active_domain text;

update public.sites
set active_domain = coalesce(active_domain, subdomain)
where active_domain is null;
