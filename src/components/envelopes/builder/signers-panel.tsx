"use client";

import { CheckIcon } from "@/components/ui/icons";

import { cn } from "@/lib/cn";
import { SignerChip } from "@/components/ui/avatar";
import { NumberRoll } from "@/components/ui/number-roll";

import {
  summarizeSigner,
  type PrepareField,
  type PrepareShellSigner,
} from "./model";

/**
 * Who signs, as a pick list. The selected signer is who new fields are
 * for; each row counts their fields and says whether they have somewhere
 * to sign yet ("Signature ready" or "Signature needed").
 */
export function SignersPanel({
  fields,
  onSelect,
  selectedSignerId,
  signers,
}: {
  fields: readonly PrepareField[];
  onSelect: (signerId: string) => void;
  selectedSignerId: string;
  signers: readonly PrepareShellSigner[];
}) {
  return (
    <ul aria-label="Signers" className="flex flex-col gap-0.5">
      {signers.map((signer) => {
        const summary = summarizeSigner(fields, signer.id);
        const isActive = signer.id === selectedSignerId;

        return (
          <li key={signer.id}>
            <button
              aria-pressed={isActive}
              className={cn(
                "group/signer relative flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left outline-none",
                "transition-[background-color,scale] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.985] active:duration-(--dur-press)",
                "focus-visible:shadow-(--focus-ring)",
                isActive ? "bg-(--track)" : "hover:bg-(--hover)",
              )}
              onClick={() => onSelect(signer.id)}
              type="button"
            >
              <SignerChip
                className="min-w-0 flex-1"
                detail={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs",
                      summary.hasSignature
                        ? "text-(--secondary)"
                        : "text-(--warning)",
                    )}
                  >
                    {summary.hasSignature ? null : (
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-(--warning-dot)"
                      />
                    )}
                    <span>
                      {summary.hasSignature
                        ? "Signature ready"
                        : "Signature needed"}
                    </span>
                  </span>
                }
                index={signer.index}
                name={signer.name}
                order={signer.order}
                size="sm"
              />
              <span className="shrink-0 text-[0.8125rem] text-(--secondary) tabular-nums">
                <NumberRoll value={summary.count} />
                {summary.count === 1 ? " field" : " fields"}
              </span>
              {isActive ? (
                <CheckIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-(--accent)"
                />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
