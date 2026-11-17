import type { ReactNode } from "react";
import { connection } from "next/server";

import { BrandingProvider } from "@/components/layout/branding-provider";
import { PublicLegalFooter } from "@/components/layout/public-legal-links";
import { PublicHeader } from "@/components/public/public-header";
import { PublicToc } from "@/components/public/public-toc";
import { buildBranding, type Branding } from "@/lib/branding";
import { getBranding, resolveSettings } from "@/lib/settings";

type PublicDocumentShellProps = {
  children: ReactNode;
  description: string;
  /** For policies. A page that is a tool, not a policy, leaves it out. */
  lastUpdated?: string;
  title: string;
};

async function loadBranding(): Promise<Branding> {
  try {
    return await getBranding();
  } catch {
    // A page of text is not worth failing over a database that cannot be
    // reached. This is the install before anything was saved: still its own
    // footer links, and never the hosted service's.
    return buildBranding(resolveSettings(null));
  }
}

// These pages sit outside the layouts that hand branding down, and some of
// them are on every install: the signer privacy notice, what signatures are
// for, document verification and the expired download link. So the shell
// looks up what this install calls itself. Without that, such a page would
// carry the hosted service's name and link to pages only it has.
export async function PublicDocumentShell({
  children,
  description,
  lastUpdated,
  title,
}: PublicDocumentShellProps) {
  // Read when the page is requested, so one build serves any install.
  await connection();

  const branding = await loadBranding();

  return (
    <BrandingProvider branding={branding}>
      <PublicDocumentPage
        description={description}
        lastUpdated={lastUpdated}
        title={title}
      >
        {children}
      </PublicDocumentPage>
    </BrandingProvider>
  );
}

/*
 * Reading layout: one 680px column on the Bond
 * page, a clear title and one line under it, body text set for reading
 * with whitespace (not rules) between sections. Long policies get a quiet
 * "On this page" disclosure, and on very wide screens a contents rail in
 * the left margin that leaves the column centred. Tool pages (verify, an
 * expired download) use the same frame with their one card in the body;
 * the prose styles only reach `section` children, never the tool.
 */
const bodyClassName = [
  "flex flex-col gap-12 text-base leading-7 text-(--fg)",
  "[&>section]:flex [&>section]:flex-col [&>section]:gap-3",
  "[&>section_h2]:scroll-mt-24 [&>section_h2]:text-xl [&>section_h2]:leading-7 [&>section_h2]:font-semibold [&>section_h2]:tracking-[-0.02em] [&>section_h2]:text-(--fg)",
  "[&>section_h3]:scroll-mt-24 [&>section_h3]:pt-2 [&>section_h3]:text-base [&>section_h3]:font-semibold [&>section_h3]:text-(--fg)",
  "[&>section_p]:text-[rgb(var(--fg-rgb)/0.78)] [&>section_li]:text-[rgb(var(--fg-rgb)/0.78)]",
  "[&>section_strong]:font-medium [&>section_strong]:text-(--fg)",
  "[&>section_ul]:flex [&>section_ul]:flex-col [&>section_ul]:gap-2 [&>section_ul]:pl-5 [&>section_ul_li]:pl-1 [&>section_ul_li]:marker:text-(--dot-neutral)",
  "[&>section_ol]:flex [&>section_ol]:flex-col [&>section_ol]:gap-2 [&>section_ol]:pl-5 [&>section_ol_li]:pl-1 [&>section_ol_li]:marker:text-(--secondary)",
  "[&>section_a]:font-medium [&>section_a]:text-(--accent-ink) [&>section_a]:underline [&>section_a]:decoration-[rgb(var(--accent-rgb)/0.3)] [&>section_a]:underline-offset-4 [&>section_a:hover]:decoration-current",
  "[&>section_code]:rounded-md [&>section_code]:bg-(--surface-strong) [&>section_code]:px-1.5 [&>section_code]:py-0.5 [&>section_code]:font-mono [&>section_code]:text-[0.875rem] [&>section_code]:text-(--fg)",
].join(" ");

function PublicDocumentPage({
  children,
  description,
  lastUpdated,
  title,
}: PublicDocumentShellProps) {
  return (
    <div className="flex min-h-dvh flex-col text-(--fg)">
      <PublicHeader />

      <main className="flex-1 px-5 pt-10 pb-20 sm:px-10 sm:pt-16 sm:pb-28">
        <div className="mx-auto grid max-w-[42.5rem] grid-cols-1 xl:max-w-none xl:grid-cols-[minmax(0,1fr)_minmax(0,42.5rem)_minmax(0,1fr)] xl:gap-x-16">
          <aside className="hidden xl:block">
            <PublicToc variant="rail" />
          </aside>

          <article className="min-w-0" data-animate="enter">
            <header className="flex flex-col gap-3 pb-10">
              <h1 className="text-[1.875rem] leading-[1.15] font-semibold tracking-[-0.035em] text-balance text-(--fg) sm:text-[2.5rem] sm:leading-[1.1]">
                {title}
              </h1>
              <p className="text-[1.0625rem] leading-7 text-pretty text-(--secondary)">
                {description}
              </p>
              {lastUpdated ? (
                <p className="text-[0.8125rem] font-medium text-(--secondary)">
                  Last updated {lastUpdated}
                </p>
              ) : null}
            </header>

            <PublicToc variant="fold" />

            <div className={bodyClassName} data-public-body>
              {children}
            </div>
          </article>
        </div>
      </main>

      <PublicLegalFooter />
    </div>
  );
}
