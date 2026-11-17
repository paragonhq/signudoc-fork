import { notFound, redirect } from "next/navigation";

import {
  ReviewShell,
  type ReviewInvitationPreview,
  type ReviewPreviewField,
} from "@/components/envelopes/review-shell";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import {
  getPrepareEnvelopeDataForUser,
  getReviewEnvelopeDataForUser,
} from "@/lib/envelopes";
import { getBranding } from "@/lib/settings";
import { buildSigningInvitationEmail } from "@/lib/services/signing-invitation-email";
import { ENVELOPE_DEADLINE_DAY_OPTIONS } from "@/lib/types/domain";

type ReviewPageProps = {
  params: Promise<{
    id: string;
  }>;
};

/** Stands in for the signing link, which only exists once it is sent. */
const SIGNING_LINK_PLACEHOLDER = "https://signing-link.invalid/sign";

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  let reviewRecord: Awaited<ReturnType<typeof getReviewEnvelopeDataForUser>> =
    null;
  let fields: ReviewPreviewField[] = [];
  let invitation: ReviewInvitationPreview | null = null;
  let initialState: "error" | undefined;

  try {
    const session = await getAuthSession();
    const database = getDb();

    reviewRecord = session
      ? await getReviewEnvelopeDataForUser(session.user.id, id, database)
      : null;

    if (session && reviewRecord) {
      const prepared = await getPrepareEnvelopeDataForUser(
        session.user.id,
        id,
        { database },
      ).catch(() => null);

      fields = (prepared?.fields ?? []).map((field) => ({
        height: field.height,
        page: field.page,
        signerId: field.signerId,
        type: field.type,
        width: field.width,
        x: field.x,
        y: field.y,
      }));
      invitation = await buildInvitationPreview({
        envelopeTitle: reviewRecord.title,
        senderName:
          typeof session.user.name === "string" && session.user.name.trim()
            ? session.user.name
            : session.user.email,
        signer: reviewRecord.signers[0] ?? null,
      });
    }
  } catch {
    initialState = "error";
  }

  if (!initialState) {
    if (!reviewRecord) {
      notFound();
    }

    if (reviewRecord.status !== "draft") {
      redirect(`/envelopes/${id}`);
    }
  }

  return (
    <ReviewShell
      envelopeId={id}
      fields={fields}
      initialState={initialState}
      invitation={invitation}
      key={id}
      record={reviewRecord ?? undefined}
    />
  );
}

/**
 * The invitation the first signer will get, built by the same code that
 * sends it (with a stand-in link), once for each deadline the sender can
 * pick. Null when it cannot be built here; the review works without it.
 */
async function buildInvitationPreview(input: {
  envelopeTitle: string;
  senderName: string;
  signer: { email: string; name: string } | null;
}): Promise<ReviewInvitationPreview | null> {
  if (!input.signer) {
    return null;
  }

  try {
    const branding = await getBranding();
    const now = Math.floor(Date.now() / 1000);
    const bodies: Record<string, string> = {};
    let subject = "";

    for (const days of ENVELOPE_DEADLINE_DAY_OPTIONS) {
      const message = buildSigningInvitationEmail({
        branding,
        envelopeTitle: input.envelopeTitle,
        expiresAt: now + days * 24 * 60 * 60,
        senderName: input.senderName,
        signerEmail: input.signer.email,
        signerName: input.signer.name,
        signingUrl: SIGNING_LINK_PLACEHOLDER,
      });

      subject = message.subject;
      bodies[String(days)] = message.textBody;
    }

    return {
      bodies,
      linkPlaceholder: SIGNING_LINK_PLACEHOLDER,
      productName: branding.productName,
      subject,
      to: input.signer.email,
    };
  } catch {
    return null;
  }
}
