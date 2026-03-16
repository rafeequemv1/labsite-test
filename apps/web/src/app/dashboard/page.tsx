"use client";

import { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { getClientPlatformRootDomain } from "@/lib/platform";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

type Template = {
  id: string;
  name: string;
  description: string;
  accentClass: string;
};

type DnsRecord = {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
};

const templates: Template[] = [
  {
    id: "clinical-blue",
    name: "Clinical Blue",
    description: "Clean medical layout with hero, services and appointment CTA.",
    accentClass: "bg-blue-500",
  },
  {
    id: "research-light",
    name: "Research Light",
    description: "Academic-first layout for lab team, projects and publications.",
    accentClass: "bg-emerald-500",
  },
  {
    id: "diagnostics-pro",
    name: "Diagnostics Pro",
    description: "Conversion-focused diagnostics theme with trust blocks.",
    accentClass: "bg-violet-500",
  },
];

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function DashboardPage() {
  const platformRootDomain = getClientPlatformRootDomain();

  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [siteId, setSiteId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [labName, setLabName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [publishedSubdomain, setPublishedSubdomain] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [configuredDomain, setConfiguredDomain] = useState<string | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [isDomainVerified, setIsDomainVerified] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [domainProvider, setDomainProvider] = useState<"mock" | "vercel" | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId],
  );

  const safeSlug = useMemo(() => slugify(labName) || "your-lab", [labName]);
  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_, nextSession) => {
        setSession(nextSession);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Supabase client init failed");
      return undefined;
    }
  }, []);

  useEffect(() => {
    async function restoreLatestState() {
      if (!accessToken) {
        return;
      }

      try {
        const response = await fetch("/api/sites/latest", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = (await response.json()) as {
          site: {
            id: string;
            lab_name: string;
            contact_email: string;
            headline: string;
            description: string;
            template_id: string;
            subdomain: string | null;
          } | null;
          domain: {
            domain: string;
            records: DnsRecord[];
            status: "pending_input" | "dns_configured" | "verified" | "active" | "failed";
          } | null;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to restore latest site state");
        }

        const restoredSite = data.site;
        if (!restoredSite) {
          return;
        }

        setSiteId(restoredSite.id);
        setLabName(restoredSite.lab_name ?? "");
        setContactEmail(restoredSite.contact_email ?? "");
        setHeadline(restoredSite.headline ?? "");
        setDescription(restoredSite.description ?? "");

        const isKnownTemplate = templates.some(
          (template) => template.id === restoredSite.template_id,
        );
        setSelectedTemplateId(isKnownTemplate ? restoredSite.template_id : templates[0].id);
        setPublishedSubdomain(
          restoredSite.subdomain ??
            `${slugify(restoredSite.lab_name || "")}.${platformRootDomain}`,
        );

        if (data.domain) {
          setConfiguredDomain(data.domain.domain);
          setDnsRecords(data.domain.records ?? []);
          setIsDomainVerified(data.domain.status === "verified" || data.domain.status === "active");
        } else {
          setConfiguredDomain(null);
          setDnsRecords([]);
          setIsDomainVerified(false);
        }
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "State restore failed");
      }
    }

    void restoreLatestState();
  }, [accessToken, platformRootDomain]);

  async function runAuth(mode: "signup" | "signin") {
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const credentials = { email: authEmail, password: authPassword };
      const response =
        mode === "signup"
          ? await supabase.auth.signUp(credentials)
          : await supabase.auth.signInWithPassword(credentials);

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.session) {
        setSession(response.data.session);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthError(null);
    setApiError(null);
    setSiteId(null);
    setPublishedSubdomain(null);
    setConfiguredDomain(null);
    setDnsRecords([]);
    setIsDomainVerified(false);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
      setSession(null);
      setSelectedTemplateId(templates[0].id);
      setLabName("");
      setContactEmail("");
      setHeadline("");
      setDescription("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign out failed");
    }
  }

  function authHeaders() {
    if (!accessToken) {
      throw new Error("Please sign in first");
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);
    setIsPublishing(true);

    try {
      const createResponse = await fetch("/api/sites", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          templateId: selectedTemplateId,
          labName,
          contactEmail,
          headline,
          description,
        }),
      });

      const createData = (await createResponse.json()) as {
        site?: { id: string };
        error?: string;
      };

      if (!createResponse.ok || !createData.site) {
        throw new Error(createData.error ?? "Failed to create site");
      }

      setSiteId(createData.site.id);

      const publishResponse = await fetch(`/api/sites/${createData.site.id}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const publishData = (await publishResponse.json()) as {
        site?: { subdomain: string | null };
        error?: string;
      };

      if (!publishResponse.ok || !publishData.site) {
        throw new Error(publishData.error ?? "Failed to publish site");
      }

      setPublishedSubdomain(
        publishData.site.subdomain ?? `${safeSlug}.${platformRootDomain}`,
      );
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unknown publish error");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleAddDomain() {
    if (!domainInput.trim() || !siteId) {
      return;
    }

    setApiError(null);
    setIsAddingDomain(true);

    try {
      const response = await fetch(`/api/sites/${siteId}/domains`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ domain: normalizeDomain(domainInput) }),
      });

      const data = (await response.json()) as {
        domain?: {
          domain: string;
          records: DnsRecord[];
          status: "pending_input" | "dns_configured" | "verified" | "active" | "failed";
        };
        provider?: "mock" | "vercel";
        error?: string;
      };

      if (!response.ok || !data.domain) {
        throw new Error(data.error ?? "Failed to add domain");
      }

      setConfiguredDomain(data.domain.domain);
      setDnsRecords(data.domain.records);
      setDomainProvider(data.provider ?? null);
      setIsDomainVerified(data.domain.status === "verified" || data.domain.status === "active");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unknown add-domain error");
    } finally {
      setIsAddingDomain(false);
    }
  }

  async function handleVerifyDomain() {
    if (!configuredDomain || !siteId) {
      return;
    }

    setApiError(null);
    setIsVerifyingDomain(true);

    try {
      const response = await fetch(
        `/api/sites/${siteId}/domains/${encodeURIComponent(configuredDomain)}/verify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = (await response.json()) as {
        domain?: { status: "pending_input" | "dns_configured" | "verified" | "active" | "failed" };
        provider?: "mock" | "vercel";
        error?: string;
      };

      if (!response.ok || !data.domain) {
        throw new Error(data.error ?? "Failed to verify domain");
      }

      setDomainProvider(data.provider ?? null);
      setIsDomainVerified(data.domain.status === "verified" || data.domain.status === "active");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unknown verify-domain error");
    } finally {
      setIsVerifyingDomain(false);
    }
  }

  const previewUrl = isDomainVerified && configuredDomain
    ? `https://${configuredDomain}`
    : publishedSubdomain
      ? `https://${publishedSubdomain}`
      : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-600">Lab Website Publisher</p>
              <h1 className="mt-2 text-2xl font-semibold">Dashboard</h1>
              <p className="mt-2 text-sm text-slate-600">
                Build your site, publish, and connect a custom domain.
              </p>
            </div>
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Preview site
              </a>
            ) : null}
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">1) Login</h2>
              <p className="text-sm text-slate-600">Supabase email/password authentication.</p>
            </div>
            {session ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-700">
                  Signed in as <span className="font-medium">{session.user.email}</span>
                </p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="w-full max-w-xl space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="owner@lab.com"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                  />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => runAuth("signin")}
                    disabled={isAuthLoading}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300 disabled:text-slate-500"
                  >
                    {isAuthLoading ? "Loading..." : "Sign in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => runAuth("signup")}
                    disabled={isAuthLoading}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            )}
          </div>
          {authError ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {authError}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">2) Choose a template</h2>
          <p className="mt-1 text-sm text-slate-600">Select the base style for your lab website.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {templates.map((template) => {
              const isActive = template.id === selectedTemplateId;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`rounded-xl border p-4 text-left ${
                    isActive
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className={`h-2 w-12 rounded-full ${template.accentClass}`} />
                  <h3 className="mt-3 text-base font-medium">{template.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={handlePublish} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-medium">3) Add lab details</h2>
            <p className="mt-1 text-sm text-slate-600">
              Fill in the core details that power your selected template.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Lab name</span>
                <input
                  required
                  value={labName}
                  onChange={(event) => setLabName(event.target.value)}
                  placeholder="Acme Diagnostics"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-400 focus:ring-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Contact email</span>
                <input
                  required
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="team@acmelabs.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-400 focus:ring-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">Homepage headline</span>
                <input
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="Fast, accurate, trusted diagnostics."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-400 focus:ring-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-700">About description</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="We support physicians and researchers with verified lab results."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-400 focus:ring-2"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!accessToken || isPublishing}
              className="mt-5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isPublishing ? "Publishing..." : "4) Publish website"}
            </button>
          </form>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-medium">Live preview</h2>
            <p className="mt-1 text-sm text-slate-600">Preview of chosen template and details.</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{selectedTemplate.name}</p>
              <h3 className="mt-2 text-xl font-semibold">{labName || "Your lab name"}</h3>
              <p className="mt-1 text-sm text-slate-700">
                {headline || "Your headline will appear here."}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                {description || "Add a short description to explain your lab specialties."}
              </p>
              <p className="mt-4 text-xs text-slate-500">{contactEmail || "contact@example.com"}</p>
            </div>
            {publishedSubdomain ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                Published successfully: <span className="font-medium">{publishedSubdomain}</span>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm text-slate-600">
                Publish to generate your managed subdomain.
              </div>
            )}
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-medium">5) Connect custom domain (Vercel flow)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter a domain, then configure DNS records returned by Vercel.
          </p>
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={domainInput}
              onChange={(event) => setDomainInput(event.target.value)}
              placeholder="labname.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-400 focus:ring-2"
            />
            <button
              type="button"
              onClick={handleAddDomain}
              disabled={!publishedSubdomain || isAddingDomain}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isAddingDomain ? "Adding..." : "Add domain"}
            </button>
          </div>

          {configuredDomain ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-700">
                  Domain: <span className="font-medium">{configuredDomain}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Provider: {domainProvider === "vercel" ? "Vercel API" : "Mock (set Vercel envs)"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Configure these DNS records at your registrar:
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[360px] text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dnsRecords.map((record) => (
                        <tr key={`${record.type}-${record.name}-${record.value}`}>
                          <td className="py-1 pr-3">{record.type}</td>
                          <td className="py-1 pr-3">{record.name}</td>
                          <td className="py-1 text-slate-700">{record.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyDomain}
                  disabled={isVerifyingDomain}
                  className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  {isVerifyingDomain ? "Verifying..." : "Verify DNS"}
                </button>
              </div>
              <div
                className={`rounded-lg border p-3 text-sm ${
                  isDomainVerified
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {isDomainVerified
                  ? `Domain active with HTTPS: https://${configuredDomain}`
                  : "Waiting for DNS propagation. Click verify after updating records."}
              </div>
            </div>
          ) : null}
          {apiError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
