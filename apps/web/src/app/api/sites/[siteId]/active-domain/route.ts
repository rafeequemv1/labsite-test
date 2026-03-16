import { NextResponse } from "next/server";

import {
  getSiteForUser,
  listDomainsForSite,
  setActiveDomainForSite,
} from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";

type Params = {
  params: Promise<{ siteId: string }>;
};

type Body = {
  activeDomain?: string | null;
};

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

export async function PUT(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId } = await params;
    const site = await getSiteForUser(siteId, user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const body = (await request.json()) as Body;
    const candidate = typeof body.activeDomain === "string" ? normalizeDomain(body.activeDomain) : null;

    if (!candidate) {
      const updated = await setActiveDomainForSite({
        siteId,
        userId: user.id,
        activeDomain: null,
      });
      return NextResponse.json({ site: updated });
    }

    const customDomains = await listDomainsForSite(siteId);
    const allowed = new Set(customDomains.map((item) => item.domain));
    if (site.subdomain) {
      allowed.add(site.subdomain);
    }

    if (!allowed.has(candidate)) {
      return NextResponse.json(
        { error: "Active domain must be this site's wildcard or custom domain" },
        { status: 400 },
      );
    }

    const updated = await setActiveDomainForSite({
      siteId,
      userId: user.id,
      activeDomain: candidate,
    });

    return NextResponse.json({ site: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to set active domain";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
