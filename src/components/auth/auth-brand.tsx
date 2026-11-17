"use client";

import Link from "next/link";

import { AppIcon } from "@/components/brand/marks";
import { BrandLogo } from "@/components/layout/brand";
import { useBranding } from "@/components/layout/branding-provider";
import { cn } from "@/lib/cn";

/**
 * The install's mark above an auth or setup card: its own logo when it has
 * one, otherwise the app icon with the organization's name under it. One
 * link, named for the install.
 */
export function AuthBrand({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  const { logoUrl, productName } = useBranding();

  return (
    <div className={cn("flex justify-center", className)}>
      <Link
        aria-label={productName}
        className="flex min-w-0 flex-col items-center gap-3 rounded-2xl p-1 outline-none focus-visible:shadow-(--focus-ring)"
        href={href}
      >
        {logoUrl ? (
          <BrandLogo className="h-10 object-center" src={logoUrl} />
        ) : (
          <>
            <AppIcon className="size-12 drop-shadow-[0_6px_14px_rgb(var(--accent-rgb)/0.22)]" />
            <span className="max-w-[20rem] truncate text-[0.9375rem] leading-5 font-semibold tracking-[-0.015em] text-(--fg)">
              {productName}
            </span>
          </>
        )}
      </Link>
    </div>
  );
}
