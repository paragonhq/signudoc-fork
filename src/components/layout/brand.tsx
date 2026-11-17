"use client";

import Link from "next/link";

import { AppIcon } from "@/components/brand/marks";
import { useBranding } from "@/components/layout/branding-provider";
import { cn } from "@/lib/cn";

type BrandProps = {
  className?: string;
  compact?: boolean;
  href?: string;
  labelClassName?: string;
};

export function Brand({
  className = "",
  compact = false,
  href = "/",
  labelClassName = "",
}: BrandProps) {
  const { logoUrl, productName } = useBranding();

  // An install's own logo stands in for the mark and the name. The link
  // still carries the name, for people who cannot see the picture.
  if (logoUrl) {
    return (
      <Link
        aria-label={productName}
        className={cn("inline-flex min-w-0 items-center", className)}
        href={href}
      >
        <BrandLogo compact={compact} src={logoUrl} />
      </Link>
    );
  }

  return (
    <Link
      aria-label={productName}
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 text-(--fg)",
        className,
      )}
      href={href}
    >
      <BrandMark />
      {!compact ? (
        <span
          className={cn(
            "max-w-[52vw] truncate text-base font-semibold tracking-[-0.02em] sm:max-w-[22rem]",
            labelClassName,
          )}
        >
          {productName}
        </span>
      ) : null}
    </Link>
  );
}

/** The install's own logo, kept to the height of the header. */
export function BrandLogo({
  className = "",
  compact = false,
  src,
}: {
  className?: string;
  compact?: boolean;
  src: string;
}) {
  return (
    // Served by this site at an address that changes with the image:
    // next/image would only add a second copy to keep in step.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className={cn(
        "block h-8 w-auto object-contain object-left",
        compact ? "max-w-10" : "max-w-[44vw] sm:max-w-44",
        className,
      )}
      decoding="async"
      src={src}
    />
  );
}

/** The app icon S, in the accent. Decorative: the link carries the name. */
export function BrandMark({ className = "" }: { className?: string }) {
  return <AppIcon className={cn("size-7", className)} />;
}

/**
 * The workspace brand in the app shell: the app
 * icon S and the organization's name, quietly. An install with its own
 * logo shows the logo instead. The link carries the product name for
 * assistive tech either way. (`tone` is accepted for older callers.)
 */
export function PlateBrand({
  className = "",
  href = "/",
  showName = true,
  tone: _tone,
}: {
  className?: string;
  href?: string;
  /** Show the name beside the icon (off in tight headers). */
  showName?: boolean;
  /** Accepted for older callers; the shell is light everywhere now. */
  tone?: "carbon" | "paper";
}) {
  const { logoUrl, productName } = useBranding();

  void _tone;

  if (logoUrl) {
    return (
      <Link
        aria-label={productName}
        className={cn(
          "inline-flex min-w-0 items-center rounded-lg outline-none focus-visible:shadow-(--focus-ring)",
          className,
        )}
        href={href}
      >
        <BrandLogo className="h-7" src={logoUrl} />
      </Link>
    );
  }

  return (
    <Link
      aria-label={productName}
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:shadow-(--focus-ring)",
        className,
      )}
      href={href}
    >
      <AppIcon className="size-7 rounded-[0.5rem]" />
      {showName ? (
        <span className="min-w-0 truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-(--fg)">
          {productName}
        </span>
      ) : null}
    </Link>
  );
}
