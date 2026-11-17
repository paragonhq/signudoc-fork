import { ActivityShell } from "@/components/activity/activity-shell";
import { listActivityForUser, type ActivityPage } from "@/lib/activity";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";

export default async function ActivityRoute() {
  let page: ActivityPage = { items: [], nextCursor: null };
  let initialState: "error" | undefined;

  try {
    const session = await getAuthSession();

    if (session) {
      page = await listActivityForUser(session.user.id, {}, getDb());
    }
  } catch {
    initialState = "error";
  }

  return <ActivityShell initialPage={page} initialState={initialState} />;
}
