export type VercelDomainRecord = {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
};

export type DomainSetupResponse = {
  domain: string;
  records: VercelDomainRecord[];
};

export function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
}
