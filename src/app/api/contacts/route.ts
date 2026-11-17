import { NextResponse } from "next/server";

import { requireVerifiedSenderSession } from "@/lib/auth/route-session";
import {
  listContactsForUser,
  normalizeContactLimit,
  normalizeContactSearch,
} from "@/lib/contacts";
import { getDb } from "@/lib/db/connection";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";

const privateNoStore = { "cache-control": "private, no-store" };

// The caller's own address book: people they have put on one of their own
// envelopes (signers and copy recipients), found by part of a name or an
// address. Only envelopes this account owns are read, so nobody learns who
// anyone else sends to. The signers step asks as someone types, so the
// allowance is generous but bounded.
export async function GET(request: Request) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const rateLimitResponse = await applyRateLimit({
    category: "contacts_read",
    key: buildRateLimitKey(["contacts", session.user.id]),
    limit: 300,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const url = new URL(request.url);

  try {
    const contacts = await listContactsForUser(
      session.user.id,
      {
        limit: normalizeContactLimit(url.searchParams.get("limit") ?? ""),
        search: normalizeContactSearch(url.searchParams.get("search") ?? ""),
      },
      getDb(),
    );

    return NextResponse.json({ contacts }, { headers: privateNoStore });
  } catch (error) {
    logRouteError(error, {
      category: "contacts_read_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while loading contacts.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to load contacts." },
      { headers: privateNoStore, status: 500 },
    );
  }
}
