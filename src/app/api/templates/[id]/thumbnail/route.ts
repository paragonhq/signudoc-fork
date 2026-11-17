import { NextResponse } from "next/server";

import { requireVerifiedSenderSession } from "@/lib/auth/route-session";
import { getDb } from "@/lib/db/connection";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import {
  THUMBNAIL_CONTENT_TYPE,
  THUMBNAIL_MAX_BYTES,
  ThumbnailValidationError,
} from "@/lib/services/thumbnails";
import {
  getTemplateThumbnailForUser,
  saveTemplateThumbnailForUser,
  TemplateError,
} from "@/lib/templates";
import { readLimitedBody } from "@/lib/utils/limited-body";

type TemplateThumbnailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const privateNoStore = { "cache-control": "private, no-store" };
// As for envelopes: the browser may keep its copy but asks here before
// showing it again, so every showing takes a signed-in request from the
// owner, and a copy that is still good costs no read from file storage.
const privateRevalidate = { "cache-control": "private, no-cache" };

// The picture of a template's first page in the library. Same rules as the
// envelope thumbnail: only the owning account reads or writes it.
export async function GET(
  request: Request,
  context: TemplateThumbnailRouteContext,
) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const { id } = await context.params;

  try {
    const thumbnail = await getTemplateThumbnailForUser(session.user.id, id, {
      database: getDb(),
      ifNoneMatch: request.headers.get("if-none-match"),
    });

    if (thumbnail.isNotModified) {
      return new Response(null, {
        headers: { ...privateRevalidate, etag: thumbnail.etag },
        status: 304,
      });
    }

    const { picture } = thumbnail;
    const headers = new Headers({
      ...privateRevalidate,
      "content-disposition": "inline",
      "content-security-policy": "default-src 'none'; sandbox",
      "content-type": THUMBNAIL_CONTENT_TYPE,
      etag: thumbnail.etag,
      "x-content-type-options": "nosniff",
    });

    if (typeof picture.contentLength === "number") {
      headers.set("content-length", String(picture.contentLength));
    }

    return new Response(picture.stream, { headers, status: 200 });
  } catch (error) {
    if (error instanceof TemplateError) {
      return NextResponse.json(
        { error: error.message },
        { headers: privateNoStore, status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "template_thumbnail_read_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while loading a template thumbnail.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to load this thumbnail." },
      { headers: privateNoStore, status: 500 },
    );
  }
}

// The owner's browser draws the first page and sends it here, once.
export async function PUT(
  request: Request,
  context: TemplateThumbnailRouteContext,
) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  // One allowance with envelope pictures: both are drawn by the same
  // browser for the same reason.
  const rateLimitResponse = await applyRateLimit({
    category: "template_thumbnail_write",
    key: buildRateLimitKey(["template-thumbnail", session.user.id]),
    limit: 120,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(declaredLength) && declaredLength > THUMBNAIL_MAX_BYTES) {
    return NextResponse.json(
      { error: "The thumbnail is too large." },
      { status: 413 },
    );
  }

  const { id } = await context.params;

  try {
    const body = await readLimitedBody(request, THUMBNAIL_MAX_BYTES);

    if (!body) {
      return NextResponse.json(
        { error: "The thumbnail is too large." },
        { status: 413 },
      );
    }

    await saveTemplateThumbnailForUser(session.user.id, id, body, {
      database: getDb(),
    });

    return new Response(null, { headers: privateNoStore, status: 204 });
  } catch (error) {
    if (error instanceof ThumbnailValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof TemplateError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "template_thumbnail_write_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while saving a template thumbnail.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to save this thumbnail." },
      { status: 500 },
    );
  }
}
