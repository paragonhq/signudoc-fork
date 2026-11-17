"use client";

import { AppIcon } from "@/components/brand/marks";
import { BrandLogo } from "@/components/layout/brand";
import { useBranding } from "@/components/layout/branding-provider";
import { cn } from "@/lib/cn";

/**
 * Who sent this: the organization's logo, or the app icon and its name.
 * Not a link: a signer tapping the header should never leave the document.
 */
export function OrgMark({
  className,
  compact = false,
}: {
  className?: string;
  /** Below 640px: the icon without the name, a smaller logo. */
  compact?: boolean;
}) {
  const { logoUrl, productName } = useBranding();

  if (logoUrl) {
    return (
      <span
        aria-label={productName}
        className={cn("inline-flex min-w-0 items-center", className)}
        role="img"
      >
        <BrandLogo
          className={compact ? "h-7 max-sm:max-w-24 sm:h-8" : "h-8"}
          src={logoUrl}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 text-(--fg)",
        className,
      )}
    >
      <AppIcon className={compact ? "size-7 sm:size-8" : "size-8"} />
      <span
        className={cn(
          "truncate text-[0.9375rem] font-semibold tracking-[-0.02em]",
          compact && "max-sm:sr-only",
        )}
      >
        {productName}
      </span>
    </span>
  );
}
