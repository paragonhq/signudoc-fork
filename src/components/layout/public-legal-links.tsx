"use client";

import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/icons";

import { AppIcon } from "@/components/brand/marks";
import { useBranding } from "@/components/layout/branding-provider";
import { SIGNUDOC_NAME, SIGNUDOC_URL } from "@/lib/branding";
import { PUBLIC_COPYRIGHT_YEAR, publicFooterLinks } from "@/lib/legal";
import { cn } from "@/lib/cn";
import { PERMITTED_USE_PATH } from "@/lib/permitted-uses";

type PublicLegalFooterProps = {
  /** Centre everything in one column (the auth and setup pages). */
  centered?: boolean;
  className?: string;
  /** Replaces the inner width wrapper (page-width by default). */
  contentClassName?: string;
  labelVariant?: "long" | "short";
  linkClassName?: string;
};

type FooterLink = {
  external: boolean;
  href: string;
  label: string;
};

const defaultLinkClassName =
  "inline-flex min-h-8 items-center gap-1 rounded-md text-[0.8125rem] font-medium text-(--secondary) outline-none transition-colors duration-(--dur-hover) ease-(--ease-out) hover:text-(--fg) focus-visible:shadow-(--focus-ring) pointer-coarse:min-h-10";

/**
 * The footer under every page outside the app: the
 * install's legal links, the copyright line and, on self-hosted installs,
 * the "Powered by" credit with the app icon. Small and quiet, on the page
 * itself: no rule, no band.
 */
export function PublicLegalFooter({
  centered = false,
  className = "",
  contentClassName,
  labelVariant = "short",
  linkClassName,
}: PublicLegalFooterProps) {
  const branding = useBranding();
  const resolvedLinkClassName = linkClassName ?? defaultLinkClassName;
  // The hosted service links to its own pages. Any other install links to
  // whatever terms and privacy policy its organization has published.
  const links: FooterLink[] = branding.hosted
    ? publicFooterLinks.map((link) => ({
        external: false,
        href: link.href,
        label: labelVariant === "long" ? link.longLabel : link.shortLabel,
      }))
    : [
        ...(branding.termsUrl
          ? [
              {
                external: true,
                href: branding.termsUrl,
                label: labelVariant === "long" ? "Terms of Service" : "Terms",
              },
            ]
          : []),
        // Without the organization's own policy, signers still get a
        // notice, built from the install's settings.
        branding.privacyUrl
          ? {
              external: true,
              href: branding.privacyUrl,
              label: labelVariant === "long" ? "Privacy Policy" : "Privacy",
            }
          : {
              external: false,
              href: "/signer-privacy",
              label: labelVariant === "long" ? "Privacy notice" : "Privacy",
            },
      ];

  // Which documents may be signed here: on every install.
  links.push({
    external: false,
    href: PERMITTED_USE_PATH,
    label: labelVariant === "long" ? "What this is for" : "E-signatures",
  });

  return (
    <footer className={cn("relative z-10", className)}>
      <div className={cn(contentClassName ?? "page-width")}>
        <div
          className={cn(
            "flex flex-col gap-3 py-6",
            centered
              ? "items-center text-center sm:flex-row sm:justify-center sm:gap-6"
              : "sm:flex-row sm:items-center sm:justify-between sm:gap-6",
          )}
        >
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-4 gap-y-1",
              centered && "justify-center",
            )}
          >
            {branding.hosted ? null : (
              <a
                className={cn(resolvedLinkClassName, "gap-2")}
                href={SIGNUDOC_URL}
                rel="noreferrer"
                target="_blank"
              >
                <AppIcon className="size-4 rounded-[0.3rem]" />
                <span>Powered by {SIGNUDOC_NAME}</span>
              </a>
            )}
            <p className="text-[0.8125rem] text-(--secondary)">
              © {PUBLIC_COPYRIGHT_YEAR} {branding.productName}
            </p>
          </div>

          {links.length > 0 ? (
            <nav aria-label="Footer">
              <ul
                className={cn(
                  "flex flex-wrap items-center gap-x-4 gap-y-1",
                  centered && "justify-center",
                )}
              >
                {links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        className={resolvedLinkClassName}
                        href={link.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {link.label}
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-3 stroke-[1.75]"
                        />
                      </a>
                    ) : (
                      <Link className={resolvedLinkClassName} href={link.href}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
