import { DnsRecord } from "./types";
import { getPlatformRootDomain } from "./platform";
import { getSupabaseAdminClient } from "./supabase-server";
import { getDefaultTemplateData } from "@/templates/defaults";

export type SiteRow = {
  id: string;
  user_id: string;
  owner_name: string;
  template_id: string;
  lab_name: string;
  contact_email: string;
  headline: string;
  description: string;
  template_data: Record<string, unknown>;
  status: "draft" | "published";
  subdomain: string | null;
  created_at: string;
  updated_at: string;
};

export type DomainRow = {
  site_id: string;
  domain: string;
  status: "pending_input" | "dns_configured" | "verified" | "active" | "failed";
  records: DnsRecord[];
  vercel_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type WildcardRow = {
  id: string;
  hostname: string;
  status: "available" | "reserved" | "active";
  site_id: string | null;
  reserved_by: string | null;
  created_at: string;
  updated_at: string;
};

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createSiteForUser(input: {
  userId: string;
  ownerName: string;
  templateId: string;
  labName: string;
  contactEmail: string;
  headline: string;
  description: string;
  templateData?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const subdomainSlug = slugify(input.labName);
  const platformRootDomain = getPlatformRootDomain();
  const supabase = getSupabaseAdminClient();

  const payload = {
    user_id: input.userId,
    owner_name: input.ownerName,
    template_id: input.templateId,
    lab_name: input.labName,
    contact_email: input.contactEmail,
    headline: input.headline,
    description: input.description,
    template_data:
      input.templateData ??
      getDefaultTemplateData(input.templateId, {
        labName: input.labName,
        headline: input.headline,
        description: input.description,
        contactEmail: input.contactEmail,
      }),
    status: "draft" as const,
    subdomain: subdomainSlug ? `${subdomainSlug}.${platformRootDomain}` : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("sites").insert(payload).select("*").single();

  if (error || !data) {
    throw new Error(`Failed to create site: ${error?.message ?? "Unknown error"}`);
  }

  return data as SiteRow;
}

export async function upsertUserProfile(input: {
  userId: string;
  email: string;
  fullName: string;
}) {
  const now = new Date().toISOString();
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        id: input.userId,
        email: input.email,
        full_name: input.fullName,
        updated_at: now,
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert user profile: ${error?.message ?? "Unknown error"}`);
  }

  return data;
}

function normalizeHost(input: string): string {
  return input.trim().toLowerCase().replace(/:\d+$/, "");
}

export async function getSiteForUser(siteId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as SiteRow;
}

export async function getLatestSiteForUser(userId: string): Promise<SiteRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as SiteRow;
}

export async function listSitesForUser(userId: string): Promise<SiteRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as SiteRow[];
}

export async function publishSiteForUser(
  siteId: string,
  userId: string,
  options?: { subdomain?: string },
) {
  const supabase = getSupabaseAdminClient();
  const updatePayload: { status: "published"; updated_at: string; subdomain?: string } = {
    status: "published",
    updated_at: new Date().toISOString(),
  };

  if (options?.subdomain) {
    updatePayload.subdomain = options.subdomain;
  }

  const { data, error } = await supabase
    .from("sites")
    .update(updatePayload)
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to publish site: ${error?.message ?? "Unknown error"}`);
  }

  return data as SiteRow;
}

export async function listWildcards(): Promise<WildcardRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wildcard_domains")
    .select("*")
    .order("hostname", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data as WildcardRow[];
}

export async function reserveWildcardForSite(input: {
  hostname: string;
  siteId: string;
  userId: string;
}): Promise<WildcardRow> {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("wildcard_domains")
    .update({
      status: "active",
      site_id: input.siteId,
      reserved_by: input.userId,
      updated_at: now,
    })
    .eq("hostname", input.hostname)
    .eq("status", "available")
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Wildcard unavailable: ${error?.message ?? "No available record"}`);
  }

  return data as WildcardRow;
}

export async function upsertDomainForSite(input: {
  siteId: string;
  domain: string;
  status: "pending_input" | "dns_configured" | "verified" | "active" | "failed";
  records: DnsRecord[];
  vercelVerified: boolean;
}) {
  const now = new Date().toISOString();
  const supabase = getSupabaseAdminClient();

  const payload = {
    site_id: input.siteId,
    domain: input.domain,
    status: input.status,
    records: input.records,
    vercel_verified: input.vercelVerified,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("domains")
    .upsert(payload, { onConflict: "site_id,domain" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save domain: ${error?.message ?? "Unknown error"}`);
  }

  return data as DomainRow;
}

export async function getDomainForSite(siteId: string, domain: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("site_id", siteId)
    .eq("domain", domain)
    .single();

  if (error || !data) {
    return null;
  }

  return data as DomainRow;
}

export async function getLatestDomainForSite(siteId: string): Promise<DomainRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as DomainRow;
}

export async function listDomainsForSite(siteId: string): Promise<DomainRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as DomainRow[];
}

export async function updateDomainVerification(input: {
  siteId: string;
  domain: string;
  verified: boolean;
}) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("domains")
    .update({
      status: input.verified ? "active" : "dns_configured",
      vercel_verified: input.verified,
      updated_at: new Date().toISOString(),
    })
    .eq("site_id", input.siteId)
    .eq("domain", input.domain)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update domain status: ${error?.message ?? "Unknown error"}`);
  }

  return data as DomainRow;
}

export async function getPublishedSiteByHost(host: string): Promise<SiteRow | null> {
  const normalizedHost = normalizeHost(host);
  const supabase = getSupabaseAdminClient();
  const rootDomain = getPlatformRootDomain();

  const { data: customDomainRecord } = await supabase
    .from("domains")
    .select("site_id,status")
    .eq("domain", normalizedHost)
    .in("status", ["active", "verified"])
    .maybeSingle();

  if (customDomainRecord?.site_id) {
    const { data: customDomainSite } = await supabase
      .from("sites")
      .select("*")
      .eq("id", customDomainRecord.site_id)
      .eq("status", "published")
      .maybeSingle();

    if (customDomainSite) {
      return customDomainSite as SiteRow;
    }
  }

  if (
    normalizedHost.endsWith(`.${rootDomain}`) &&
    normalizedHost !== rootDomain &&
    normalizedHost !== `www.${rootDomain}`
  ) {
    const { data: subdomainSite } = await supabase
      .from("sites")
      .select("*")
      .eq("subdomain", normalizedHost)
      .eq("status", "published")
      .maybeSingle();

    if (subdomainSite) {
      return subdomainSite as SiteRow;
    }
  }

  return null;
}
