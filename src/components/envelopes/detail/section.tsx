import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * A titled block on the document page: a 16px title, an optional one-line
 * description, then its card. Titles sit on the page, not in the card.
 */
export function Section({
  action,
  children,
  className,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  title: string;
}) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;

  return (
    <section
      aria-labelledby={id}
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <div className="flex items-end justify-between gap-3 px-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2
            className="text-base leading-6 font-semibold tracking-[-0.015em] text-(--fg)"
            id={id}
          >
            {title}
          </h2>
          {description ? (
            <p className="text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
