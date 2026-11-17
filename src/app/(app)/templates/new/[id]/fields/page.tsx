import { notFound } from "next/navigation";

import { TemplateFieldsBuilder } from "@/components/templates/template-fields-builder";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import { getPrepareEnvelopeDataForUser } from "@/lib/envelopes";
import { getTemplateDraftForUser } from "@/lib/templates";

type TemplateFieldsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

// Step 3 of a new template: the ordinary builder on the scratch draft, in
// the template's own words. The workspace shell draws no chrome here.
export default async function TemplateFieldsPage({
  params,
}: TemplateFieldsPageProps) {
  const { id } = await params;
  const session = await getAuthSession();
  const database = getDb();
  let record: Awaited<ReturnType<typeof getPrepareEnvelopeDataForUser>> = null;
  let isScratchDraft = false;
  let initialState: "error" | undefined;

  try {
    // Only the owner's own scratch drafts open here.
    isScratchDraft = session
      ? (await getTemplateDraftForUser(session.user.id, id, database)) !== null
      : false;
    record =
      session && isScratchDraft
        ? await getPrepareEnvelopeDataForUser(session.user.id, id, {
            database,
          })
        : null;
  } catch {
    initialState = "error";
  }

  if (!initialState && !isScratchDraft) {
    notFound();
  }

  return (
    <TemplateFieldsBuilder
      envelopeId={id}
      initialState={initialState}
      record={record ?? undefined}
    />
  );
}
