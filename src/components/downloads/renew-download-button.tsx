"use client";

import { useState } from "react";

import { AuthNotice } from "@/components/auth/auth-parts";
import { StateIllustration } from "@/components/signing/frame/state-illustration";
import { Button } from "@/components/ui/button";
import { TextMorph } from "@/components/ui/text-morph";

type RenewState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; maskedEmail: string }
  | { kind: "error"; message: string };

/*
 * An expired download link: one card, one button. The drawing is the
 * page with a clock on its corner; the button sends fresh links to the
 * address the document went to, and once sent the clock gives way to an
 * envelope, the label morphs to "Links sent" and one line says where.
 */
export function RenewDownloadButton({ token }: { token: string }) {
  const [state, setState] = useState<RenewState>({ kind: "idle" });
  const sent = state.kind === "sent";

  async function handleClick() {
    if (state.kind === "sending" || sent) {
      return;
    }

    setState({ kind: "sending" });

    try {
      const response = await fetch(
        `/api/download/${encodeURIComponent(token)}/renew`,
        { method: "POST" },
      );
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        maskedEmail?: string;
      } | null;

      if (!response.ok || !payload?.maskedEmail) {
        setState({
          kind: "error",
          message: payload?.error ?? "New links could not be sent right now.",
        });
        return;
      }

      setState({ kind: "sent", maskedEmail: payload.maskedEmail });
    } catch {
      setState({
        kind: "error",
        message: "New links could not be sent right now.",
      });
    }
  }

  return (
    <div
      aria-label="Get new download links"
      className="flex flex-col items-center gap-5 rounded-(--radius-card) bg-(--paper) px-6 pt-6 pb-7 text-center shadow-(--shadow-card) sm:px-8"
      role="region"
    >
      <div className="flex w-full justify-center rounded-[calc(var(--radius-card)-0.5rem)] bg-(--page) pt-5 pb-3">
        <StateIllustration badge={sent ? "mail" : "clock"} className="w-44" />
      </div>
      <p className="max-w-[40ch] text-[0.9375rem] leading-6 text-pretty text-(--secondary)">
        Fresh links go only to the address this document was sent to.
      </p>

      <Button
        aria-disabled={sent || undefined}
        className="w-full sm:w-auto"
        loading={state.kind === "sending"}
        onClick={handleClick}
        size="lg"
        variant={sent ? "outline" : "default"}
      >
        <TextMorph>
          {sent ? "Links sent" : "Email me new download links"}
        </TextMorph>
      </Button>

      {sent || state.kind === "error" ? (
        <div className="w-full">
          <AuthNotice tone="success">
            {sent
              ? `New links are on their way to ${state.maskedEmail}.`
              : null}
          </AuthNotice>
          <AuthNotice>
            {state.kind === "error" ? state.message : null}
          </AuthNotice>
        </div>
      ) : null}
    </div>
  );
}
