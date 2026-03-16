import { DnsRecord } from "./types";

type VercelVerificationRecord = {
  type?: string;
  domain?: string;
  value?: string;
};

type VercelDomainCreateResponse = {
  verified?: boolean;
  verification?: VercelVerificationRecord[];
};

type VercelDomainStatusResponse = {
  verified?: boolean;
};

type VercelDomainResult = {
  verified: boolean;
  records: DnsRecord[];
  provider: "vercel" | "mock";
};

function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getMockRecords(): DnsRecord[] {
  return [
    { type: "A", name: "@", value: "76.76.21.21" },
    { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
  ];
}

function getRoutingRecords(): DnsRecord[] {
  return getMockRecords();
}

function parseVerificationRecords(records: VercelVerificationRecord[] | undefined): DnsRecord[] {
  return (records ?? [])
    .map((item) => {
      const rawType = (item.type ?? "").toUpperCase();
      const type = rawType === "TXT" ? "TXT" : rawType === "A" ? "A" : "CNAME";
      const name = (item.domain ?? "@").trim() || "@";
      const value = (item.value ?? "").trim();

      if (!value) {
        return null;
      }

      return { type, name, value } as DnsRecord;
    })
    .filter((item): item is DnsRecord => item !== null);
}

function mergeRecords(...sets: DnsRecord[][]): DnsRecord[] {
  const deduped = new Map<string, DnsRecord>();

  for (const set of sets) {
    for (const record of set) {
      const key = `${record.type}:${record.name}:${record.value}`;
      deduped.set(key, record);
    }
  }

  return [...deduped.values()];
}

function getVercelConfig() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return null;
  }

  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const baseUrl = `https://api.vercel.com/v9/projects/${projectId}/domains`;

  return { token, baseUrl, query };
}

export async function addDomainToVercel(domainInput: string): Promise<VercelDomainResult> {
  const domain = normalizeDomain(domainInput);
  const config = getVercelConfig();

  if (!config) {
    return { verified: false, records: getMockRecords(), provider: "mock" };
  }

  const response = await fetch(`${config.baseUrl}${config.query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Vercel add-domain failed (${response.status}): ${details}`);
  }

  const data = (await response.json()) as VercelDomainCreateResponse;
  const verificationRecords = parseVerificationRecords(data.verification);
  const routingRecords = getRoutingRecords();

  return {
    verified: Boolean(data.verified),
    records: mergeRecords(verificationRecords, routingRecords),
    provider: "vercel",
  };
}

export async function checkDomainVerification(
  domainInput: string,
): Promise<{ verified: boolean; provider: "vercel" | "mock" }> {
  const domain = normalizeDomain(domainInput);
  const config = getVercelConfig();

  if (!config) {
    return { verified: true, provider: "mock" };
  }

  const response = await fetch(
    `${config.baseUrl}/${encodeURIComponent(domain)}${config.query}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Vercel verify-domain failed (${response.status}): ${details}`);
  }

  const data = (await response.json()) as VercelDomainStatusResponse;
  return { verified: Boolean(data.verified), provider: "vercel" };
}

export async function removeDomainFromVercel(domainInput: string): Promise<{
  provider: "vercel" | "mock";
}> {
  const domain = normalizeDomain(domainInput);
  const config = getVercelConfig();

  if (!config) {
    return { provider: "mock" };
  }

  const response = await fetch(
    `${config.baseUrl}/${encodeURIComponent(domain)}${config.query}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    },
  );

  // Deleting a missing domain should not hard-fail UX.
  if (!response.ok && response.status !== 404) {
    const details = await response.text();
    throw new Error(`Vercel remove-domain failed (${response.status}): ${details}`);
  }

  return { provider: "vercel" };
}
