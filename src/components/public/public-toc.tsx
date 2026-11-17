"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";

import { SPRING_SNAPPY } from "@/components/ui/motion-tokens";
import { cn } from "@/lib/cn";

type TocItem = { id: string; text: string };

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/^\d+\.\s*/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "section"
  );
}

/**
 * Reads the h2s inside `[data-public-body]` once the page has mounted,
 * gives each an id (unless it has one), and returns them for the contents.
 */
function useHeadings(minimum: number) {
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("[data-public-body] h2"),
    );
    const used = new Set<string>();
    const found = headings.map((heading) => {
      let id = heading.id || slugify(heading.textContent ?? "");

      while (used.has(id)) {
        id = `${id}-x`;
      }

      used.add(id);
      heading.id = id;

      return { id, text: (heading.textContent ?? "").trim() };
    });

    // Read from the DOM after it rendered: nothing to subscribe to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(found.length >= minimum ? found : []);
  }, [minimum]);

  return items;
}

/** Which heading the reader is in: the last one above the top third. */
function useActiveHeading(items: TocItem[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }

    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting);
        }

        const firstVisible = items.find((item) => visible.get(item.id));

        if (firstVisible) {
          setActive(firstVisible.id);
        }
      },
      { rootMargin: "-72px 0px -60% 0px" },
    );

    for (const item of items) {
      const node = document.getElementById(item.id);

      if (node) {
        observer.observe(node);
      }
    }

    return () => observer.disconnect();
  }, [items]);

  return active ?? items[0]?.id ?? null;
}

/**
 * "On this page" for long documents: a sticky rail of the h2s on wide
 * screens with a marker that slides to the section being read, and a folded
 * list above the text on narrower ones. Renders nothing for short pages.
 */
export function PublicToc({
  minimum = 3,
  variant,
}: {
  minimum?: number;
  /** `rail`: the sticky column (wide screens). `fold`: above the text. */
  variant: "fold" | "rail";
}) {
  const items = useHeadings(minimum);
  const active = useActiveHeading(items);
  const reduceMotion = useReducedMotion();

  if (items.length === 0) {
    return null;
  }

  function jump(id: string) {
    const node = document.getElementById(id);

    if (!node) {
      return;
    }

    node.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    history.replaceState(null, "", `#${id}`);
  }

  const list = (variant: "rail" | "fold") => (
    <ol className={cn("space-y-0.5", variant === "rail" && "relative")}>
      {items.map((item) => {
        const isActive = item.id === active;

        return (
          <li className="relative" key={item.id}>
            {variant === "rail" && isActive ? (
              <motion.span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 -left-px w-0.5 rounded-full bg-(--accent)"
                layoutId="public-toc-marker"
                transition={reduceMotion ? { duration: 0 } : SPRING_SNAPPY}
              />
            ) : null}
            <a
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "block rounded-xs py-1.5 text-[0.8125rem] leading-5 text-pretty outline-none transition-colors duration-(--dur-hover) ease-(--ease-out) focus-visible:shadow-(--focus-ring)",
                variant === "rail" ? "pl-4" : "pl-0",
                isActive
                  ? "font-medium text-(--fg)"
                  : "text-(--secondary) hover:text-(--fg)",
              )}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                jump(item.id);
              }}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ol>
  );

  if (variant === "rail") {
    return (
      <nav
        aria-label="On this page"
        className="sticky top-24 ml-auto hidden max-h-[calc(100dvh-8rem)] w-full max-w-[13rem] overflow-y-auto pb-6 xl:block"
        data-toc-rail
      >
        <p className="mb-3 text-[0.8125rem] font-medium text-(--fg)">
          On this page
        </p>
        <div className="border-l border-(--divider)">{list("rail")}</div>
      </nav>
    );
  }

  return (
    <details className="group mb-12 rounded-(--radius-well) bg-(--paper) shadow-(--shadow-card) xl:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-(--radius-well) px-4 text-sm font-medium text-(--fg) outline-none focus-visible:shadow-(--focus-ring) [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          On this page
          <span className="font-normal text-(--secondary) tabular-nums">
            {items.length} sections
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 stroke-[1.75] text-(--secondary) transition-transform duration-(--dur-move) ease-(--ease-out) group-open:rotate-180"
        />
      </summary>
      <nav aria-label="Contents" className="px-4 pb-3">
        {list("fold")}
      </nav>
    </details>
  );
}
