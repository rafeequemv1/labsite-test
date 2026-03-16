import { NextRequest, NextResponse } from "next/server";

import {
  getPlatformRootDomain,
  getPreviewPrefix,
  normalizeIncomingHost,
  shouldRouteToTenant,
} from "@/lib/platform";

function isBypassedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/site") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/llms.txt") ||
    pathname.startsWith("/.well-known")
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get("host");
  if (!hostHeader) {
    return NextResponse.next();
  }

  const host = normalizeIncomingHost(hostHeader);
  const previewPrefix = getPreviewPrefix(host);
  if (previewPrefix) {
    const previewTenantHost = `${previewPrefix}.${getPlatformRootDomain()}`;
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/site/${previewTenantHost}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  if (!shouldRouteToTenant(host)) {
    return NextResponse.next();
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/site/${host}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
