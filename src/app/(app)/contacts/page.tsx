import { ContactsShell } from "@/components/contacts/contacts-shell";
import { getAuthSession } from "@/lib/auth/server";
import { listContactBookForUser } from "@/lib/contacts";
import { getDb } from "@/lib/db/connection";

/** When this request was rendered, in unix seconds. Read once, on the server. */
function renderedAt() {
  return Math.floor(Date.now() / 1000);
}

export default async function ContactsPage() {
  let contacts: Awaited<ReturnType<typeof listContactBookForUser>> = [];
  let initialState: "error" | undefined;
  // One clock for the server render and the browser, so "2 days ago" reads
  // the same in both.
  const now = renderedAt();

  try {
    const session = await getAuthSession();

    contacts = session
      ? await listContactBookForUser(session.user.id, { now }, getDb())
      : [];
  } catch {
    initialState = "error";
  }

  return (
    <ContactsShell contacts={contacts} initialState={initialState} now={now} />
  );
}
