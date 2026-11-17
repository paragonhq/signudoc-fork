import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireVerifiedSenderSession } from "@/lib/auth/route-session";
import { getDb } from "@/lib/db/connection";
import { logRouteError } from "@/lib/security/logging";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import {
  deleteTemplateWithThumbnail,
  renameTemplate,
  TemplateError,
} from "@/lib/templates";

type TemplateRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(request: Request, context: TemplateRouteContext) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const { id } = await context.params;

  try {
    await deleteTemplateWithThumbnail(session.user.id, id, {
      database: getDb(),
    });

    return NextResponse.json({ deletedTemplateId: id }, { status: 200 });
  } catch (error) {
    if (error instanceof TemplateError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "template_delete_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while deleting a template.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to delete this template." },
      { status: 500 },
    );
  }
}

// Renames a template. Only its owner can, as with every template route.
export async function PATCH(request: Request, context: TemplateRouteContext) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as unknown;

  try {
    const template = await renameTemplate(session.user.id, id, body, getDb());

    return NextResponse.json(template, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Give the template a name." },
        { status: 400 },
      );
    }

    if (error instanceof TemplateError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "template_rename_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while renaming a template.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to rename this template." },
      { status: 500 },
    );
  }
}
