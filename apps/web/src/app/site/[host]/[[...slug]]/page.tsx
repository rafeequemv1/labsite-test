import { notFound } from "next/navigation";

import { getPublishedSiteByHost } from "@/lib/repository";

type TenantPageProps = {
  params: Promise<{ host: string; slug?: string[] }>;
};

export default async function TenantSitePage({ params }: TenantPageProps) {
  const { host, slug } = await params;
  const site = await getPublishedSiteByHost(host);

  if (!site) {
    notFound();
  }

  const requestedPath = slug?.length ? `/${slug.join("/")}` : "/";

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Live on {host}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{site.lab_name}</h1>
          <p className="mt-2 text-slate-600">
            {site.headline || "Reliable diagnostics and lab services."}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-10 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 p-5 md:col-span-2">
          <h2 className="text-lg font-medium">About</h2>
          <p className="mt-3 text-slate-700">
            {site.description ||
              "This lab website is live through the multi-tenant publishing platform."}
          </p>
        </article>
        <aside className="rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-medium">Contact</h2>
          <p className="mt-3 text-sm text-slate-700">{site.contact_email}</p>
          <p className="mt-2 text-xs text-slate-500">
            Requested path: {requestedPath}
          </p>
        </aside>
      </section>
    </main>
  );
}
