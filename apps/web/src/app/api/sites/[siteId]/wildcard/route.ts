import { NextResponse } from "next/server";

import {
  assignWildcardHostnameForSite,
  getSiteForUser,
  updateSiteSubdomainForUser,
} from "@/lib/repository";
import { getPlatformRootDomain } from "@/lib/platform";
import { getRequestUser } from "@/lib/supabase-server";

type Params = {
  params: Promise<{ siteId: string }>;
};

type Body = {
  hostname?: string;
};

function normalizeWildcardInput(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*/, "");
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
    if (!body.hostname) {
      return NextResponse.json({ error: "hostname is required" }, { status: 400 });
    }

    const root = getPlatformRootDomain();
    let hostname = normalizeWildcardInput(body.hostname);
    if (!hostname.includes(".")) {
      hostname = `${hostname}.${root}`;
    }

    if (!hostname.endsWith(`.${root}`)) {
      return NextResponse.json(
        { error: `Wildcard must end with .${root}` },
        { status: 400 },
      );
    }

    const wildcard = await assignWildcardHostnameForSite({
      hostname,
      siteId,
      userId: user.id,
    });
    const updatedSite = await updateSiteSubdomainForUser({
      siteId,
      userId: user.id,
      subdomain: wildcard.hostname,
    });

    return NextResponse.json({
      wildcard,
      site: updatedSite,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to set wildcard";
    const status = message.startsWith("Unauthorized")
      ? 401
      : message === "Wildcard unavailable"
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
