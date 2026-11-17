import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/admin";
import { buildBranding } from "@/lib/branding";
import { logRouteError, logSecurityEvent } from "@/lib/security/logging";
import {
  applyRateLimit,
  buildRateLimitKey,
} from "@/lib/security/route-controls";
import { getClientIpAddress, getRequestPathname } from "@/lib/security/request";
import {
  EMAIL_NOT_CONNECTED_MESSAGE,
  isEmailNotConnectedError,
} from "@/lib/services/email";
import { getSettings, toSignupPolicy } from "@/lib/settings";
import {
  invitationRequestSchema,
  inviteeSignupProblem,
  MAX_INVITATIONS_PER_REQUEST,
  sendTeamInvitations,
} from "@/lib/team-invitations";

// Invitations to join this install, sent from setup's "Invite your team"
// step. Administrators only, and rate-limited like the other admin routes.
// Nothing is stored: the email links to the sign-up page, where the
// install's sign-up rule still decides who may create an account.

export async function POST(request: Request) {
  const sessionResult = await requireAdminSession(request);

  if (sessionResult instanceof Response) {
    return sessionResult;
  }

  const session = sessionResult;
  const rateLimitResponse = await applyRateLimit({
    category: "team_invitations",
    key: buildRateLimitKey(["team-invitations", session.user.id]),
    limit: 10,
    request,
    userId: session.user.id,
    windowMs: 10 * 60 * 1000,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = invitationRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Enter between 1 and ${String(MAX_INVITATIONS_PER_REQUEST)} valid email addresses.`,
      },
      { status: 400 },
    );
  }

  try {
    const settings = await getSettings();
    const policy = toSignupPolicy(settings);
    // An invitation nobody could accept helps no one: say who, and send
    // nothing, so the rule can be changed first.
    const notAllowed = parsed.data.emails.filter(
      (email) => inviteeSignupProblem(email, policy) !== null,
    );

    if (notAllowed.length > 0) {
      return NextResponse.json(
        {
          error:
            "Some of these people could not create an account under the current sign-up rule.",
          notAllowed,
        },
        { status: 400 },
      );
    }

    const outcome = await sendTeamInvitations({
      branding: buildBranding(settings),
      emails: parsed.data.emails,
      inviter: { email: session.user.email, name: session.user.name },
    });

    if (outcome.sent.length > 0) {
      logSecurityEvent("info", {
        category: "team_invitations_sent",
        ipAddress: getClientIpAddress(request.headers),
        message: `Sent ${String(outcome.sent.length)} invitation(s) to join.`,
        path: getRequestPathname(request),
        userId: session.user.id,
      });
    }

    return NextResponse.json(outcome, {
      status:
        outcome.sent.length === 0 && outcome.failed.length > 0 ? 502 : 200,
    });
  } catch (error) {
    if (isEmailNotConnectedError(error)) {
      return NextResponse.json(
        { error: EMAIL_NOT_CONNECTED_MESSAGE },
        { status: 409 },
      );
    }

    logRouteError(error, {
      category: "team_invitations_failure",
      ipAddress: getClientIpAddress(request.headers),
      message: "Unexpected failure while sending invitations.",
      path: getRequestPathname(request),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "The invitations could not be sent. Please try again." },
      { status: 500 },
    );
  }
}
