import { NextResponse } from "next/server";

import { createSiteForUser } from "@/lib/repository";
import { getRequestUser } from "@/lib/supabase-server";
import { TemplateId } from "@/lib/types";

type CreateSiteBody = {
  templateId?: TemplateId;
  labName?: string;
  contactEmail?: string;
  headline?: string;
  description?: string;
};

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

    const site = await createSiteForUser({
      userId: user.id,
      templateId: body.templateId,
      labName: body.labName,
      contactEmail: body.contactEmail,
      headline: body.headline ?? "",
      description: body.description ?? "",
    });

    return NextResponse.json({ site });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create site";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
