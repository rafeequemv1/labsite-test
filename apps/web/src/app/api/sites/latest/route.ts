import { NextResponse } from "next/server";

import { getLatestDomainForSite, getLatestSiteForUser } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const site = await getLatestSiteForUser(user.id);

    if (!site) {
      return NextResponse.json({ site: null, domain: null });
    }

    const domain = await getLatestDomainForSite(site.id);
    return NextResponse.json({ site, domain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch latest site";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
