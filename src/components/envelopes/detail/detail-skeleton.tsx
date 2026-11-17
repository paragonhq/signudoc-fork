"use client";

import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

const card = "rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)";

/**
 * The document page while it loads, shaped like the real thing so nothing
 * jumps when it arrives: the page and title, the signers, the side cards.
 * Skeletons wait 150ms to appear.
 */
export function EnvelopeDetailSkeleton() {
  const pathname = usePathname();

  // This loading state also covers the routes nested under the envelope
  // (signers, review); those get a plain page skeleton, not this layout.
  if (pathname && !/^\/envelopes\/[^/]+\/?$/.test(pathname)) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading page"
        className="section-stack"
        role="status"
      >
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-7 w-56 rounded-lg" delay={150} />
          <Skeleton
            className="h-3.5 w-72 max-w-full rounded-full"
            delay={150}
          />
        </div>
        <div className={`${card} flex flex-col gap-4 p-5`}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              className="h-3 rounded-full"
              delay={150}
              key={index}
              style={{ width: `${String(80 - index * 12)}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-busy="true"
      aria-label="Loading envelope"
      className="flex flex-col gap-6 sm:gap-8"
      role="status"
    >
      <div className="flex flex-col gap-4 sm:gap-5">
        <Skeleton className="h-4 w-24 rounded-full" delay={150} />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-8 w-full max-w-sm rounded-lg" delay={150} />
          <Skeleton className="h-4 w-64 max-w-full rounded-full" delay={150} />
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-10">
        {/* The document on its desk (wide screens only). */}
        <div className="hidden rounded-(--radius-card) bg-[rgb(var(--fg-rgb)/0.04)] px-6 pt-14 pb-6 lg:flex lg:justify-center">
          <Skeleton
            className="aspect-[17/22] w-full max-w-[38rem] rounded-[0.5rem] lg:max-w-[min(38rem,calc((100dvh-13rem)*0.77))]"
            delay={150}
          />
        </div>
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
            <Skeleton className="h-6 w-20 rounded-full" delay={150} />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-56 rounded-full" delay={150} />
              <Skeleton className="h-4 w-32 rounded-full" delay={150} />
            </div>
            <Skeleton className="mt-1 h-1.5 w-full rounded-full" delay={150} />
            <div className="mt-1 flex gap-2">
              <Skeleton className="h-11 flex-1 rounded-full" delay={150} />
              <Skeleton className="size-11 rounded-full" delay={150} />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="ml-1 h-4 w-20 rounded-full" delay={150} />
            <div className={`${card} px-5 py-2`}>
              {Array.from({ length: 2 }, (_, index) => (
                <div className="flex items-center gap-3.5 py-3" key={index}>
                  <Skeleton className="size-9 rounded-full" delay={150} />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-36 rounded-full" delay={150} />
                    <Skeleton className="h-2.5 w-48 rounded-full" delay={150} />
                  </div>
                  <Skeleton className="h-3 w-14 rounded-full" delay={150} />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-36 rounded-(--radius-card)" delay={150} />
        </div>
      </div>
      <span className="sr-only">Loading envelope</span>
    </div>
  );
}
