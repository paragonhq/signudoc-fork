import { Skeleton } from "@/components/ui/skeleton";

/** The settings page while it loads: its header, navigation and cards. */
export default function SettingsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading settings"
      className="flex flex-col"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36" delay={150} />
        <Skeleton className="h-4 w-full max-w-sm" delay={150} />
      </div>
      <div className="mt-6 sm:mt-8 xl:grid xl:grid-cols-[14rem_minmax(0,1fr)] xl:gap-12">
        <div className="hidden flex-col gap-1 px-1 xl:flex">
          <Skeleton className="mx-3 mb-2 h-3.5 w-16" delay={150} />
          {Array.from({ length: 5 }, (_, index) => (
            <div className="flex h-10 items-center gap-3 pl-1.5" key={index}>
              <Skeleton className="size-7 rounded-[0.5rem]" delay={150} />
              <Skeleton className="h-3.5 w-24" delay={150} />
            </div>
          ))}
        </div>
        <div className="mb-8 xl:hidden">
          <Skeleton
            className="h-12 w-full rounded-full sm:max-w-sm"
            delay={150}
          />
        </div>
        <div className="flex max-w-[55rem] min-w-0 flex-col gap-8">
          <Skeleton className="mx-1 h-6 w-28" delay={150} />
          {Array.from({ length: 2 }, (_, index) => (
            <div className="flex flex-col gap-3" key={index}>
              <div className="flex flex-col gap-1.5 px-1">
                <Skeleton className="h-4 w-24" delay={150} />
                <Skeleton className="h-3.5 w-64 max-w-full" delay={150} />
              </div>
              <div className="flex flex-col rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
                {Array.from({ length: 2 }, (_, row) => (
                  <div
                    className="grid gap-3 px-4 py-4 sm:px-5 md:grid-cols-[minmax(0,1fr)_18rem] md:items-center md:gap-8"
                    key={row}
                  >
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-28" delay={150} />
                      <Skeleton className="h-3 w-56 max-w-full" delay={150} />
                    </div>
                    <Skeleton
                      className="h-(--field-h) w-full rounded-[0.875rem]"
                      delay={150}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
