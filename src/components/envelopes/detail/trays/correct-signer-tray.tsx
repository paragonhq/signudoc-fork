"use client";

import { UserPenIcon } from "@/components/ui/icons";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/field";
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

import { errorMessage } from "../use-envelope-actions";
import {
  ConfirmButton,
  DONE_HOLD_MS,
  TrayError,
  type ConfirmPhase,
} from "./tray-parts";

export type CorrectableSigner = {
  email: string;
  id: string;
  name: string;
  order: number;
};

type CorrectSignerTrayProps = {
  onConfirm: (
    signerId: string,
    next: { email: string; name: string },
  ) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  signer: CorrectableSigner | null;
};

/** Fix a signer's name or email while the envelope is out. */
export function CorrectSignerTray({
  onConfirm,
  onOpenChange,
  open,
  signer,
}: CorrectSignerTrayProps) {
  const [phase, setPhase] = useState<ConfirmPhase>("idle");
  const pending = phase !== "idle";

  return (
    <Tray
      dismissible={!pending}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      open={open}
    >
      <TrayContent showCloseButton={!pending} size="md">
        {signer ? (
          <CorrectSignerForm
            key={signer.id}
            onClose={() => onOpenChange(false)}
            onConfirm={onConfirm}
            pending={pending}
            phase={phase}
            setPhase={setPhase}
            signer={signer}
          />
        ) : null}
      </TrayContent>
    </Tray>
  );
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CorrectSignerForm({
  onClose,
  onConfirm,
  pending,
  phase,
  setPhase,
  signer,
}: {
  onClose: () => void;
  onConfirm: CorrectSignerTrayProps["onConfirm"];
  pending: boolean;
  phase: ConfirmPhase;
  setPhase: (phase: ConfirmPhase) => void;
  signer: CorrectableSigner;
}) {
  const [name, setName] = useState(signer.name);
  const [email, setEmail] = useState(signer.email);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unchanged =
    name.trim() === signer.name &&
    email.trim().toLowerCase() === signer.email.toLowerCase();

  async function submit() {
    const nextNameError = name.trim() ? null : "Enter the signer's name.";
    const nextEmailError = EMAIL_SHAPE.test(email.trim())
      ? null
      : "Enter an email address like name@example.com.";

    setNameError(nextNameError);
    setEmailError(nextEmailError);

    if (nextNameError || nextEmailError) {
      return;
    }

    setError(null);
    setPhase("pending");

    try {
      await onConfirm(signer.id, { email: email.trim(), name: name.trim() });
      setPhase("done");
      window.setTimeout(() => {
        onClose();
        setPhase("idle");
      }, DONE_HOLD_MS);
    } catch (caught) {
      setPhase("idle");
      setError(errorMessage(caught, "Unable to correct this signer."));
    }
  }

  return (
    <form
      className="flex min-h-0 flex-col"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <TrayHeader icon={<UserPenIcon aria-hidden="true" />}>
        <TrayTitle>Correct this signer</TrayTitle>
        <TrayDescription>
          The link sent to {signer.email} stops working. If it is their turn, a
          new invitation goes to the corrected address.
        </TrayDescription>
      </TrayHeader>
      <TrayBody className="flex flex-col gap-4 pt-4">
        <FormField error={nameError} label="Name">
          <Input
            autoComplete="off"
            autoFocus
            disabled={pending}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            value={name}
          />
        </FormField>
        <FormField error={emailError} label="Email">
          <Input
            autoCapitalize="off"
            autoComplete="off"
            disabled={pending}
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
            spellCheck={false}
            type="email"
            value={email}
          />
        </FormField>
        <TrayError message={error} />
      </TrayBody>
      <TrayFooter>
        <TrayClose asChild>
          <Button disabled={pending} type="button" variant="outline">
            Cancel
          </Button>
        </TrayClose>
        <ConfirmButton
          disabled={unchanged && phase === "idle"}
          labels={{
            done: "Corrected",
            idle: "Save correction",
            pending: "Saving…",
          }}
          phase={phase}
          type="submit"
        />
      </TrayFooter>
    </form>
  );
}
