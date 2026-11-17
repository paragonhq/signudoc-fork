import { Skeleton } from "@/components/ui/skeleton";

const DELAY = 150;

/**
 * The send flow while a step loads, in the shape of the step that is
 * coming (the progress bar, the question, the card, the actions), so
 * nothing jumps when the real page arrives.
 */
export function FlowSkeleton({
  label,
  variant,
}: {
  label: string;
  variant: "review" | "signers" | "upload";
}) {
  const withDocument = variant !== "upload";

  return (
    <div
      aria-busy="true"
      className={
        withDocument
          ? "mx-auto flex w-full max-w-[42rem] flex-col gap-7 sm:gap-8 lg:max-w-[70rem]"
          : "mx-auto flex w-full max-w-[42rem] flex-col gap-7 sm:gap-8"
      }
    >
      <span className="sr-only" role="status">
        {label}
      </span>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <span
              aria-hidden="true"
              className="h-1 w-5 rounded-full bg-(--track) sm:w-6"
              key={index}
            />
          ))}
        </div>
        <Skeleton className="h-3 w-20 rounded-full" delay={DELAY} />
      </div>

      <div
        className={
          withDocument
            ? "flex flex-col gap-7 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] xl:gap-16"
            : "contents"
        }
      >
        <div className="flex min-w-0 flex-col gap-7 sm:gap-8">
          <div className="flex flex-col gap-2.5">
            <Skeleton
              className="h-7 w-56 max-w-full rounded-lg"
              delay={DELAY}
            />
            <Skeleton
              className="h-4 w-full max-w-sm rounded-full"
              delay={DELAY}
            />
          </div>

          <div className="rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
            {variant === "upload" ? (
              <div className="flex flex-col gap-4 p-2 pb-5">
                <Skeleton
                  className="h-60 w-full rounded-[0.875rem] sm:h-72"
                  delay={DELAY}
                />
                <div className="flex flex-col gap-2 px-2 sm:px-4">
                  <Skeleton className="h-3 w-24 rounded-full" delay={DELAY} />
                  <Skeleton className="h-11 w-full rounded-xl" delay={DELAY} />
                </div>
              </div>
            ) : variant === "signers" ? (
              <div className="flex flex-col">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div className="flex gap-4 px-4 py-5 sm:px-5" key={index}>
                    <Skeleton className="size-8 rounded-full" delay={DELAY} />
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                        <Skeleton className="h-11 rounded-xl" delay={DELAY} />
                        <Skeleton className="h-11 rounded-xl" delay={DELAY} />
                      </div>
                      <Skeleton
                        className="h-7 w-64 rounded-full"
                        delay={DELAY}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 px-4 py-3 sm:px-5">
                  <Skeleton className="size-8 rounded-full" delay={DELAY} />
                  <Skeleton className="h-3 w-20 rounded-full" delay={DELAY} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center gap-5 p-4 sm:p-5">
                  <Skeleton
                    className="h-[5.5rem] w-[4.5rem] rounded-xl sm:h-28 sm:w-[5.75rem]"
                    delay={DELAY}
                  />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton
                      className="h-5 w-3/4 rounded-full"
                      delay={DELAY}
                    />
                    <Skeleton
                      className="h-3 w-1/3 rounded-full"
                      delay={DELAY}
                    />
                  </div>
                </div>
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    className="flex items-center gap-4 px-4 py-3.5 sm:px-5"
                    key={index}
                  >
                    <Skeleton className="size-8 rounded-full" delay={DELAY} />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton
                        className="h-3.5 w-32 rounded-full"
                        delay={DELAY}
                      />
                      <Skeleton
                        className="h-3 w-44 rounded-full"
                        delay={DELAY}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Skeleton className="h-10 w-24 rounded-full" delay={DELAY} />
          </div>
        </div>

        {withDocument ? (
          <div className="hidden flex-col gap-4 rounded-(--radius-card) bg-(--paper) p-4 shadow-(--shadow-card) lg:flex xl:p-5">
            <div className="rounded-(--radius-well) bg-(--surface) px-6 py-6 xl:px-8 xl:py-7">
              <Skeleton
                className="aspect-[17/22] w-full rounded-[0.5rem]"
                delay={DELAY}
              />
            </div>
            <Skeleton className="h-3 w-40 rounded-full" delay={DELAY} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
