function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

const DEFAULT_PLATFORM_ROOT_DOMAIN = "labsites.app";

function normalizeDomainInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*/, "")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^-+|-+$/g, "")
    .replace(/^\.+|\.+$/g, "");
}

function isValidRootDomain(domain: string): boolean {
  if (!domain || domain.length < 3) {
    return false;
  }

  if (!domain.includes(".")) {
    return false;
  }

  // Simple safety check for hostname shape.
  return /^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(domain);
}

function resolveRootDomain(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeDomainInput(candidate);
    if (isValidRootDomain(normalized)) {
      return normalized;
    }
  }

  return DEFAULT_PLATFORM_ROOT_DOMAIN;
}

export function getPlatformRootDomain(): string {
  return resolveRootDomain(
    process.env.PLATFORM_ROOT_DOMAIN ??
      process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN,
  );
}

export function getClientPlatformRootDomain(): string {
  return resolveRootDomain(process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN);
}

export function isBaseAppHost(host: string): boolean {
  const cleanHost = normalizeHost(host);
  const root = getPlatformRootDomain();

  if (
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1" ||
    cleanHost === "::1"
  ) {
    return true;
  }

  if (cleanHost.endsWith(".vercel.app")) {
    return true;
  }

  return cleanHost === root || cleanHost === `www.${root}`;
}

export function shouldRouteToTenant(host: string): boolean {
  return !isBaseAppHost(host);
}

export function normalizeIncomingHost(host: string): string {
  return normalizeHost(host);
}

export function getPreviewPrefix(host: string): string | null {
  const cleanHost = normalizeHost(host);
  if (!cleanHost.includes("---")) {
    return null;
  }

  const [prefix] = cleanHost.split("---");
  if (!prefix) {
    return null;
  }

  return prefix.replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "") || null;
}
