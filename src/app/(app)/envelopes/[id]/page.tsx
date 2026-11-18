import { EnvelopeDetailShell } from "@/components/envelopes/detail/envelope-detail-shell";
import { isAdminUser } from "@/lib/auth/admin";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import {
  formatEnvelopeOwner,
  resolveEnvelopeViewerAccess,
} from "@/lib/envelope-access";
import { getEnvelopeDetailDataForUser } from "@/lib/envelopes";

/** When this request was rendered. Read once per request, on the server. */
function renderedAt() {
  return Date.now();
}

type EnvelopeDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EnvelopeDetailPage({
  params,
}: EnvelopeDetailPageProps) {
  const { id } = await params;
  const now = renderedAt();

  let detailRecord: Awaited<ReturnType<typeof getEnvelopeDetailDataForUser>> =
    null;
  let initialState: "error" | "not-found" | undefined;
  let canDeleteFinished = false;
  let ownerLabel: string | undefined;

  try {
    const session = await getAuthSession();
    // Its sender's, or, for an administrator, anyone's.
    const access = session
      ? await resolveEnvelopeViewerAccess(session.user.id, id, getDb())
      : null;

    detailRecord = access
      ? await getEnvelopeDetailDataForUser(access.ownerUserId, id, getDb())
      : null;
    initialState = detailRecord ? undefined : "not-found";
    ownerLabel =
      access && !access.viewerIsOwner ? formatEnvelopeOwner(access) : undefined;
    // Only an administrator may delete a finished envelope.
    canDeleteFinished =
      detailRecord !== null &&
      session !== null &&
      (await isAdminUser(session.user.id, getDb()));
  } catch {
    initialState = "error";
  }

  return (
    <EnvelopeDetailShell
      canDeleteFinished={canDeleteFinished}
      envelopeId={id}
      initialState={initialState}
      key={id}
      // "Sent 2 hours ago" is worked out from one clock on both sides.
      now={now}
      ownerLabel={ownerLabel}
      record={detailRecord ?? undefined}
    />
  );
}
