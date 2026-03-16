import { NextResponse } from "next/server";

import { getSiteForUser, publishSiteForUser, reserveWildcardForSite } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";

type Params = {
  params: Promise<{ siteId: string }>;
};

type PublishBody = {
  wildcardHostname?: string;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId } = await params;
    const body = (await request.json().catch(() => ({}))) as PublishBody;

    const site = await getSiteForUser(siteId, user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    let assignedSubdomain = site.subdomain ?? undefined;
    const wildcardHostname = body.wildcardHostname?.trim().toLowerCase();

    if (wildcardHostname) {
      const wildcard = await reserveWildcardForSite({
        hostname: wildcardHostname,
        siteId,
        userId: user.id,
      });
      assignedSubdomain = wildcard.hostname;
    }

    const updated = await publishSiteForUser(siteId, user.id, {
      subdomain: assignedSubdomain,
    });

    return NextResponse.json({
      site: updated,
      deployment: {
        deploymentId: `dep_${crypto.randomUUID()}`,
        previewUrl: updated.subdomain ? `https://${updated.subdomain}` : null,
        provider: "mock",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to publish site";
    const status = message.startsWith("Unauthorized")
      ? 401
      : message.startsWith("Wildcard unavailable")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
