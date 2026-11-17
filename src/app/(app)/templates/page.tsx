import { TemplatesShell } from "@/components/templates/templates-shell";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import { listTemplateLibraryForUser } from "@/lib/templates";

export default async function TemplatesPage() {
  let templates: Awaited<ReturnType<typeof listTemplateLibraryForUser>> = [];
  let initialState: "error" | undefined;

  try {
    const session = await getAuthSession();

    templates = session
      ? await listTemplateLibraryForUser(session.user.id, getDb())
      : [];
  } catch {
    initialState = "error";
  }

  return <TemplatesShell initialState={initialState} templates={templates} />;
}
