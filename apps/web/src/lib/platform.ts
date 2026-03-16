function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

export function getPlatformRootDomain(): string {
  return (
    process.env.PLATFORM_ROOT_DOMAIN ??
    process.env.NEXT_PUBLIC_PLATFORM_ROOT_DOMAIN ??
    "labsites.app"
  ).toLowerCase();
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
