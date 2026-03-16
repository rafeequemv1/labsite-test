import { SiteRow } from "@/lib/repository";

import {
  getDefaultModernElegantTemplateData,
} from "./defaults";
import { ModernElegantLabTemplateData } from "./types";

function mergeTemplateData(
  site: SiteRow,
): ModernElegantLabTemplateData {
  const defaults = getDefaultModernElegantTemplateData({
    labName: site.lab_name,
    headline: site.headline,
    description: site.description,
    contactEmail: site.contact_email,
  });

  const raw = site.template_data ?? {};
  const incoming =
    raw && typeof raw === "object"
      ? (raw as Partial<ModernElegantLabTemplateData>)
      : {};

  return {
    ...defaults,
    ...incoming,
    services: incoming.services ?? defaults.services,
    stats: incoming.stats ?? defaults.stats,
    processSteps: incoming.processSteps ?? defaults.processSteps,
    certifications: incoming.certifications ?? defaults.certifications,
    researchAreas: incoming.researchAreas ?? defaults.researchAreas,
    testimonials: incoming.testimonials ?? defaults.testimonials,
    contact: {
      ...defaults.contact,
      ...(incoming.contact ?? {}),
    },
  };
}

type ModernElegantLabTemplateProps = {
  site: SiteRow;
  host: string;
};

export function ModernElegantLabTemplate({
  site,
  host,
}: ModernElegantLabTemplateProps) {
  const data = mergeTemplateData(site);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Modern Elegant Template
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {data.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            {data.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={data.primaryCtaHref}
              className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
            >
              {data.primaryCtaText}
            </a>
            <span className="rounded-lg border border-slate-300 px-5 py-3 text-sm text-slate-600">
              Live on {host}
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="max-w-4xl text-base leading-7 text-slate-700">
          {data.introBlurb}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {data.stats.map((stat) => (
            <article
              key={`${stat.label}-${stat.value}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold">Core Services</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {data.services.map((service) => (
              <article
                key={service.title}
                className="rounded-xl border border-slate-200 p-5"
              >
                <h3 className="text-lg font-medium">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {service.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold">How We Work</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              {data.processSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="rounded-xl border border-slate-200 p-6">
            <h2 className="text-xl font-semibold">Compliance & Quality</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {data.certifications.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-2 pb-12">
        <article className="rounded-xl border border-slate-200 p-6">
          <h2 className="text-xl font-semibold">Research Areas</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {data.researchAreas.map((area) => (
              <p
                key={area}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                {area}
              </p>
            ))}
          </div>
        </article>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-semibold">What Partners Say</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.testimonials.map((item) => (
              <article
                key={`${item.author}-${item.role}`}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <p className="text-sm leading-6 text-slate-700">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <p className="mt-3 text-sm font-medium">{item.author}</p>
                <p className="text-xs text-slate-500">{item.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-semibold">Contact & Appointments</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <p>Email: {data.contact.email}</p>
            <p>Phone: {data.contact.phone}</p>
            <p>Address: {data.contact.address}</p>
            <p>Hours: {data.contact.hours}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
