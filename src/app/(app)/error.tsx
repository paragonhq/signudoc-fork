"use client";

import { RotateCcwIcon } from "@/components/ui/icons";
import Link from "next/link";
import { useEffect, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { StatusFlag } from "@/components/ui/status-flag";

export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const [retrying, startRetry] = useTransition();
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest ?? "")
      : "";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section
      className="flex flex-col items-start gap-5 rounded-xl border border-(--border) bg-(--paper) px-5 py-7 sm:px-8 sm:py-10"
      data-animate="enter"
      role="alert"
    >
      <StatusFlag glyph="x" tone="danger">
        Error
      </StatusFlag>
      <div className="flex max-w-xl flex-col gap-2">
        <h1 className="text-2xl leading-tight font-semibold tracking-[-0.03em] text-balance text-(--fg)">
          We couldn&apos;t load this page.
        </h1>
        <p className="text-sm leading-6 text-pretty text-(--secondary)">
          Something went wrong on our side. Nothing you saved is lost; try
          again, or head back to your documents.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button loading={retrying} onClick={() => startRetry(() => retry())}>
          <RotateCcwIcon aria-hidden="true" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to documents</Link>
        </Button>
      </div>
      {digest ? <p className="meta">Reference {digest}</p> : null}
    </section>
  );
}
