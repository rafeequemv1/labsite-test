import { NextResponse } from "next/server";

import { getDomainForSite, getSiteForUser, updateDomainVerification } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";
import { checkDomainVerification } from "@/lib/vercel";

type Params = {
  params: Promise<{ siteId: string; domain: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId, domain } = await params;
    const site = await getSiteForUser(siteId, user.id);

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const domainRecord = await getDomainForSite(siteId, domain);
    if (!domainRecord) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const verification = await checkDomainVerification(domainRecord.domain);
    const updated = await updateDomainVerification({
      siteId,
      domain: domainRecord.domain,
      verified: verification.verified,
    });

    return NextResponse.json({
      domain: updated,
      provider: verification.provider,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify domain with Vercel";
    const status =
      message.startsWith("Unauthorized") ? 401 : message.includes("Failed to update") ? 500 : 502;

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
