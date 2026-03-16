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

type SiteSummary = {
  id: string;
  template_id: string;
  lab_name: string;
  contact_email: string;
  headline: string;
  description: string;
  subdomain: string | null;
  status: "draft" | "published";
  template_data?: { researchAreas?: string[] };
  updated_at: string;
};

type DomainSummary = {
  domain: string;
  status: "pending_input" | "dns_configured" | "verified" | "active" | "failed";
  records: DnsRecord[];
};

type WildcardSummary = {
  id: string;
  hostname: string;
  status: "available" | "reserved" | "active";
  site_id: string | null;
};

const templates: Template[] = [
  {
    id: "modern-elegant-lab",
    name: "Modern Elegant Lab",
    description: "Premium layout with rich research and quality sections.",
    accentClass: "bg-slate-900",
  },
  {
    id: "clinical-blue",
    name: "Clinical Blue",
    description: "Clean medical layout with hero, services and CTA.",
    accentClass: "bg-blue-500",
  },
  {
    id: "research-light",
    name: "Research Light",
    description: "Academic-first layout for lab teams and publications.",
    accentClass: "bg-emerald-500",
  },
  {
    id: "diagnostics-pro",
    name: "Diagnostics Pro",
    description: "Conversion-focused diagnostics with trust blocks.",
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

  const [activeMenu, setActiveMenu] = useState<"home" | "research">("home");
  const [showDraftPreview, setShowDraftPreview] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [wildcards, setWildcards] = useState<WildcardSummary[]>([]);
  const [selectedWildcardHostname, setSelectedWildcardHostname] = useState<string>("");

  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [labName, setLabName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [publishedSubdomain, setPublishedSubdomain] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [researchInput, setResearchInput] = useState("");
  const [researchAreas, setResearchAreas] = useState<string[]>([
    "Infectious Disease Biomarkers",
    "Molecular Oncology Panels",
    "Precision Diagnostics AI Workflows",
  ]);

  const [isPublishing, setIsPublishing] = useState(false);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const accessToken = session?.access_token ?? null;
  const safeSlug = useMemo(() => slugify(labName) || "your-lab", [labName]);

  const currentDomainRecord = useMemo(
    () => domains.find((item) => item.domain === selectedDomain) ?? null,
    [domains, selectedDomain],
  );

  const isDomainVerified =
    currentDomainRecord?.status === "verified" || currentDomainRecord?.status === "active";

  const previewUrl = isDomainVerified && selectedDomain
    ? `https://${selectedDomain}`
    : publishedSubdomain
      ? `https://${publishedSubdomain}`
      : null;

  function authHeaders() {
    if (!accessToken) {
      throw new Error("Please sign in first");
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  }

  function clearEditorForNewSite() {
    setSelectedSiteId(null);
    setSelectedTemplateId(templates[0].id);
    setLabName("");
    setContactEmail("");
    setHeadline("");
    setDescription("");
    setPublishedSubdomain(null);
    setDomainInput("");
    setDomains([]);
    setSelectedDomain(null);
    setResearchAreas([
      "Infectious Disease Biomarkers",
      "Molecular Oncology Panels",
      "Precision Diagnostics AI Workflows",
    ]);
    setShowDraftPreview(false);
    setSelectedWildcardHostname("");
  }

  function hydrateEditorFromSite(site: SiteSummary) {
    setSelectedSiteId(site.id);
    setLabName(site.lab_name ?? "");
    setContactEmail(site.contact_email ?? "");
    setHeadline(site.headline ?? "");
    setDescription(site.description ?? "");
    setPublishedSubdomain(site.subdomain ?? `${slugify(site.lab_name || "")}.${platformRootDomain}`);
    setSelectedTemplateId(
      templates.some((template) => template.id === site.template_id)
        ? site.template_id
        : templates[0].id,
    );
    if (Array.isArray(site.template_data?.researchAreas)) {
      setResearchAreas(site.template_data.researchAreas);
    }
    setSelectedWildcardHostname("");
  }

  async function loadDomains(siteId: string, token: string) {
    const response = await fetch(`/api/sites/${siteId}/domains`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as { domains?: DomainSummary[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to fetch site domains");
    }

    const list = data.domains ?? [];
    setDomains(list);
    setSelectedDomain(list[0]?.domain ?? null);
  }

  async function loadSites(token: string) {
    const response = await fetch("/api/sites", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as { sites?: SiteSummary[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to fetch sites");
    }

    const list = data.sites ?? [];
    setSites(list);

    if (!list.length) {
      clearEditorForNewSite();
      return;
    }

    const preferred = list.find((site) => site.id === selectedSiteId) ?? list[0];
    hydrateEditorFromSite(preferred);
    await loadDomains(preferred.id, token);
  }

  async function loadWildcards(token: string) {
    const response = await fetch("/api/wildcards", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as { wildcards?: WildcardSummary[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to fetch wildcards");
    }

    setWildcards(data.wildcards ?? []);
  }

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
    async function bootstrapDashboard() {
      if (!accessToken) {
        return;
      }

      try {
        await loadSites(accessToken);
        await loadWildcards(accessToken);
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Failed to load dashboard");
      }
    }

    void bootstrapDashboard();
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runAuth(mode: "signup" | "signin") {
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const credentials = { email: authEmail, password: authPassword };
      const response =
        mode === "signup"
          ? await supabase.auth.signUp({
              ...credentials,
              options: {
                data: {
                  full_name: authName.trim() || authEmail.split("@")[0] || "Lab Owner",
                },
              },
            })
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

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
      setSession(null);
      setSites([]);
      clearEditorForNewSite();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Sign out failed");
    }
  }

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);
    setIsPublishing(true);

    try {
      if (!accessToken) {
        throw new Error("Please sign in first");
      }

      const createResponse = await fetch("/api/sites", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          templateId: selectedTemplateId,
          labName,
          contactEmail,
          headline,
          description,
          templateData: {
            researchAreas,
          },
        }),
      });

      const createData = (await createResponse.json()) as {
        site?: { id: string; subdomain: string | null };
        error?: string;
      };

      if (!createResponse.ok || !createData.site) {
        throw new Error(createData.error ?? "Failed to create site");
      }

      const createdSiteId = createData.site.id;
      setSelectedSiteId(createdSiteId);

      const publishResponse = await fetch(`/api/sites/${createdSiteId}/publish`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          wildcardHostname: selectedWildcardHostname || undefined,
        }),
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

      await loadSites(accessToken);
      await loadWildcards(accessToken);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unknown publish error");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleAddDomain() {
    if (!domainInput.trim() || !selectedSiteId) {
      return;
    }

    setApiError(null);
    setIsAddingDomain(true);

    try {
      const response = await fetch(`/api/sites/${selectedSiteId}/domains`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ domain: normalizeDomain(domainInput) }),
      });

      const data = (await response.json()) as {
        domain?: {
          domain: string;
        };
        error?: string;
      };

      if (!response.ok || !data.domain) {
        throw new Error(data.error ?? "Failed to add domain");
      }

      await loadDomains(selectedSiteId, accessToken as string);
      setSelectedDomain(data.domain.domain);
      setDomainInput("");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unknown add-domain error");
    } finally {
      setIsAddingDomain(false);
    }
  }

  async function handleVerifyDomain() {
    if (!selectedDomain || !selectedSiteId) {
      return;
    }

    setApiError(null);
    setIsVerifyingDomain(true);

    try {
      const response = await fetch(
        `/api/sites/${selectedSiteId}/domains/${encodeURIComponent(selectedDomain)}/verify`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to verify domain");
      }

      await loadDomains(selectedSiteId, accessToken as string);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unknown verify-domain error");
    } finally {
      setIsVerifyingDomain(false);
    }
  }

  function addResearchArea() {
    const normalized = researchInput.trim();
    if (!normalized) {
      return;
    }

    if (!researchAreas.includes(normalized)) {
      setResearchAreas((current) => [...current, normalized]);
    }
    setResearchInput("");
  }

  function removeResearchArea(area: string) {
    setResearchAreas((current) => current.filter((item) => item !== area));
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Dashboard
          </p>
          <nav className="mt-4 space-y-1">
            <button
              type="button"
              onClick={() => setActiveMenu("home")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeMenu === "home"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu("research")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeMenu === "research"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Research
            </button>
          </nav>
        </aside>

        <section className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-600">Lab Website Publisher</p>
                <h1 className="mt-2 text-2xl font-semibold">Workspace</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Manage multiple lab websites and domains.
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
            <h2 className="text-lg font-medium">Account</h2>
            <p className="text-sm text-slate-600">Sign in to manage your sites.</p>
            {session ? (
              <div className="mt-4 flex items-center justify-between gap-3">
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
              <div className="mt-4 w-full max-w-2xl space-y-2">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={authName}
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                  />
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
            {authError ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {authError}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Your Websites</h2>
              <button
                type="button"
                onClick={clearEditorForNewSite}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
              >
                + New website
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={async () => {
                    hydrateEditorFromSite(site);
                    if (accessToken) {
                      await loadDomains(site.id, accessToken);
                    }
                  }}
                  className={`rounded-xl border p-4 text-left ${
                    selectedSiteId === site.id
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <p className="text-sm font-medium">{site.lab_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{site.status}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {site.subdomain ?? "No subdomain yet"}
                  </p>
                </button>
              ))}
              {!sites.length ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No websites yet. Create your first one below.
                </p>
              ) : null}
            </div>
          </section>

          {activeMenu === "research" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-medium">Research Areas</h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage research focus areas saved into template data.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  value={researchInput}
                  onChange={(event) => setResearchInput(event.target.value)}
                  placeholder="e.g. Genomic Oncology"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={addResearchArea}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Add
                </button>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {researchAreas.map((area) => (
                  <div
                    key={area}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-sm text-slate-700">{area}</p>
                    <button
                      type="button"
                      onClick={() => removeResearchArea(area)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium">Template & Content</h2>
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

                <form onSubmit={handlePublish} className="mt-6 space-y-4">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-700">Lab name</span>
                    <input
                      required
                      value={labName}
                      onChange={(event) => setLabName(event.target.value)}
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-400 focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-700">Headline</span>
                    <input
                      value={headline}
                      onChange={(event) => setHeadline(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-400 focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-700">Description</span>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none ring-sky-400 focus:ring-2"
                    />
                  </label>

                  <div>
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Publish with available wildcard (optional)
                    </p>
                    <select
                      value={selectedWildcardHostname}
                      onChange={(event) => setSelectedWildcardHostname(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                    >
                      <option value="">Auto-generate from lab name</option>
                      {wildcards.map((wildcard) => (
                        <option
                          key={wildcard.id}
                          value={wildcard.hostname}
                          disabled={wildcard.status !== "available"}
                        >
                          {wildcard.hostname} ({wildcard.status})
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {wildcards.map((wildcard) => (
                        <span
                          key={`${wildcard.hostname}-badge`}
                          className={`rounded-full px-2 py-1 text-xs ${
                            wildcard.status === "available"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {wildcard.hostname}: {wildcard.status}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDraftPreview((current) => !current)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
                    >
                      {showDraftPreview ? "Hide preview" : "Preview before publish"}
                    </button>
                    <button
                      type="submit"
                      disabled={!accessToken || isPublishing}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                    >
                      {isPublishing ? "Publishing..." : "Publish as new site"}
                    </button>
                  </div>
                </form>
              </section>

              {showDraftPreview ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-lg font-medium">Draft Preview</h2>
                  <p className="mt-2 text-sm text-slate-700">{labName || "Your lab name"}</p>
                  <p className="text-sm text-slate-600">{headline || "Headline preview"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {researchAreas.map((area) => (
                      <span
                        key={area}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium">Domain Setup</h2>
                <p className="text-sm text-slate-600">
                  Domain setup is now accurate per selected website card.
                </p>
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={domainInput}
                    onChange={(event) => setDomainInput(event.target.value)}
                    placeholder="example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-sky-400 focus:ring-2"
                  />
                  <button
                    type="button"
                    onClick={handleAddDomain}
                    disabled={!selectedSiteId || isAddingDomain}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
                  >
                    {isAddingDomain ? "Adding..." : "Add domain"}
                  </button>
                </div>

                {domains.length ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {domains.map((domain) => (
                        <button
                          key={domain.domain}
                          type="button"
                          onClick={() => setSelectedDomain(domain.domain)}
                          className={`rounded-lg border px-3 py-1 text-xs ${
                            selectedDomain === domain.domain
                              ? "border-sky-400 bg-sky-50 text-sky-700"
                              : "border-slate-300 text-slate-700"
                          }`}
                        >
                          {domain.domain} ({domain.status})
                        </button>
                      ))}
                    </div>

                    {currentDomainRecord ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium">{currentDomainRecord.domain}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Status: {currentDomainRecord.status}
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
                              {currentDomainRecord.records.map((record) => (
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
                          className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          {isVerifyingDomain ? "Verifying..." : "Verify DNS"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    No domains added for this site yet.
                  </p>
                )}
              </section>
            </>
          )}

          {apiError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {apiError}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
