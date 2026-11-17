import { NewTemplateShell } from "@/components/templates/new-template-shell";
import { getAuthSession } from "@/lib/auth/server";
import { supportsDirectUploads } from "@/lib/services/storage";
import { buildPendingUploadPrefix } from "@/lib/services/storage-keys";

export default async function NewTemplatePage() {
  // As for a new envelope: on Vercel Blob the browser sends the PDF straight
  // to storage, into this user's pending folder.
  const session = supportsDirectUploads() ? await getAuthSession() : null;

  return (
    <NewTemplateShell
      directUploadPrefix={
        session ? buildPendingUploadPrefix(session.user.id) : null
      }
    />
  );
}
