import { NextResponse } from "next/server";

import { listActivityForUser, parseActivityQuery } from "@/lib/activity";
import { requireVerifiedSenderSession } from "@/lib/auth/route-session";
import { getDb } from "@/lib/db/connection";
import { logRouteError } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";

const privateNoStore = { "cache-control": "private, no-store" };

// The Activity page's feed: what happened on the caller's own envelopes
// (sent, viewed, signed, declined, completed, voided, expired, reminders),
// newest first, a page at a time (?cursor=) or only what is new (?since=).
// Scoped by the envelope's owner in the query itself, so another account's
// events can never be listed. The page asks again every half minute while
// it is open, so it has its own allowance.
export async function GET(request: Request) {
  const sessionResult = await requireVerifiedSenderSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const rateLimitResponse = await applyRateLimit({
    category: "activity_read",
    key: buildRateLimitKey(["activity", session.user.id]),
    limit: 120,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    rateLimitResponse.headers.set("cache-control", "private, no-store");
    return rateLimitResponse;
  }

  const parsed = parseActivityQuery(new URL(request.url).searchParams);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { headers: privateNoStore, status: 400 },
    );
  }

  try {
    const page = await listActivityForUser(
      session.user.id,
      parsed.query,
      getDb(),
    );

    return NextResponse.json(page, { headers: privateNoStore });
  } catch (error) {
    logRouteError(error, {
      category: "activity_read_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while loading activity.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to load activity." },
      { headers: privateNoStore, status: 500 },
    );
  }
}
