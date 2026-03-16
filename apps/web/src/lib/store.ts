import { DomainRecord, SiteRecord } from "./types";

type DataStore = {
  sites: Map<string, SiteRecord>;
  domains: Map<string, DomainRecord>;
};

declare global {
  // Keep a singleton store in dev so data survives hot reloads.
  var __labPublisherStore: DataStore | undefined;
}

function getStore(): DataStore {
  if (!globalThis.__labPublisherStore) {
    globalThis.__labPublisherStore = {
      sites: new Map<string, SiteRecord>(),
      domains: new Map<string, DomainRecord>(),
    };
  }

  return globalThis.__labPublisherStore;
}

export function upsertSite(record: SiteRecord): SiteRecord {
  const store = getStore();
  store.sites.set(record.id, record);
  return record;
}

export function getSite(siteId: string): SiteRecord | null {
  const store = getStore();
  return store.sites.get(siteId) ?? null;
}

export function upsertDomain(record: DomainRecord): DomainRecord {
  const store = getStore();
  const key = `${record.siteId}:${record.domain}`;
  store.domains.set(key, record);
  return record;
}

export function getDomain(siteId: string, domain: string): DomainRecord | null {
  const store = getStore();
  const key = `${siteId}:${domain}`;
  return store.domains.get(key) ?? null;
}
