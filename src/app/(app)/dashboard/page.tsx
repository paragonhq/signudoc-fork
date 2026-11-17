import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  getDocumentsOverview,
  listActivityForUser,
  type ActivityItem,
  type DocumentsOverview,
} from "@/lib/activity";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import { listEnvelopesForUser } from "@/lib/envelopes";
import { isRoleStandInEmail } from "@/lib/templates";

/** When this request was rendered. Read once per request, on the server. */
function renderedAt() {
  return Date.now();
}

/** The most the list holds at once (the API's own ceiling). */
const DOCUMENT_LIMIT = 100;

export default async function DashboardPage() {
  const now = renderedAt();
  const session = await getAuthSession();
  const database = getDb();
  let envelopes: Awaited<ReturnType<typeof listEnvelopesForUser>> | undefined;
  let overview: DocumentsOverview | null = null;
  let latest: ActivityItem | null = null;
  let initialState: "default" | "empty" | "error" = "error";

  try {
    if (session) {
      const [list, summary, activity] = await Promise.all([
        listEnvelopesForUser(
          session.user.id,
          { limit: DOCUMENT_LIMIT },
          database,
        ),
        // The overview and the latest event are extras: the list stands
        // on its own if either fails.
        getDocumentsOverview(
          session.user.id,
          Math.floor(now / 1000),
          database,
        ).catch(() => null),
        listActivityForUser(session.user.id, { limit: 1 }, database).catch(
          () => null,
        ),
      ]);

      envelopes = list;
      overview = summary;
      latest = activity?.items[0] ?? null;
    } else {
      envelopes = [];
    }

    initialState = envelopes.length === 0 ? "empty" : "default";
  } catch {
    initialState = "error";
  }

  // A template being made from scratch: every signer is a role stand-in.
  const templateDraftIds = (envelopes ?? [])
    .filter(
      (envelope) =>
        envelope.status === "draft" &&
        envelope.searchableEmails.length > 0 &&
        envelope.searchableEmails.every(isRoleStandInEmail),
    )
    .map((envelope) => envelope.id);

  return (
    <DashboardShell
      envelopes={envelopes}
      initialState={initialState}
      latestActivity={latest}
      // One clock for the server render and the browser: time groups and
      // "waiting n days" are worked out from it on both sides.
      now={now}
      overview={overview}
      templateDraftIds={templateDraftIds}
    />
  );
}
