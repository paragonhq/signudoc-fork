import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  getDocumentsOverview,
  listActivityForUser,
  type ActivityItem,
  type DocumentsOverview,
} from "@/lib/activity";
import { isAdminUser } from "@/lib/auth/admin";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import {
  listAllEnvelopesForAdmin,
  listEnvelopesForUser,
  type DashboardEnvelopePage,
} from "@/lib/envelopes";
import { isRoleStandInEmail } from "@/lib/templates";

/** When this request was rendered. Read once per request, on the server. */
function renderedAt() {
  return Date.now();
}

/** Envelopes on one page of the list. */
const DOCUMENT_PAGE_SIZE = 48;

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function dashboardHref({
  page,
  search,
  showAll,
}: {
  page: number;
  search: string;
  showAll: boolean;
}): string {
  const params = new URLSearchParams();

  if (showAll) {
    params.set("view", "all");
  }

  if (search) {
    params.set("q", search);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();

  return query ? `/dashboard?${query}` : "/dashboard";
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const now = renderedAt();
  const session = await getAuthSession();
  const database = getDb();
  const params = await searchParams;
  const search = firstValue(params.q).trim().slice(0, 160);
  const requestedPage = Number.parseInt(firstValue(params.page), 10);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 1
      ? requestedPage
      : 1;
  let result: DashboardEnvelopePage | undefined;
  let overview: DocumentsOverview | null = null;
  let latest: ActivityItem | null = null;
  let initialState: "default" | "empty" | "error" = "error";
  let isAdmin = false;
  let showAll = false;

  try {
    if (session) {
      isAdmin = await isAdminUser(session.user.id, database);
      // An administrator can see every envelope in the install, not only
      // their own.
      showAll = isAdmin && firstValue(params.view) === "all";

      const filters = {
        limit: DOCUMENT_PAGE_SIZE,
        page,
        ...(search ? { search } : {}),
      };
      const [list, summary, activity] = await Promise.all([
        showAll
          ? listAllEnvelopesForAdmin(filters, database)
          : listEnvelopesForUser(session.user.id, filters, database),
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

      result = list;
      overview = summary;
      latest = activity?.items[0] ?? null;
    } else {
      result = { envelopes: [], hasMore: false };
    }

    // Nothing at all yet, as opposed to nothing that matches or nothing
    // on this page.
    initialState =
      result.envelopes.length === 0 && !search && page === 1
        ? "empty"
        : "default";
  } catch {
    initialState = "error";
  }

  const envelopes = result?.envelopes;
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
      initialSearch={search}
      initialState={initialState}
      latestActivity={latest}
      // One clock for the server render and the browser: time groups and
      // "waiting n days" are worked out from it on both sides.
      now={now}
      overview={overview}
      pagination={{
        newerHref:
          page > 1
            ? dashboardHref({ page: page - 1, search, showAll })
            : undefined,
        olderHref: result?.hasMore
          ? dashboardHref({ page: page + 1, search, showAll })
          : undefined,
      }}
      templateDraftIds={templateDraftIds}
      view={isAdmin ? (showAll ? "all" : "mine") : undefined}
    />
  );
}
