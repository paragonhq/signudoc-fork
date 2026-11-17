import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireVerifiedSenderSession } from "@/lib/auth/route-session";
import { getDb } from "@/lib/db/connection";
import { EnvelopeMutationError } from "@/lib/envelopes";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import {
  discardTemplateDraft,
  saveTemplateFromDraft,
  TEMPLATE_DRAFT_COOKIE,
  TemplateError,
} from "@/lib/templates";

type TemplateDraftRouteContext = {
  params: Promise<{
    envelopeId: string;
  }>;
};

function clearDraftCookie(response: NextResponse) {
  response.cookies.set(TEMPLATE_DRAFT_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Give the template a name." },
      { status: 400 },
    );
  }

  if (
    error instanceof TemplateError ||
    error instanceof EnvelopeMutationError
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }

  return null;
}

// Saves a scratch draft as a template and removes the draft. Only the
// owner's own scratch drafts qualify (saveTemplateFromDraft looks the draft
// up by owner and requires its signers to be role stand-ins), and saving
// shares the allowance of "Save as template".
export async function POST(
  request: Request,
  context: TemplateDraftRouteContext,
) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const rateLimitResponse = await applyRateLimit({
    category: "template_save",
    key: buildRateLimitKey(["template-save", session.user.id]),
    limit: 20,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { envelopeId } = await context.params;
  const body = (await request.json().catch(() => null)) as unknown;

  try {
    const template = await saveTemplateFromDraft(
      session.user.id,
      envelopeId,
      body,
      { database: getDb() },
    );

    return clearDraftCookie(
      NextResponse.json(
        {
          name: template.name,
          redirectPath: `/templates/${encodeURIComponent(template.id)}`,
          templateId: template.id,
        },
        { status: 201 },
      ),
    );
  } catch (error) {
    const known = errorResponse(error);

    if (known) {
      return known;
    }

    logRouteError(error, {
      category: "template_draft_save_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while saving a template from scratch.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to save this template." },
      { status: 500 },
    );
  }
}

// Throws the scratch draft away. Same ownership rule as saving.
export async function DELETE(
  request: Request,
  context: TemplateDraftRouteContext,
) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const { envelopeId } = await context.params;

  try {
    await discardTemplateDraft(session.user.id, envelopeId, {
      database: getDb(),
    });

    return clearDraftCookie(
      NextResponse.json({ discarded: envelopeId }, { status: 200 }),
    );
  } catch (error) {
    if (error instanceof TemplateError && error.statusCode === 404) {
      // Already gone: forget it here too.
      return clearDraftCookie(
        NextResponse.json({ discarded: envelopeId }, { status: 200 }),
      );
    }

    const known = errorResponse(error);

    if (known) {
      return known;
    }

    logRouteError(error, {
      category: "template_draft_discard_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while discarding a template draft.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to discard this draft." },
      { status: 500 },
    );
  }
}
