"use client";

import Link from "next/link";

import { AppIcon } from "@/components/brand/marks";
import { BrandLogo } from "@/components/layout/brand";
import { useBranding } from "@/components/layout/branding-provider";
import { cn } from "@/lib/cn";

/**
 * The lockup at the top of every page outside the app: the install's own logo when it has one,
 * otherwise the app icon with the organization's (or SignuDoc's) name. One
 * link, named for the install, so assistive tech hears the name whatever
 * is drawn.
 */
export function PublicBrand({
  className,
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { logoUrl, productName } = useBranding();
  const linkClass = cn(
    "inline-flex min-w-0 items-center rounded-lg outline-none transition-opacity duration-(--dur-hover) ease-(--ease-out) hover:opacity-80 focus-visible:shadow-(--focus-ring)",
    className,
  );

  if (logoUrl) {
    return (
      <Link aria-label={productName} className={linkClass} href={href}>
        <BrandLogo
          className={size === "lg" ? "h-10" : size === "sm" ? "h-6" : "h-8"}
          src={logoUrl}
        />
      </Link>
    );
  }

  return (
    <Link
      aria-label={productName}
      className={cn(linkClass, "gap-2.5 text-(--fg)")}
      href={href}
    >
      <AppIcon
        className={cn(
          "rounded-[0.5rem]",
          size === "lg" ? "size-9" : size === "sm" ? "size-6" : "size-7",
        )}
      />
      <span className="max-w-[52vw] truncate text-[0.9375rem] font-semibold tracking-[-0.015em] sm:max-w-[22rem]">
        {productName}
      </span>
    </Link>
  );
}
