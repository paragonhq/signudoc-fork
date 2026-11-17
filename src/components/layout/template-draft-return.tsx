"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Spinner } from "@/components/ui/spinner";

/**
 * The builder always finishes on an envelope's review page. When the draft
 * is a template being made, that is the wrong place: this takes the person
 * on to "Save template" instead, in place of the review page.
 */
export function TemplateDraftReturn({ envelopeId }: { envelopeId: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/templates/new/${encodeURIComponent(envelopeId)}`);
  }, [envelopeId, router]);

  return (
    <div
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-(--secondary)"
      role="status"
    >
      <Spinner />
      Back to your template…
    </div>
  );
}
