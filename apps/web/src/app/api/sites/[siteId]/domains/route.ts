import { NextResponse } from "next/server";

import { getSiteForUser, upsertDomainForSite } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";
import { addDomainToVercel } from "@/lib/vercel";

type Params = {
  params: Promise<{ siteId: string }>;
};

type AddDomainBody = {
  domain?: string;
};

function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
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
