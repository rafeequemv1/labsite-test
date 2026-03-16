import { NextResponse } from "next/server";

import { checkWildcardAvailability, listWildcards } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    await getRequestUser(request);
    const { searchParams } = new URL(request.url);
    const hostname = searchParams.get("hostname")?.trim().toLowerCase();
    const siteId = searchParams.get("siteId")?.trim();

    if (hostname) {
      const availability = await checkWildcardAvailability(hostname, siteId || undefined);
      return NextResponse.json({
        hostname,
        available: availability.available,
      });
    }

    const wildcards = await listWildcards();
    return NextResponse.json({ wildcards });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch wildcards";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
