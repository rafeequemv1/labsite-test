# Lab Website Publisher

MVP app to let labs log in, pick a template, fill details, publish, and connect custom domains through Vercel Platforms.

## Workspace

- `apps/web`: Next.js frontend and API routes.
- `packages/shared`: shared domain types.
- `packages/db`: data model/types layer (placeholder for Supabase integration).
- `packages/publisher`: publishing adapter (placeholder for Vercel deployment logic).
- `packages/domain-service`: custom domain utilities (placeholder for Vercel Domains API wrapper).

## Commands

- `npm run dev` start web app locally.
- `npm run build` build app.
- `npm run lint` lint web app.

## Supabase Setup (Step 4)

1. Create a Supabase project.
2. Run SQL from `apps/web/supabase/schema.sql` in the Supabase SQL editor.
3. Create `apps/web/.env.local` from `apps/web/.env.example` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN` (e.g. `labsites.app`)
   - `PLATFORM_ROOT_DOMAIN` (same value)
4. Restart `npm run dev`.

The app now uses Supabase auth (email/password) and persists sites/domains per logged-in user.

## Multi-tenant Domain Routing

- Tenant hosts are resolved via middleware and rewritten to internal tenant pages.
- Supported host resolution:
  - Custom domains verified/active in `public.domains`
  - Platform subdomains stored in `public.sites.subdomain`
- Base app hosts (`localhost`, root platform domain, `*.vercel.app`) continue serving the builder UI.
