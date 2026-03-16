import { NextResponse } from "next/server";

import {
  deleteSiteForUser,
  getSiteForUser,
  listDomainsForSite,
} from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";
import { removeDomainFromVercel } from "@/lib/vercel";

type Params = {
  params: Promise<{ siteId: string }>;
};

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId } = await params;
    const site = await getSiteForUser(siteId, user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const domains = await listDomainsForSite(siteId);
    await Promise.all(
      domains.map(async (domain) => {
        await removeDomainFromVercel(domain.domain);
      }),
    );

    await deleteSiteForUser(siteId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete site";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
