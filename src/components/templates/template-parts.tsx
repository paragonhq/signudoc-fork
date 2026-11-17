import { cn } from "@/lib/cn";
import { getSignerPalette } from "@/components/envelopes/signer-palette";

/**
 * A role in signing order, as a soft pill in its signer colour: the same
 * colour its fields wear on the document. Reads "1. Contractor".
 */
export function RoleChip({
  className,
  index,
  name,
  showOrder = true,
  size = "md",
}: {
  className?: string;
  index: number;
  name: string;
  /** "1." before the name: on in lists, off where the order is said in words. */
  showOrder?: boolean;
  size?: "sm" | "md";
}) {
  const palette = getSignerPalette(index);

  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full font-medium whitespace-nowrap",
        size === "sm" ? "h-6 px-2.5 text-xs" : "h-7 px-3 text-[0.8125rem]",
        className,
      )}
      style={{ background: palette.tint, color: palette.color }}
    >
      {showOrder ? (
        <>
          <span className="tabular-nums opacity-70">{index + 1}.</span>{" "}
        </>
      ) : null}
      <span className="truncate">{name}</span>
    </span>
  );
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/** "Signs first", "Signs second", … */
export function signsInOrder(index: number) {
  return `Signs ${ORDINALS[index] ?? `${String(index + 1)}th`}`;
}
