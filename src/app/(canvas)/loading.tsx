import { Skeleton } from "@/components/ui/skeleton";

/**
 * The builder's shape while it loads: the light bar, the page on the desk
 * and the white dock floating under it. Sized like the real thing so
 * nothing jumps when it arrives.
 */
export default function CanvasLoading() {
  return (
    <div
      aria-busy="true"
      className="flex h-dvh flex-col overflow-hidden bg-(--page)"
    >
      <span className="sr-only">Loading the document…</span>
      <div className="flex h-16 shrink-0 items-center gap-3 px-3 sm:px-4">
        <Skeleton className="size-10 rounded-full" delay={150} />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-44 rounded-full" delay={150} />
          <Skeleton className="h-3 w-24 rounded-full" delay={150} />
        </div>
        <Skeleton className="ml-auto h-10 w-24 rounded-full" delay={150} />
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-3 pt-16 pb-24 sm:px-10"
        data-paper-grid
      >
        <div className="aspect-[17/22] h-full max-h-full max-w-full rounded-[3px] bg-(--paper) p-[6%] shadow-[0_0_0_1px_rgb(var(--fg-rgb)/0.04),0_16px_40px_-16px_rgb(var(--fg-rgb)/0.18)]">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-3 w-1/2 rounded-full" delay={150} />
            <Skeleton className="mt-3 h-2 w-full rounded-full" delay={150} />
            <Skeleton className="h-2 w-11/12 rounded-full" delay={150} />
            <Skeleton className="h-2 w-4/5 rounded-full" delay={150} />
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 h-[3.25rem] w-[min(34rem,calc(100%-1rem))] -translate-x-1/2 rounded-full bg-(--paper) shadow-(--shadow-pop)" />
      </div>
    </div>
  );
}
