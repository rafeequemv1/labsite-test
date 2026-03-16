import { NextResponse } from "next/server";

import { getSiteForUser, publishSiteForUser } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";

type Params = {
  params: Promise<{ siteId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await getRequestUser(request);
    const { siteId } = await params;

    const site = await getSiteForUser(siteId, user.id);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const updated = await publishSiteForUser(siteId, user.id);

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
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
