import { Skeleton } from "@/components/ui/skeleton";

/** A day of the feed while it loads: a label and a card of quiet rows. */
export function ActivityListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-2.5">
      <span className="sr-only" role="status">
        Loading activity
      </span>
      <Skeleton className="ml-1 h-3 w-16 rounded-full" delay={150} />
      <div className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
        {Array.from({ length: rows }, (_, index) => (
          <div
            className="flex h-[4.25rem] items-center gap-4 px-4 sm:px-5"
            key={index}
          >
            <Skeleton className="size-9 rounded-full" delay={150} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton
                className="h-3 rounded-full"
                delay={150}
                style={{ width: `${String(46 + ((index * 17) % 30))}%` }}
              />
              <Skeleton
                className="h-2.5 rounded-full"
                delay={150}
                style={{ width: `${String(20 + ((index * 11) % 16))}%` }}
              />
            </div>
            <Skeleton className="h-3 w-14 rounded-full" delay={150} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The whole page while the route loads. */
export function ActivityPageSkeleton() {
  return (
    <div className="section-stack">
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-7 w-32 rounded-lg" delay={150} />
        <Skeleton className="h-3.5 w-72 max-w-full rounded-full" delay={150} />
      </div>
      <Skeleton className="h-10 w-96 max-w-full rounded-full" delay={150} />
      <ActivityListSkeleton />
    </div>
  );
}
