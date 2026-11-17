"use client";

import Link from "next/link";
import { useEffect } from "react";

import { StatusPanel } from "@/components/shared/status-panel";
import { Button } from "@/components/ui/button";

export default function CanvasError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-start justify-center bg-(--page) p-4 sm:items-center sm:p-8">
      <div className="w-full max-w-xl">
        <StatusPanel
          description="Something went wrong while opening this document. Your fields are saved as you go, so trying again is safe."
          footer={
            <>
              <Button onClick={() => retry()}>Try again</Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard">Back to documents</Link>
              </Button>
            </>
          }
          title="We couldn't open this document"
          tone="error"
        />
      </div>
    </div>
  );
}
