import { Skeleton } from "@/components/ui/skeleton";

const DELAY = 150;

/** The Contacts page while it loads, in the shape of the list to come. */
export function ContactsSkeleton() {
  return (
    <div aria-busy="true" className="section-stack">
      <span className="sr-only" role="status">
        Loading contacts
      </span>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-7 w-36 rounded-lg" delay={DELAY} />
        <Skeleton className="h-4 w-64 max-w-full rounded-full" delay={DELAY} />
      </div>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-40 rounded-full" delay={DELAY} />
        <div className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="flex min-h-[4.5rem] items-center gap-4 px-4 py-3 sm:px-5"
              key={index}
            >
              <Skeleton className="size-10 rounded-full" delay={DELAY} />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-36 rounded-full" delay={DELAY} />
                <Skeleton className="h-3 w-48 rounded-full" delay={DELAY} />
              </div>
              <Skeleton
                className="hidden h-3 w-44 rounded-full sm:block"
                delay={DELAY}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
