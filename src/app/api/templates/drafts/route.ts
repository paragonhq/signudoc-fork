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
  startTemplateDraft,
  TEMPLATE_DRAFT_COOKIE,
  TemplateError,
} from "@/lib/templates";

// Starts a template from scratch. The browser has already uploaded the PDF
// as an ordinary draft (POST /api/envelopes, with all of that route's
// checks); this names the roles on it as stand-in signers, so the builder
// can place their fields. The draft must be the caller's own and still
// empty of real signers (startTemplateDraft checks both).
//
// A short-lived cookie remembers which draft this browser is turning into a
// template, so the workspace can bring the person to "Save template" when
// the builder is done. The id in it is checked against the owner again on
// every use, so a forged value shows nothing that isn't already theirs.

export async function POST(request: Request) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const rateLimitResponse = await applyRateLimit({
    category: "template_draft_start",
    key: buildRateLimitKey(["template-draft", session.user.id]),
    limit: 20,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body = (await request.json().catch(() => null)) as {
    envelopeId?: unknown;
    roleNames?: unknown;
  } | null;
  const envelopeId =
    typeof body?.envelopeId === "string" ? body.envelopeId : "";

  if (!envelopeId) {
    return NextResponse.json(
      { error: "Upload the document first." },
      { status: 400 },
    );
  }

  try {
    const draft = await startTemplateDraft(
      session.user.id,
      envelopeId,
      { roleNames: body?.roleNames },
      getDb(),
    );
    const response = NextResponse.json(
      {
        envelopeId: draft.envelopeId,
        redirectPath: `/templates/new/${encodeURIComponent(draft.envelopeId)}/fields`,
      },
      { status: 201 },
    );

    response.cookies.set(TEMPLATE_DRAFT_COOKIE, draft.envelopeId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
    });

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Name each signer." },
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

    logRouteError(error, {
      category: "template_draft_start_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while starting a template from scratch.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to start this template." },
      { status: 500 },
    );
  }
}
