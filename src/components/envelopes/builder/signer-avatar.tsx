import { cn } from "@/lib/cn";
import { getInitials } from "@/components/ui/avatar";

import { type PrepareShellSigner } from "./model";

/**
 * A signer's initials on their own soft tint, in their colour: the same
 * face the Documents list uses, so a person looks the same everywhere.
 */
export function SignerAvatar({
  className,
  signer,
}: {
  className?: string;
  signer: Pick<PrepareShellSigner, "color" | "name" | "tint">;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[0.6875rem] leading-none font-semibold",
        className,
      )}
      style={{ background: signer.tint, color: signer.color }}
    >
      {getInitials(signer.name)}
    </span>
  );
}
