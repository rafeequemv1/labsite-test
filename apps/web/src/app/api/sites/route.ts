import { NextResponse } from "next/server";

import {
  createSiteForUser,
  listSitesForUser,
  upsertUserProfile,
} from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";
import { TemplateId } from "@/lib/types";

type CreateSiteBody = {
  templateId?: TemplateId;
  labName?: string;
  contactEmail?: string;
  headline?: string;
  description?: string;
  templateData?: Record<string, unknown>;
};

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    const sites = await listSitesForUser(user.id);
    return NextResponse.json({ sites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch sites";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const body = (await request.json()) as CreateSiteBody;

    if (!body.templateId || !body.labName || !body.contactEmail) {
      return NextResponse.json(
        { error: "templateId, labName and contactEmail are required" },
        { status: 400 },
      );
    }

    const ownerName =
      (typeof user.user_metadata?.full_name === "string" &&
        user.user_metadata.full_name.trim()) ||
      user.email?.split("@")[0] ||
      "Lab Owner";

    if (user.email) {
      await upsertUserProfile({
        userId: user.id,
        email: user.email,
        fullName: ownerName,
      });
    }

    const site = await createSiteForUser({
      userId: user.id,
      ownerName,
      templateId: body.templateId,
      labName: body.labName,
      contactEmail: body.contactEmail,
      headline: body.headline ?? "",
      description: body.description ?? "",
      templateData: body.templateData,
    });

    return NextResponse.json({ site });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create site";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
