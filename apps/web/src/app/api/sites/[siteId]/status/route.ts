import { NextResponse } from "next/server";

import { getDomainForSite, getSiteForUser } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";

type Params = {
  params: Promise<{ siteId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId } = await params;
    const site = await getSiteForUser(siteId, user.id);

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const domainQuery = url.searchParams.get("domain");
    const domain = domainQuery ? await getDomainForSite(siteId, domainQuery) : null;

    return NextResponse.json({
      site,
      domain,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch status";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
