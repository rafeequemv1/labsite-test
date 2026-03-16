import { NextResponse } from "next/server";

import {
  getSiteForUser,
  listDomainsForSite,
  setActiveDomainForSite,
  upsertDomainForSite,
} from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";
import { addDomainToVercel } from "@/lib/vercel";

type Params = {
  params: Promise<{ siteId: string }>;
};

type AddDomainBody = {
  domain?: string;
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

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId } = await params;
    const site = await getSiteForUser(siteId, user.id);

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const body = (await request.json()) as AddDomainBody;
    if (!body.domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const domain = normalizeDomain(body.domain);
    const vercelResult = await addDomainToVercel(domain);

    const record = await upsertDomainForSite({
      siteId,
      domain,
      status: vercelResult.verified ? "verified" : "dns_configured",
      records: vercelResult.records,
      vercelVerified: vercelResult.verified,
    });

    if (!site.active_domain) {
      await setActiveDomainForSite({
        siteId,
        userId: user.id,
        activeDomain: domain,
      });
    }

    return NextResponse.json({
      domain: record,
      provider: vercelResult.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add domain to Vercel";
    const status =
      message.startsWith("Unauthorized") ? 401 : message.includes("Failed to save") ? 500 : 502;

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId } = await params;
    const site = await getSiteForUser(siteId, user.id);

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const domains = await listDomainsForSite(siteId);
    return NextResponse.json({ domains });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load domains";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
