"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  BadgeCheck,
  FileX2,
  KeyRound,
  Lock,
  PenLine,
  type IconComponent,
} from "@/components/ui/icons";

import {
  CardNotice,
  GENERIC_ERROR_MESSAGE,
  Notice,
  Reveal,
  SettingRow,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { SwitchButton } from "@/components/settings/switch-button";
import { Button } from "@/components/ui/button";
import { StatusFlag } from "@/components/ui/status-flag";
import { toast } from "@/components/ui/toaster";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
  TrayTrigger,
} from "@/components/ui/tray";

// Part 11 mode. Administrators only. One switch; what it changes opens in a
// tray. The install's audit trail is its own section above this one.

const RULES: { icon: IconComponent; text: string }[] = [
  {
    icon: BadgeCheck,
    text: "Envelopes go only to people with an account here whose identity an administrator has confirmed under People.",
  },
  {
    icon: KeyRound,
    text: "Each signer gives their email address and password to open the document, and again to sign.",
  },
  {
    icon: PenLine,
    text: "Signers confirm what their signature means. It is printed beside it with their name and the time.",
  },
  {
    icon: Lock,
    text: "Five wrong passwords lock the account for signing and email the administrators.",
  },
  {
    icon: Archive,
    text: "Finished envelopes are never deleted by the retention period or a data request.",
  },
  { icon: FileX2, text: "Voiding an envelope needs a reason." },
];

export function Part11Panel({
  initialEnabled,
  onChange,
}: {
  initialEnabled: boolean;
  /** Told the new mode once it is saved (People and Retention depend on it). */
  onChange?: (enabled: boolean) => void;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function changeMode(next: boolean) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/part11", {
        body: JSON.stringify({ enabled: next }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        part11Mode?: boolean;
      } | null;

      if (!response.ok || typeof payload?.part11Mode !== "boolean") {
        setError(payload?.error ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      setEnabled(payload.part11Mode);
      onChange?.(payload.part11Mode);
      toast.success(
        payload.part11Mode ? "Part 11 mode is on" : "Part 11 mode is off",
        {
          description: payload.part11Mode
            ? "New envelopes follow its rules. Confirm signers' identities under People."
            : "Envelopes already sent under it keep its rules.",
        },
      );
      router.refresh();
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      status={
        enabled ? (
          <StatusFlag glyph="check" size="sm" tone="success">
            On
          </StatusFlag>
        ) : (
          <StatusFlag glyph="ring" size="sm" tone="neutral">
            Off
          </StatusFlag>
        )
      }
      description="For records regulated under FDA 21 CFR Part 11."
      id="part11"
      title="Part 11"
    >
      <Reveal show={error !== null}>
        <CardNotice>
          <Notice role="alert" tone="danger">
            {error}
          </Notice>
        </CardNotice>
      </Reveal>
      <SettingRow
        controlWidth="auto"
        layout="inline"
        description={
          <>
            {enabled
              ? "Envelopes sent while it is on keep its rules after it is turned off. "
              : "Confirmed signers, a password at signing, and records never deleted on a timer. "}
            <Tray>
              <TrayTrigger asChild>
                <button
                  className="rounded-sm font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.35)] underline-offset-4 outline-none hover:decoration-(--accent-ink) focus-visible:shadow-(--focus-ring)"
                  type="button"
                >
                  See what changes
                </button>
              </TrayTrigger>
              <TrayContent size="lg">
                <TrayHeader>
                  <TrayTitle>While Part 11 mode is on</TrayTitle>
                  <TrayDescription>
                    Envelopes sent while it is on keep these rules, even after
                    it is turned off.
                  </TrayDescription>
                </TrayHeader>
                <TrayBody className="flex flex-col gap-5 pt-5">
                  <ul className="flex flex-col gap-3.5">
                    {RULES.map(({ icon: Icon, text }) => (
                      <li className="flex gap-3" key={text}>
                        <span
                          aria-hidden="true"
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-[0.625rem] bg-(--signer-3-tint) text-(--signer-3)"
                        >
                          <Icon className="size-4" strokeWidth={1.75} />
                        </span>
                        <span className="pt-1 text-sm leading-6 text-pretty text-(--secondary-strong)">
                          {text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Notice
                    tone="warning"
                    title="Turning it on does not by itself make this site compliant"
                  >
                    Your organization still validates the system, writes and
                    follows its own procedures, trains its people and certifies
                    its electronic signatures to the FDA.
                  </Notice>
                </TrayBody>
                <TrayFooter>
                  <TrayClose asChild>
                    <Button>Done</Button>
                  </TrayClose>
                </TrayFooter>
              </TrayContent>
            </Tray>
          </>
        }
        kind="group"
        label="Part 11 mode"
      >
        <SwitchButton
          loading={isSaving}
          on={enabled}
          onClick={() => void changeMode(!enabled)}
        >
          {enabled ? "Turn off Part 11 mode" : "Turn on Part 11 mode"}
        </SwitchButton>
      </SettingRow>
    </SettingsSection>
  );
}
