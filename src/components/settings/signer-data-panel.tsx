"use client";

import { useState } from "react";
import { FileJson, Trash2 } from "@/components/ui/icons";

import {
  CardNotice,
  Notice,
  Reveal,
  SettingRow,
  SettingRows,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { ConfirmTray } from "@/components/ui/confirm-tray";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

// Answers a signer who asks what is stored about them, or for it to be
// erased. Administrators only.

const FAILED_MESSAGE = "That request could not be completed.";

type ErasureResult = {
  deletedEnvelopes: number;
  removedFromDrafts: number;
  keptPart11?: { id: string; title: string }[];
  skippedInProgress: { id: string; title: string }[];
};

export function SignerDataPanel() {
  const [email, setEmail] = useState("");
  const [eraseError, setEraseError] = useState<string | null>(null);
  const [result, setResult] = useState<
    (ErasureResult & { email: string }) | null
  >(null);
  const trimmed = email.trim();
  const ready = trimmed.includes("@");
  const exportHref = `/api/admin/signer-data?email=${encodeURIComponent(trimmed)}`;

  async function erase() {
    setEraseError(null);

    let payload: (ErasureResult & { error?: string }) | null = null;
    let ok = false;

    try {
      const response = await fetch("/api/admin/signer-data", {
        body: JSON.stringify({ confirmation: trimmed, email: trimmed }),
        headers: { "content-type": "application/json" },
        method: "DELETE",
      });

      ok = response.ok;
      payload = (await response.json().catch(() => null)) as
        (ErasureResult & { error?: string }) | null;
    } catch {
      setEraseError(FAILED_MESSAGE);
      throw new Error(FAILED_MESSAGE);
    }

    if (!ok || !payload) {
      setEraseError(payload?.error ?? FAILED_MESSAGE);
      throw new Error(FAILED_MESSAGE);
    }

    setResult({ ...payload, email: trimmed });
    toast.success("Signer's records erased", {
      description: `Deleted ${String(payload.deletedEnvelopes)} finished envelope(s) and removed the signer from ${String(payload.removedFromDrafts)} draft(s).`,
    });
  }

  return (
    <SettingsSection
      description="When a signer asks what you hold about them, or asks for it to be erased."
      id="signer-data"
      title="Signer data requests"
    >
      <SettingRow
        description="The address they signed with."
        label="Signer's email"
      >
        <Input
          autoCapitalize="none"
          autoComplete="off"
          inputMode="email"
          name="signer-data-email"
          onChange={(event) => {
            setEmail(event.target.value);
            setResult(null);
          }}
          placeholder="jane@company.com"
          spellCheck={false}
          type="email"
          value={email}
        />
      </SettingRow>

      {/* What can be done appears once there is someone to do it for. */}
      <Reveal show={ready}>
        <SettingRows>
          <SettingRow
            controlWidth="auto"
            description="Everything stored about them, as a JSON file."
            kind="group"
            label="Access request"
          >
            <Button asChild className="max-md:w-full" variant="outline">
              <a download href={exportHref}>
                <FileJson aria-hidden="true" />
                Download their data
              </a>
            </Button>
          </SettingRow>
          <SettingRow
            controlWidth="auto"
            description="Deletes every finished envelope they signed. Only when no law or open dispute needs them."
            kind="group"
            label="Erasure request"
          >
            <ConfirmTray
              confirmLabel="Erase records"
              confirmationLabel="Type the signer's email to confirm"
              confirmationText={trimmed}
              description={
                <>
                  Every finished envelope{" "}
                  <span className="font-medium text-(--fg)">{trimmed}</span>{" "}
                  signed is deleted, with its files and audit trail. Envelopes
                  still out for signature and Part 11 records are left alone.
                  This cannot be undone.
                </>
              }
              error={eraseError}
              onConfirm={erase}
              onOpenChange={(open) => {
                if (!open) {
                  setEraseError(null);
                }
              }}
              title="Erase this signer's records?"
              trigger={
                <Button
                  className="max-md:w-full"
                  disabled={!ready}
                  variant="destructive-ghost"
                >
                  <Trash2 aria-hidden="true" />
                  Erase their records
                </Button>
              }
            />
          </SettingRow>
        </SettingRows>
      </Reveal>

      <Reveal show={result !== null}>
        {result ? (
          <CardNotice>
            <Notice
              role="status"
              title={`Erased the records for ${result.email}`}
              tone="success"
            >
              {describeErasure(result)}
            </Notice>
          </CardNotice>
        ) : null}
      </Reveal>
    </SettingsSection>
  );
}

function plural(count: number, one: string, many: string) {
  return `${String(count)} ${count === 1 ? one : many}`;
}

/** The erasure's outcome as sentences, not a grid of numbers. */
function describeErasure(result: ErasureResult): string {
  const parts = [
    `Deleted ${plural(result.deletedEnvelopes, "finished envelope", "finished envelopes")} and removed them from ${plural(result.removedFromDrafts, "draft", "drafts")}.`,
  ];

  if (result.skippedInProgress.length > 0) {
    parts.push(
      `${plural(result.skippedInProgress.length, "envelope", "envelopes")} still out for signature ${result.skippedInProgress.length === 1 ? "was" : "were"} left alone: void ${result.skippedInProgress.length === 1 ? "it" : "them"} first, then erase again.`,
    );
  }

  if (result.keptPart11?.length) {
    parts.push(
      `${plural(result.keptPart11.length, "Part 11 record was", "Part 11 records were")} kept: those are only deleted by hand.`,
    );
  }

  return parts.join(" ");
}
