import { Skeleton } from "@/components/ui/skeleton";

/**
 * Any signed-in page while it loads: the page anatomy (eyebrow, display
 * title, one line, a toolbar, a sheet of rows), held back 150ms so quick
 * loads never flash it.
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 sm:gap-8">
      <span className="sr-only" role="status">
        Loading
      </span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-2.5 w-32" delay={150} />
        <Skeleton className="h-9 w-56 sm:h-11" delay={150} />
        <Skeleton className="h-3 w-80 max-w-full" delay={150} />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton
            className="h-(--control-h) w-64 max-w-full rounded-md"
            delay={150}
          />
          <span className="hidden flex-1 sm:block" />
          <Skeleton
            className="h-(--control-h) w-full rounded-md sm:w-64"
            delay={150}
          />
        </div>
        <div className="overflow-hidden rounded-xl border border-(--border) bg-(--paper)">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="flex h-14 items-center gap-4 border-b border-(--border) px-4 last:border-b-0"
              key={index}
            >
              <Skeleton
                className="h-3"
                delay={150}
                style={{ width: `${String(30 + ((index * 13) % 28))}%` }}
              />
              <span className="flex-1" />
              <Skeleton className="h-5 w-20 rounded-xs" delay={150} />
              <Skeleton className="h-2.5 w-16 max-sm:hidden" delay={150} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
