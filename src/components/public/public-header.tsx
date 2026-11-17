"use client";

import { useEffect, useState, type ReactNode } from "react";

import { PublicSessionMenu } from "@/components/layout/public-session-menu";
import { PublicBrand } from "@/components/public/public-brand";
import { cn } from "@/lib/cn";

/**
 * The top of a public page: the brand on the left, the account (when signed
 * in) on the right. It sticks, and a faint divider appears under it only
 * once the page has scrolled, so at rest it sits flush on the Bond page.
 */
export function PublicHeader({
  children,
  className,
}: {
  /** Shown on the right when nobody is signed in. */
  children?: ReactNode;
  className?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-[rgb(var(--page-rgb)/0.86)] backdrop-blur-md transition-[border-color] duration-(--dur-hover) ease-(--ease-out)",
        scrolled ? "border-(--divider)" : "border-transparent",
        className,
      )}
    >
      <div className="page-width flex h-16 items-center justify-between gap-4">
        <PublicBrand />
        <PublicSessionMenu>{children}</PublicSessionMenu>
      </div>
    </header>
  );
}
