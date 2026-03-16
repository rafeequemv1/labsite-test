export type TemplateId =
  | "clinical-blue"
  | "research-light"
  | "diagnostics-pro"
  | "modern-elegant-lab";

export type SiteRecord = {
  id: string;
  ownerId: string;
  templateId: TemplateId;
  labName: string;
  contactEmail: string;
  headline: string;
  description: string;
  status: "draft" | "published";
  subdomain: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DnsRecord = {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
};

export type DomainRecord = {
  siteId: string;
  domain: string;
  status: "pending_input" | "dns_configured" | "verified" | "active" | "failed";
  records: DnsRecord[];
  vercelVerified: boolean;
  createdAt: string;
  updatedAt: string;
};
