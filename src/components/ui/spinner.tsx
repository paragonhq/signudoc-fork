import { cn } from "@/lib/cn";

/**
 * A small arc that turns. Decorative: the control that is busy carries
 * `aria-busy` and keeps its own label.
 */
export function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-4 shrink-0 animate-spin", className)}
      data-slot="spinner"
      fill="none"
      viewBox="0 0 16 16"
      {...props}
    >
      <circle
        cx="8"
        cy="8"
        opacity="0.22"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M14.25 8A6.25 6.25 0 0 0 8 1.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
