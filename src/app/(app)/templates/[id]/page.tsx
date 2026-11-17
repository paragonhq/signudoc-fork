import { notFound } from "next/navigation";

import { StatusPanel } from "@/components/shared/status-panel";
import { TemplateDetailShell } from "@/components/templates/template-detail-shell";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import { getTemplateDetailForUser } from "@/lib/templates";

type TemplatePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { id } = await params;
  let template: Awaited<ReturnType<typeof getTemplateDetailForUser>> = null;
  let failed = false;

  try {
    const session = await getAuthSession();

    template = session
      ? await getTemplateDetailForUser(session.user.id, id, getDb())
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

  if (!template) {
    notFound();
  }

  return <TemplateDetailShell key={id} template={template} />;
}
