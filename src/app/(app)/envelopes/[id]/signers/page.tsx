import { notFound, redirect } from "next/navigation";

import {
  SignersShell,
  type SignersStepDocument,
} from "@/components/envelopes/signers-shell";
import { getAuthSession } from "@/lib/auth/server";
import { getDb } from "@/lib/db/connection";
import {
  getDraftSignerStepDataForUser,
  getPrepareEnvelopeDataForUser,
} from "@/lib/envelopes";

type SignersPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SignersPage({ params }: SignersPageProps) {
  const { id } = await params;
  let record: Awaited<ReturnType<typeof getDraftSignerStepDataForUser>> = null;
  let preview: SignersStepDocument | undefined;
  let initialState: "error" | undefined;

  try {
    const session = await getAuthSession();
    const database = getDb();

    record = session
      ? await getDraftSignerStepDataForUser(session.user.id, id, database)
      : null;

    // The document beside the signers. Without it the step still works.
    const prepared =
      session && record
        ? await getPrepareEnvelopeDataForUser(session.user.id, id, {
            database,
          }).catch(() => null)
        : null;

    preview = prepared
      ? {
          fields: prepared.fields.map((field) => ({
            height: field.height,
            page: field.page,
            signerId: field.signerId,
            type: field.type,
            width: field.width,
            x: field.x,
            y: field.y,
          })),
          pageCount: prepared.pageCount,
          title: prepared.title,
        }
      : undefined;
  } catch {
    initialState = "error";
  }

  if (!initialState) {
    if (!record) {
      notFound();
    }

    if (record.status !== "draft") {
      redirect(`/envelopes/${id}`);
    }
  }

  return (
    <SignersShell
      envelopeId={id}
      initialState={initialState}
      key={id}
      preview={preview}
      record={record ?? undefined}
    />
  );
}
