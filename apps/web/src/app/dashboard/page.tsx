"use client";

import { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { getClientPlatformRootDomain } from "@/lib/platform";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

type Template = {
  id: string;
  name: string;
  description: string;
  accentClass: string;
};

type SiteSummary = {
  id: string;
  template_id: string;
  lab_name: string;
  contact_email: string;
  headline: string;
  description: string;
  subdomain: string | null;
  active_domain: string | null;
  status: "draft" | "published";
  template_data?: { researchAreas?: string[] };
};

type DnsRecord = {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
};

type DomainSummary = {
  domain: string;
  status: "pending_input" | "dns_configured" | "verified" | "active" | "failed";
  records: DnsRecord[];
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

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*/, "")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function normalizeWildcardInput(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*/, "");
}

function getDefaultResearchAreas() {
  return [
    "Infectious Disease Biomarkers",
    "Molecular Oncology Panels",
    "Precision Diagnostics AI Workflows",
  ];
}

export default function DashboardPage() {
  const platformRootDomain = getClientPlatformRootDomain();

  const [activeMenu, setActiveMenu] = useState<"home" | "themes" | "domains" | "research">("home");
  const [session, setSession] = useState<Session | null>(null);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isCreatingNewSite, setIsCreatingNewSite] = useState(false);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [labName, setLabName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [publishedSubdomain, setPublishedSubdomain] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [wildcardInput, setWildcardInput] = useState("");
  const [wildcardAvailability, setWildcardAvailability] = useState<"unknown" | "available" | "taken">(
    "unknown",
  );
  const [researchInput, setResearchInput] = useState("");
  const [researchAreas, setResearchAreas] = useState<string[]>(getDefaultResearchAreas());

  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingWildcard, setIsSavingWildcard] = useState(false);
  const [isCheckingWildcard, setIsCheckingWildcard] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isDeletingDomain, setIsDeletingDomain] = useState(false);
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
  const [isSettingActiveDomain, setIsSettingActiveDomain] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [activeDomainSelection, setActiveDomainSelection] = useState<string | null>(null);
  const [appOrigin, setAppOrigin] = useState<string | null>(null);
  const isCreatingNewSiteRef = useRef(false);

  const accessToken = session?.access_token ?? null;

  const currentDomainRecord = useMemo(
    () => domains.find((item) => item.domain === selectedDomain) ?? null,
    [domains, selectedDomain],
  );
  const normalizedDomainInput = useMemo(() => normalizeDomain(domainInput), [domainInput]);
  const effectiveSiteId = isCreatingNewSite ? null : (selectedSiteId ?? sites[0]?.id ?? null);
  const canSaveDomain = Boolean(effectiveSiteId && normalizedDomainInput) && !isSavingDomain;

  const tenantPreviewHost = activeDomainSelection ?? publishedSubdomain;

  const appTenantPreviewUrl = useMemo(() => {
    if (!appOrigin || !tenantPreviewHost) {
      return null;
    }
    return `${appOrigin}/site/${tenantPreviewHost}`;
  }, [appOrigin, tenantPreviewHost]);

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
    isCreatingNewSiteRef.current = true;
    setIsCreatingNewSite(true);
    setSelectedSiteId(null);
    setSelectedTemplateId(templates[0].id);
    setLabName("");
    setContactEmail("");
    setHeadline("");
    setDescription("");
    setPublishedSubdomain(null);
    setDomainInput("");
    setWildcardInput("");
    setWildcardAvailability("unknown");
    setDomains([]);
    setSelectedDomain(null);
    setActiveDomainSelection(null);
    setResearchAreas(getDefaultResearchAreas());
  }

  function hydrateEditorFromSite(site: SiteSummary) {
    isCreatingNewSiteRef.current = false;
    setIsCreatingNewSite(false);
    setSelectedSiteId(site.id);
    setLabName(site.lab_name ?? "");
    setContactEmail(site.contact_email ?? "");
    setHeadline(site.headline ?? "");
    setDescription(site.description ?? "");
    setPublishedSubdomain(site.subdomain ?? null);
    setWildcardInput(site.subdomain ?? "");
    setActiveDomainSelection(site.active_domain ?? site.subdomain ?? null);
    setWildcardAvailability("unknown");
    setSelectedTemplateId(
      templates.some((template) => template.id === site.template_id)
        ? site.template_id
        : templates[0].id,
    );
    if (Array.isArray(site.template_data?.researchAreas)) {
      setResearchAreas(site.template_data.researchAreas);
    }
  }

  async function loadDomains(siteId: string, token: string, preferredDomain?: string | null) {
    const response = await fetch(`/api/sites/${siteId}/domains`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await response.json()) as { domains?: DomainSummary[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to fetch site domains");
    }

    const list = data.domains ?? [];
    setDomains(list);
    const preferred =
      list.find((item) => item.domain === preferredDomain)?.domain ??
      list.find((item) => item.domain === activeDomainSelection)?.domain ??
      list[0]?.domain ??
      null;
    setSelectedDomain(preferred);
    setDomainInput(preferred ?? "");
  }

  async function loadSites(token: string) {
    const response = await fetch("/api/sites", {
      headers: { Authorization: `Bearer ${token}` },
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

    // While creating a new site, do not auto-hydrate an existing site
    // from background reloads (auth refresh, token refresh, etc).
    if (isCreatingNewSiteRef.current) {
      return;
    }

    const preferred = list.find((item) => item.id === selectedSiteId) ?? list[0];
    hydrateEditorFromSite(preferred);
    await loadDomains(preferred.id, token, preferred.active_domain ?? preferred.subdomain ?? null);
  }

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => setSession(data.session));

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_, nextSession) => setSession(nextSession));

      return () => subscription.unsubscribe();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Supabase client init failed");
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setAppOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      if (!accessToken) {
        return;
      }
      try {
        await loadSites(accessToken);
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Failed to load dashboard");
      }
    }
    void bootstrap();
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
      isCreatingNewSiteRef.current = false;
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
      const createResponse = await fetch("/api/sites", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          templateId: selectedTemplateId,
          labName,
          contactEmail,
          headline,
          description,
          templateData: { researchAreas },
        }),
      });
      const createData = (await createResponse.json()) as { site?: { id: string }; error?: string };
      if (!createResponse.ok || !createData.site) {
        throw new Error(createData.error ?? "Failed to create site");
      }

      const publishResponse = await fetch(`/api/sites/${createData.site.id}/publish`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          wildcardHostname: wildcardInput.trim() ? normalizeWildcardInput(wildcardInput) : undefined,
        }),
      });
      const publishData = (await publishResponse.json()) as {
        site?: { subdomain: string | null };
        error?: string;
      };
      if (!publishResponse.ok || !publishData.site) {
        throw new Error(publishData.error ?? "Failed to publish site");
      }

      setPublishedSubdomain(publishData.site.subdomain ?? null);
      await loadSites(accessToken as string);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setIsPublishing(false);
    }
  }

  async function checkWildcardNow() {
    if (!wildcardInput.trim()) {
      setWildcardAvailability("unknown");
      return;
    }

    setIsCheckingWildcard(true);
    try {
      let host = normalizeWildcardInput(wildcardInput);
      if (!host.includes(".")) {
        host = `${host}.${platformRootDomain}`;
      }

      const siteId = effectiveSiteId;
      const response = await fetch(
        `/api/wildcards?hostname=${encodeURIComponent(host)}${
          siteId ? `&siteId=${encodeURIComponent(siteId)}` : ""
        }`,
        { headers: authHeaders() },
      );
      const data = (await response.json()) as { available?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to check wildcard");
      }

      setWildcardAvailability(data.available ? "available" : "taken");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Wildcard check failed");
    } finally {
      setIsCheckingWildcard(false);
    }
  }

  async function handleSaveWildcard() {
    const siteId = effectiveSiteId;
    if (!siteId || !wildcardInput.trim()) {
      return;
    }

    setApiError(null);
    setIsSavingWildcard(true);
    try {
      const response = await fetch(`/api/sites/${siteId}/wildcard`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ hostname: wildcardInput }),
      });
      const data = (await response.json()) as {
        site?: { subdomain: string | null };
        error?: string;
      };
      if (!response.ok || !data.site) {
        throw new Error(data.error ?? "Failed to save wildcard");
      }

      setPublishedSubdomain(data.site.subdomain);
      setWildcardInput(data.site.subdomain ?? wildcardInput);
      setWildcardAvailability("available");
      await loadSites(accessToken as string);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Wildcard save failed");
    } finally {
      setIsSavingWildcard(false);
    }
  }

  async function handleSaveDomain() {
    const siteId = effectiveSiteId;
    if (!siteId || !normalizedDomainInput) {
      return;
    }

    setApiError(null);
    setIsSavingDomain(true);
    try {
      const hasSelected = Boolean(selectedDomain);
      const isEdit = hasSelected && selectedDomain !== normalizedDomainInput;
      const endpoint = isEdit
        ? `/api/sites/${siteId}/domains/${encodeURIComponent(selectedDomain as string)}`
        : `/api/sites/${siteId}/domains`;
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { newDomain: normalizedDomainInput }
        : { domain: normalizedDomainInput };

      const response = await fetch(endpoint, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { domain?: { domain: string }; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save domain");
      }

      await loadDomains(siteId, accessToken as string);
      if (data.domain?.domain) {
        setSelectedDomain(data.domain.domain);
        setDomainInput(data.domain.domain);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Domain save failed");
    } finally {
      setIsSavingDomain(false);
    }
  }

  async function handleDeleteSelectedDomain() {
    const siteId = effectiveSiteId;
    if (!siteId || !selectedDomain) {
      return;
    }

    setApiError(null);
    setIsDeletingDomain(true);
    try {
      const response = await fetch(
        `/api/sites/${siteId}/domains/${encodeURIComponent(selectedDomain)}`,
        { method: "DELETE", headers: authHeaders() },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete domain");
      }

      await loadDomains(siteId, accessToken as string);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Domain delete failed");
    } finally {
      setIsDeletingDomain(false);
    }
  }

  async function handleVerifyDomain() {
    const siteId = effectiveSiteId;
    if (!siteId || !selectedDomain) {
      return;
    }

    setApiError(null);
    setIsVerifyingDomain(true);
    try {
      const response = await fetch(
        `/api/sites/${siteId}/domains/${encodeURIComponent(selectedDomain)}/verify`,
        { method: "POST", headers: authHeaders() },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to verify domain");
      }

      await loadDomains(siteId, accessToken as string);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Domain verify failed");
    } finally {
      setIsVerifyingDomain(false);
    }
  }

  const allDomainOptions = useMemo(() => {
    const options: Array<{ domain: string; source: "wildcard" | "custom"; status: string }> = [];
    if (publishedSubdomain) {
      options.push({ domain: publishedSubdomain, source: "wildcard", status: "published" });
    }
    for (const item of domains) {
      options.push({ domain: item.domain, source: "custom", status: item.status });
    }
    return options;
  }, [domains, publishedSubdomain]);

  async function handleSetActiveDomain(domain: string | null) {
    const siteId = effectiveSiteId;
    if (!siteId) {
      return;
    }

    setApiError(null);
    setIsSettingActiveDomain(true);
    try {
      const response = await fetch(`/api/sites/${siteId}/active-domain`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ activeDomain: domain }),
      });
      const data = (await response.json()) as {
        site?: { active_domain: string | null };
        error?: string;
      };
      if (!response.ok || !data.site) {
        throw new Error(data.error ?? "Failed to set active domain");
      }

      setActiveDomainSelection(data.site.active_domain);
      await loadSites(accessToken as string);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Active domain update failed");
    } finally {
      setIsSettingActiveDomain(false);
    }
  }

  async function handleDeleteSite(site: SiteSummary) {
    if (!accessToken) {
      return;
    }

    const confirmed = window.confirm(
      `Delete website "${site.lab_name}"?\n\nThis will remove the website, attached custom domains, and wildcard assignment. This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setApiError(null);
    setDeletingSiteId(site.id);
    try {
      const response = await fetch(`/api/sites/${site.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete website");
      }

      if (selectedSiteId === site.id) {
        clearEditorForNewSite();
      }
      await loadSites(accessToken);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Website delete failed");
    } finally {
      setDeletingSiteId(null);
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

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-semibold">Welcome</h1>
          <p className="mt-2 text-slate-600">
            Sign in or create an account to access your website workspace.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-medium">Sign in</h2>
              <div className="mt-4 space-y-2">
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="owner@lab.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => runAuth("signin")}
                  disabled={isAuthLoading}
                  className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
                >
                  {isAuthLoading ? "Loading..." : "Sign in"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-medium">Create account</h2>
              <div className="mt-4 space-y-2">
                <input
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="owner@lab.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => runAuth("signup")}
                  disabled={isAuthLoading}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 disabled:bg-slate-100"
                >
                  Sign up
                </button>
              </div>
            </section>
          </div>
          {authError ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {authError}
            </div>
          ) : null}
        </div>
      </main>
    );
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
            <button
              type="button"
              onClick={() => setActiveMenu("themes")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeMenu === "themes"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Themes
            </button>
            <button
              type="button"
              onClick={() => setActiveMenu("domains")}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeMenu === "domains"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Domains
            </button>
          </nav>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-6 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          >
            Sign out
          </button>
        </aside>

        <section className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6">
            <h1 className="text-2xl font-semibold">Website Workspace</h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage websites, themes, and domains from the left panel.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Use Home tab to open preview URL in a new browser tab.
            </p>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Your Websites</h2>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu("home");
                  clearEditorForNewSite();
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
              >
                + New website
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className={`rounded-xl border p-4 text-left ${
                    selectedSiteId === site.id
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <button
                    type="button"
                    onClick={async () => {
                      isCreatingNewSiteRef.current = false;
                      hydrateEditorFromSite(site);
                      await loadDomains(
                        site.id,
                        accessToken as string,
                        site.active_domain ?? site.subdomain ?? null,
                      );
                    }}
                    className="w-full text-left"
                  >
                  <p className="text-sm font-medium">{site.lab_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{site.status}</p>
                  <p className="mt-2 text-xs text-slate-500">{site.subdomain ?? "No wildcard set"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Active: {site.active_domain ?? "Not selected"}
                  </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSite(site)}
                    disabled={deletingSiteId === site.id}
                    className="mt-3 rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 disabled:text-slate-400"
                  >
                    {deletingSiteId === site.id ? "Deleting..." : "Delete website"}
                  </button>
                </div>
              ))}
              {!sites.length ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No websites yet. Fill the form below and publish.
                </p>
              ) : null}
            </div>
          </section>

          {activeMenu === "research" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-medium">Research Areas</h2>
              <div className="mt-4 flex gap-2">
                <input
                  value={researchInput}
                  onChange={(event) => setResearchInput(event.target.value)}
                  placeholder="e.g. Immunology Genomics"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-sky-400 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={addResearchArea}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white"
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
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : activeMenu === "themes" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-medium">Themes</h2>
              <p className="text-sm text-slate-600">
                Choose the website theme for the current site.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`rounded-xl border p-4 text-left ${
                      selectedTemplateId === template.id
                        ? "border-sky-400 bg-sky-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className={`h-2 w-12 rounded-full ${template.accentClass}`} />
                    <h3 className="mt-3 text-sm font-medium">{template.name}</h3>
                    <p className="mt-1 text-xs text-slate-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </section>
          ) : activeMenu === "domains" ? (
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium">Domain Manager</h2>
                <p className="text-sm text-slate-600">
                  Add, edit, verify, remove, and choose the active domain for this site.
                </p>
                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                  <input
                    value={domainInput}
                    onChange={(event) => setDomainInput(event.target.value)}
                    placeholder="example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSaveDomain}
                    disabled={!canSaveDomain}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white disabled:bg-slate-400"
                  >
                    {isSavingDomain ? "Saving..." : selectedDomain ? "Save / Edit domain" : "Add domain"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedDomain}
                    disabled={!selectedDomain || isDeletingDomain}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 disabled:text-slate-400"
                  >
                    {isDeletingDomain ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-medium">Wildcard Domain</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Set or update your wildcard subdomain hostname.
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    value={wildcardInput}
                    onChange={(event) => {
                      setWildcardInput(event.target.value);
                      setWildcardAvailability("unknown");
                    }}
                    placeholder={`my-lab.${platformRootDomain}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={checkWildcardNow}
                    disabled={isCheckingWildcard}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {isCheckingWildcard ? "Checking..." : "Check"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWildcard}
                    disabled={!effectiveSiteId || isSavingWildcard}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:bg-slate-400"
                  >
                    {isSavingWildcard ? "Saving..." : "Save wildcard"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Availability:{" "}
                  {wildcardAvailability === "unknown"
                    ? "not checked"
                    : wildcardAvailability === "available"
                      ? "available"
                      : "taken"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-medium">Select Active Domain</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Active domain is the primary URL shown in preview and dashboard.
                </p>
                <div className="mt-4 space-y-2">
                  {allDomainOptions.map((item) => (
                    <label
                      key={`${item.source}-${item.domain}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <span className="text-sm text-slate-700">
                        {item.domain} <span className="text-xs text-slate-500">({item.source}, {item.status})</span>
                      </span>
                      <input
                        type="radio"
                        name="activeDomain"
                        checked={activeDomainSelection === item.domain}
                        onChange={() => setActiveDomainSelection(item.domain)}
                      />
                    </label>
                  ))}
                  {!allDomainOptions.length ? (
                    <p className="text-sm text-slate-500">Add wildcard or custom domain first.</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void handleSetActiveDomain(activeDomainSelection)}
                  disabled={!effectiveSiteId || isSettingActiveDomain}
                  className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:bg-slate-400"
                >
                  {isSettingActiveDomain ? "Saving active domain..." : "Save active domain"}
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-medium">All Domain Records</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {domains.map((domain) => (
                    <button
                      key={domain.domain}
                      type="button"
                      onClick={() => {
                        setSelectedDomain(domain.domain);
                        setDomainInput(domain.domain);
                      }}
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
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="overflow-x-auto">
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
                      className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
                    >
                      {isVerifyingDomain ? "Verifying..." : "Verify DNS"}
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium">Website Content</h2>
                <form onSubmit={handlePublish} className="mt-6 space-y-4">
                  <input
                    value={labName}
                    onChange={(event) => setLabName(event.target.value)}
                    placeholder="Lab name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="Contact email"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={headline}
                    onChange={(event) => setHeadline(event.target.value)}
                    placeholder="Headline"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Description"
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />

                  <div className="flex flex-wrap gap-2">
                    {appTenantPreviewUrl ? (
                      <a
                        href={appTenantPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                      >
                        Open preview URL
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-400"
                      >
                        Open preview URL
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isPublishing}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
                    >
                      {isPublishing ? "Publishing..." : "Publish new website"}
                    </button>
                  </div>
                </form>
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
