import { NextResponse } from "next/server";

import { requireVerifiedSenderSession } from "@/lib/auth/route-session";
import { getDb } from "@/lib/db/connection";
import { listEnvelopesForUser } from "@/lib/envelopes";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import { isRoleStandInEmail, listTemplatesForUser } from "@/lib/templates";

const privateNoStore = { "cache-control": "private, no-store" };
const COMMAND_DOCUMENT_LIMIT = 100;

// What the command menu (⌘K) can jump to: the caller's own most recent
// documents (title, status and signer emails, so the menu can match on
// either) and their templates. The same rows the Documents and Templates
// pages already show this account, nothing more. Fetched when the menu
// opens, so it has its own small allowance.
export async function GET(request: Request) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const rateLimitResponse = await applyRateLimit({
    category: "command_menu_read",
    key: buildRateLimitKey(["command-menu", session.user.id]),
    limit: 120,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const database = getDb();
    const [envelopePage, templates] = await Promise.all([
      listEnvelopesForUser(
        session.user.id,
        { limit: COMMAND_DOCUMENT_LIMIT },
        database,
      ),
      listTemplatesForUser(session.user.id, database),
    ]);

    return NextResponse.json(
      {
        documents: envelopePage.envelopes.map((envelope) => {
          // A template being made from scratch: its signers are role
          // stand-ins, and it opens where the template is finished.
          const isTemplateDraft =
            envelope.status === "draft" &&
            envelope.searchableEmails.length > 0 &&
            envelope.searchableEmails.every(isRoleStandInEmail);

          return {
            emails: isTemplateDraft ? [] : envelope.searchableEmails,
            href: isTemplateDraft
              ? `/templates/new/${encodeURIComponent(envelope.id)}`
              : `/envelopes/${encodeURIComponent(envelope.id)}`,
            id: envelope.id,
            status: isTemplateDraft
              ? "template-draft"
              : envelope.expired
                ? "expired"
                : envelope.status,
            statusLabel: isTemplateDraft
              ? "Template draft"
              : envelope.statusLabel,
            title: envelope.title,
          };
        }),
        templates: templates.map((template) => ({
          id: template.id,
          name: template.name,
          roleNames: template.roleNames,
        })),
      },
      { headers: privateNoStore },
    );
  } catch (error) {
    logRouteError(error, {
      category: "command_menu_read_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while loading the command menu.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to load search." },
      { headers: privateNoStore, status: 500 },
    );
  }
}
