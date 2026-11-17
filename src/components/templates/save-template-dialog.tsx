"use client";

import { LayoutTemplateIcon } from "@/components/ui/icons";
import { useState, type FormEvent, type RefObject } from "react";

import { getSignerPalette } from "@/components/envelopes/signer-palette";
import { getInitials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FieldError, FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import {
  ConfirmButton,
  DONE_HOLD_MS,
  KeptList,
  TrayError,
} from "@/components/envelopes/detail/trays/tray-parts";
import { MAX_TEMPLATE_ROLE_NAME_LENGTH } from "@/lib/schemas/template";

type SaveTemplateDialogProps = {
  envelopeId: string;
  /** What the template is called unless the sender changes it. */
  initialName: string;
  onOpenChange: (open: boolean) => void;
  onSaved: (templateName: string) => void;
  open: boolean;
  /** Where focus goes when the tray closes (e.g. a menu's trigger). */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** In signing order. The names only say whose place is being named. */
  signers: readonly { id: string; name: string }[];
};

const genericError = "Something went wrong. Please try again.";

/**
 * A tray that asks what to call the template and each place in its signing
 * order, shows what a template keeps and what it leaves behind, then saves
 * the envelope as a template.
 */
export function SaveTemplateDialog({
  envelopeId,
  initialName,
  onOpenChange,
  onSaved,
  open,
  returnFocusRef,
  signers,
}: SaveTemplateDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  return (
    <Tray
      dismissible={!isSaving}
      onOpenChange={(next) => !isSaving && onOpenChange(next)}
      open={open}
    >
      <TrayContent
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
        showCloseButton={!isSaving}
        size="lg"
      >
        <SaveTemplateForm
          envelopeId={envelopeId}
          initialName={initialName}
          isSaving={isSaving}
          onSaved={onSaved}
          setIsSaving={setIsSaving}
          signers={signers}
        />
      </TrayContent>
    </Tray>
  );
}

/** Lives inside the tray, so every opening starts fresh. */
function SaveTemplateForm({
  envelopeId,
  initialName,
  isSaving,
  onSaved,
  setIsSaving,
  signers,
}: Pick<
  SaveTemplateDialogProps,
  "envelopeId" | "initialName" | "onSaved" | "signers"
> & {
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
}) {
  const [name, setName] = useState(initialName);
  const [roleNames, setRoleNames] = useState(() =>
    signers.map((_, index) => `Signer ${String(index + 1)}`),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trimmedRoleNames = roleNames.map((roleName) => roleName.trim());
  const hasRepeatedRoleName =
    new Set(trimmedRoleNames.map((roleName) => roleName.toLowerCase())).size !==
    trimmedRoleNames.length;
  const canSave =
    name.trim().length > 0 &&
    trimmedRoleNames.every((roleName) => roleName.length > 0) &&
    !hasRepeatedRoleName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSave || isSaving || saved) {
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/envelopes/${envelopeId}/template`, {
        body: JSON.stringify({ name, roleNames: trimmedRoleNames }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        name?: string;
      } | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? genericError);
        setIsSaving(false);
        return;
      }

      // "Saved" for a beat, then the tray closes into the confirmation.
      setSaved(true);
      setIsSaving(false);
      window.setTimeout(
        () => onSaved(payload?.name ?? name.trim()),
        DONE_HOLD_MS,
      );
    } catch {
      setErrorMessage(genericError);
      setIsSaving(false);
    }
  }

  return (
    <form className="flex min-h-0 flex-col" onSubmit={handleSubmit}>
      <TrayHeader icon={<LayoutTemplateIcon aria-hidden="true" />}>
        <TrayTitle>Save as a template</TrayTitle>
        <TrayDescription>
          Send it again with new people. Only their names change.
        </TrayDescription>
      </TrayHeader>

      <TrayBody className="flex flex-col gap-5 pt-4">
        <FormField label="Template name">
          <Input
            autoFocus
            disabled={isSaving}
            maxLength={160}
            onChange={(event) => {
              setErrorMessage(null);
              setName(event.target.value);
            }}
            type="text"
            value={name}
          />
        </FormField>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm leading-5 font-medium text-(--fg)">
            Name each place in the signing order
          </legend>
          <p className="-mt-0.5 mb-1 text-[0.8125rem] leading-5 text-(--secondary)">
            Such as Client or Landlord. You say who that is each time.
          </p>
          <ol className="flex flex-col gap-2">
            {signers.map((signer, index) => (
              <li
                className="flex flex-col gap-2 rounded-(--radius-well) bg-(--surface) p-3 sm:flex-row sm:items-center sm:gap-3"
                key={signer.id}
              >
                <span className="flex min-w-0 items-center gap-2.5 sm:w-40 sm:shrink-0">
                  <span
                    aria-hidden="true"
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold"
                    style={{
                      background: getSignerPalette(index).tint,
                      color: getSignerPalette(index).color,
                    }}
                  >
                    {getInitials(signer.name)}
                  </span>
                  <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
                    {signer.name}
                  </span>
                </span>
                <Input
                  aria-invalid={
                    hasRepeatedRoleName &&
                    trimmedRoleNames.filter(
                      (role) =>
                        role.toLowerCase() ===
                        trimmedRoleNames[index]?.toLowerCase(),
                    ).length > 1
                      ? true
                      : undefined
                  }
                  aria-label={`Signer ${String(index + 1)}, here ${signer.name}`}
                  className="min-w-0 flex-1"
                  disabled={isSaving}
                  maxLength={MAX_TEMPLATE_ROLE_NAME_LENGTH}
                  onChange={(event) => {
                    setErrorMessage(null);
                    setRoleNames((current) =>
                      current.map((roleName, roleIndex) =>
                        roleIndex === index ? event.target.value : roleName,
                      ),
                    );
                  }}
                  placeholder={`Signer ${String(index + 1)}`}
                  type="text"
                  value={roleNames[index] ?? ""}
                />
              </li>
            ))}
          </ol>
          <FieldError role="alert">
            {hasRepeatedRoleName ? "Give each signer a different name." : null}
          </FieldError>
        </fieldset>

        <KeptList
          kept={["The document", "Every field, where it sits", "Signing order"]}
          notKept={["Names and email addresses", "Anything filled in"]}
        />

        <TrayError message={errorMessage} />
      </TrayBody>

      <TrayFooter>
        <TrayClose asChild>
          <Button disabled={isSaving} type="button" variant="outline">
            Cancel
          </Button>
        </TrayClose>
        <ConfirmButton
          disabled={!canSave && !isSaving && !saved}
          labels={{ done: "Saved", idle: "Save template", pending: "Saving…" }}
          phase={saved ? "done" : isSaving ? "pending" : "idle"}
          type="submit"
        />
      </TrayFooter>
    </form>
  );
}
