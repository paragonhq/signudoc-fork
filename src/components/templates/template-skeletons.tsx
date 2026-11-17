import { Skeleton } from "@/components/ui/skeleton";

/** The library while it loads: the header and a few quiet cards. */
export function TemplatesLibrarySkeleton() {
  return (
    <div aria-busy="true" className="section-stack">
      <span className="sr-only" role="status">
        Loading templates
      </span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-5 w-64" variant="line" />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <li
            className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)"
            key={index}
          >
            <div className="h-52 bg-(--surface) max-sm:h-32" />
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-5 w-2/3" variant="line" />
              <Skeleton className="h-4 w-1/2" variant="line" />
              <Skeleton className="mt-2 h-6 w-24" variant="line" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A template's page (and "use") while it loads: header, page, aside. */
export function TemplateDetailSkeleton() {
  return (
    <div aria-busy="true" className="section-stack">
      <span className="sr-only" role="status">
        Loading the template
      </span>
      <div className="flex flex-col gap-5">
        <Skeleton className="h-5 w-24" variant="line" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-5 w-56" variant="line" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex justify-center rounded-(--radius-card) bg-[rgb(var(--fg-rgb)/0.04)] px-5 py-6 sm:px-10 sm:py-10">
          <div className="aspect-[17/22] w-full max-w-[26rem] rounded-[0.5rem] bg-(--paper)" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 rounded-(--radius-card)" />
          <Skeleton className="h-52 rounded-(--radius-card)" />
        </div>
      </div>
    </div>
  );
}
