"use client";

import { BellIcon, CheckIcon } from "@/components/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { NeedsYouItem } from "@/components/dashboard/dashboard-model";
import { PaperThumb } from "@/components/dashboard/paper-thumb";
import { Button } from "@/components/ui/button";
import { TextMorph } from "@/components/ui/text-morph";
import { toast } from "@/components/ui/toaster";

/**
 * "Needs you": shown only when something does (gradual revelation). At
 * most three compact cards, each with one action: finish a draft, send a
 * reminder for something waiting a while (the existing nudge endpoint), or
 * open a document that stopped.
 */
export function DashboardNeedsYou({
  items,
}: {
  items: readonly NeedsYouItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="needs-you" className="flex flex-col gap-4">
      <h2
        className="px-1 text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg)"
        id="needs-you"
      >
        Needs you
      </h2>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-(--card-row-gap) sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li className="min-w-0" key={item.row.source.id}>
            <NeedsYouCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NeedsYouCard({ item }: { item: NeedsYouItem }) {
  const { id, title } = item.row.source;
  const href = `/envelopes/${encodeURIComponent(id)}`;

  return (
    <article className="flex h-full items-center gap-3 rounded-(--radius-card) bg-(--paper) py-3 pr-3 pl-3 shadow-(--shadow-card)">
      <Link
        className="group/card flex min-w-0 flex-1 items-center gap-3 rounded-[0.875rem] outline-none focus-visible:shadow-(--focus-ring)"
        href={href}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.625rem] bg-(--surface)">
          <PaperThumb
            className="h-[2.125rem]"
            envelopeId={id}
            morph={false}
            title={title}
          />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] text-(--fg) group-hover/card:underline group-hover/card:decoration-(--border-hover) group-hover/card:underline-offset-4">
            {title}
          </span>
          <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
            {item.reason}
          </span>
        </span>
      </Link>
      <div className="flex shrink-0">
        {item.kind === "draft" ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/envelopes/${encodeURIComponent(id)}/prepare`}>
              Finish draft
            </Link>
          </Button>
        ) : item.kind === "nudge" ? (
          <ReminderButton envelopeId={id} />
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href={href}>Open</Link>
          </Button>
        )}
      </div>
    </article>
  );
}

type ReminderState = "idle" | "sending" | "sent";

/**
 * Send → Sending… → Reminder sent, in one morphing label. Uses the same
 * endpoint the detail page's reminder button uses; nothing new.
 */
function ReminderButton({ envelopeId }: { envelopeId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ReminderState>("idle");

  async function send() {
    if (state !== "idle") {
      return;
    }

    setState("sending");

    try {
      const response = await fetch(
        `/api/envelopes/${encodeURIComponent(envelopeId)}/nudge`,
        { method: "POST" },
      );

      if (response.ok) {
        setState("sent");
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      setState("idle");

      if (response.status === 404 || response.status === 409) {
        toast(payload?.error ?? "This document changed. Showing the latest.");
        router.refresh();
        return;
      }

      toast.error(payload?.error ?? "Couldn’t send a reminder right now.");
    } catch {
      setState("idle");
      toast.error("Couldn’t send a reminder. Check your connection.");
    }
  }

  return (
    <Button
      aria-disabled={state === "sent" || undefined}
      aria-live="polite"
      onClick={() => void send()}
      size="sm"
      variant={state === "sent" ? "ghost" : "secondary"}
    >
      {state === "sent" ? (
        <CheckIcon aria-hidden="true" className="text-(--success)" />
      ) : (
        <BellIcon aria-hidden="true" />
      )}
      <TextMorph>
        {state === "sent"
          ? "Reminder sent"
          : state === "sending"
            ? "Sending…"
            : "Send reminder"}
      </TextMorph>
    </Button>
  );
}
