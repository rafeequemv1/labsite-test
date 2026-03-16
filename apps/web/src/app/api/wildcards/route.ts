import { NextResponse } from "next/server";

import { listWildcards } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    await getRequestUser(request);
    const wildcards = await listWildcards();
    return NextResponse.json({ wildcards });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch wildcards";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
