import { NextResponse } from "next/server";

import { requireVerifiedSenderSession } from "@/lib/auth/route-session";
import { getDb } from "@/lib/db/connection";
import { logRouteError } from "@/lib/security/logging";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import { buildContentDisposition } from "@/lib/services/storage";
import { getTemplateDocumentForUser, TemplateError } from "@/lib/templates";

type TemplateDocumentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const privateNoStore = { "cache-control": "private, no-store" };

// A template's PDF, for drawing its pages in the browser (the library's
// pictures, the template page, the "use" preview). Like an envelope's
// draft document: only a verified sender who owns the template can read
// it, a stranger gets the same 404 as a template that does not exist, and
// nothing is cached anywhere but in this response.
export async function GET(
  request: Request,
  context: TemplateDocumentRouteContext,
) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const { id } = await context.params;

  try {
    const document = await getTemplateDocumentForUser(session.user.id, id, {
      database: getDb(),
    });
    const responseBody = document.body.slice().buffer as ArrayBuffer;

    return new Response(responseBody, {
      headers: {
        ...privateNoStore,
        "content-disposition": buildContentDisposition(
          document.fileName,
          "inline",
        ),
        "content-length": String(document.contentLength),
        // Stored only after it was checked as a PDF, and served as nothing
        // else.
        "content-security-policy": "default-src 'none'; sandbox",
        "content-type": "application/pdf",
        "x-content-type-options": "nosniff",
      },
      status: 200,
    });
  } catch (error) {
    if (error instanceof TemplateError) {
      return NextResponse.json(
        { error: error.message },
        { headers: privateNoStore, status: error.statusCode },
      );
    }

    logRouteError(error, {
      category: "template_document_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while loading a template document.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to load this template's document." },
      { headers: privateNoStore, status: 500 },
    );
  }
}
