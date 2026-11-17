import { notFound } from "next/navigation";

import { StatusPanel } from "@/components/shared/status-panel";
import { SaveTemplateDraftShell } from "@/components/templates/save-template-draft-shell";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import { getTemplateDraftForUser } from "@/lib/templates";

type SaveTemplatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

// The last step of a new template: check, name, save.
export default async function SaveTemplatePage({
  params,
}: SaveTemplatePageProps) {
  const { id } = await params;
  let draft: Awaited<ReturnType<typeof getTemplateDraftForUser>> = null;
  let failed = false;

  try {
    const session = await getAuthSession();

    draft = session
      ? await getTemplateDraftForUser(session.user.id, id, getDb())
      : null;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <StatusPanel
        action={{ href: "/templates", label: "Back to templates" }}
        description="We couldn't load this template. Try again in a moment."
        title="This template didn't load"
        tone="error"
      />
    );
  }

  if (!draft) {
    notFound();
  }

  return <SaveTemplateDraftShell draft={draft} key={id} />;
}
