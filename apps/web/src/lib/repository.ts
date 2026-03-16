import { DnsRecord } from "./types";
import { getSupabaseAdminClient } from "./supabase-server";

type SiteRow = {
  id: string;
  user_id: string;
  template_id: string;
  lab_name: string;
  contact_email: string;
  headline: string;
  description: string;
  status: "draft" | "published";
  subdomain: string | null;
  created_at: string;
  updated_at: string;
};

type DomainRow = {
  site_id: string;
  domain: string;
  status: "pending_input" | "dns_configured" | "verified" | "active" | "failed";
  records: DnsRecord[];
  vercel_verified: boolean;
  created_at: string;
  updated_at: string;
};

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createSiteForUser(input: {
  userId: string;
  templateId: string;
  labName: string;
  contactEmail: string;
  headline: string;
  description: string;
}) {
  const now = new Date().toISOString();
  const subdomainSlug = slugify(input.labName);
  const supabase = getSupabaseAdminClient();

  const payload = {
    user_id: input.userId,
    template_id: input.templateId,
    lab_name: input.labName,
    contact_email: input.contactEmail,
    headline: input.headline,
    description: input.description,
    status: "draft" as const,
    subdomain: subdomainSlug ? `${subdomainSlug}.labsites.app` : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from("sites").insert(payload).select("*").single();

  if (error || !data) {
    throw new Error(`Failed to create site: ${error?.message ?? "Unknown error"}`);
  }

  return data as SiteRow;
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

export async function publishSiteForUser(siteId: string, userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sites")
    .update({
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", siteId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to publish site: ${error?.message ?? "Unknown error"}`);
  }

  return data as SiteRow;
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
