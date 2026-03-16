import { NextResponse } from "next/server";

import { deleteDomainForSite, getSiteForUser, upsertDomainForSite } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";
import { addDomainToVercel, removeDomainFromVercel } from "@/lib/vercel";

type Params = {
  params: Promise<{ siteId: string; domain: string }>;
};

type PatchBody = {
  newDomain?: string;
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

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId, domain } = await params;
    const site = await getSiteForUser(siteId, user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    await removeDomainFromVercel(domain);
    await deleteDomainForSite(siteId, domain);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete domain";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId, domain } = await params;
    const site = await getSiteForUser(siteId, user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const body = (await request.json()) as PatchBody;
    if (!body.newDomain) {
      return NextResponse.json({ error: "newDomain is required" }, { status: 400 });
    }

    const nextDomain = normalizeDomain(body.newDomain);
    await removeDomainFromVercel(domain);
    await deleteDomainForSite(siteId, domain);

    const vercelResult = await addDomainToVercel(nextDomain);
    const updated = await upsertDomainForSite({
      siteId,
      domain: nextDomain,
      status: vercelResult.verified ? "verified" : "dns_configured",
      records: vercelResult.records,
      vercelVerified: vercelResult.verified,
    });

    return NextResponse.json({
      domain: updated,
      provider: vercelResult.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to edit domain";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
