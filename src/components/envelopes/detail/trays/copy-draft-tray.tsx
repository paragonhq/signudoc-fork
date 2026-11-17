"use client";

import { CopyPlusIcon } from "@/components/ui/icons";
import { useState } from "react";

import { Button } from "@/components/ui/button";
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
  KeptList,
  TrayError,
  type ReturnFocusProps,
} from "./tray-parts";

type CopyDraftTrayProps = ReturnFocusProps & {
  onConfirm: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

/** Start a new draft from this envelope. Nothing is sent. */
export function CopyDraftTray({
  onConfirm,
  onOpenChange,
  open,
  returnFocusRef,
}: CopyDraftTrayProps) {
  const [pending, setPending] = useState(false);

  return (
    <Tray
      dismissible={!pending}
      onOpenChange={(next) => !pending && onOpenChange(next)}
      open={open}
    >
      <TrayContent
        onCloseAutoFocus={(event) => {
          if (returnFocusRef?.current) {
            event.preventDefault();
            returnFocusRef.current.focus();
          }
        }}
        showCloseButton={!pending}
        size="md"
      >
        <CopyDraftBody
          onConfirm={onConfirm}
          pending={pending}
          setPending={setPending}
        />
      </TrayContent>
    </Tray>
  );
}

function CopyDraftBody({
  onConfirm,
  pending,
  setPending,
}: {
  onConfirm: () => Promise<void>;
  pending: boolean;
  setPending: (pending: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (pending || done) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      await onConfirm();
      // The page moves to the new draft; keep the tray calm until it does.
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to copy this envelope."));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <TrayHeader icon={<CopyPlusIcon aria-hidden="true" />}>
        <TrayTitle>Copy to a new draft</TrayTitle>
        <TrayDescription>
          Nobody is emailed, and this envelope is left as it is.
        </TrayDescription>
      </TrayHeader>
      <TrayBody className="flex flex-col gap-3 pt-4">
        <KeptList
          kept={["The document", "The same people", "Every placed field"]}
          notKept={[
            "Anything filled in",
            "Access codes: set new ones before you send",
          ]}
        />
        <TrayError message={error} />
      </TrayBody>
      <TrayFooter>
        <TrayClose asChild>
          <Button disabled={pending || done} variant="outline">
            Cancel
          </Button>
        </TrayClose>
        <ConfirmButton
          labels={{
            done: "Opening draft…",
            idle: "Copy to new draft",
            pending: "Copying…",
          }}
          onClick={() => void submit()}
          phase={done ? "done" : pending ? "pending" : "idle"}
        />
      </TrayFooter>
    </>
  );
}
