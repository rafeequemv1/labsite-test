import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <nav className="mb-14 flex items-center justify-between">
          <p className="text-sm font-semibold tracking-wide text-sky-700">
            LAB WEBSITE PUBLISHER
          </p>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Open dashboard
          </Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Publish your lab website with custom domain in minutes
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              Sign in, pick a template, add your lab details, publish instantly, and
              connect your own domain with guided DNS steps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-medium text-white hover:bg-sky-700"
              >
                Get started
              </Link>
              <a
                href="#how-it-works"
                className="rounded-lg border border-slate-300 px-5 py-3 text-sm hover:bg-slate-50"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-lg font-semibold">What you get</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li>- Template-based website builder for labs</li>
              <li>- One-click publish to managed subdomain</li>
              <li>- Vercel-backed custom domain setup</li>
              <li>- DNS verification + SSL via Vercel</li>
              <li>- Multi-tenant host routing for live sites</li>
            </ul>
          </div>
        </div>

        <section id="how-it-works" className="mt-16 rounded-2xl border border-slate-200 p-6">
          <h3 className="text-xl font-semibold">How it works</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Login",
              "Select template",
              "Add details",
              "Publish",
              "Connect domain",
            ].map((step, index) => (
              <div key={step} className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="text-slate-500">Step {index + 1}</p>
                <p className="mt-1 font-medium">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
