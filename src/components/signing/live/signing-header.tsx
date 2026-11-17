"use client";

import { DownloadIcon, EllipsisIcon, XIcon } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { OrgMark } from "../frame/org-mark";

/**
 * The signing header: who sent it, what it is, and the two quiet ways out
 * (keep a copy, decline). On a desktop they sit as small ghost actions; on
 * a phone they wait behind "More" so the document keeps the room. Sticky,
 * on the page's own ground, with no rule under it.
 */
export function SigningHeader({
  disabled,
  documentUrl,
  envelopeTitle,
  onDecline,
  senderName,
}: {
  disabled: boolean;
  documentUrl: string;
  envelopeTitle: string;
  onDecline: () => void;
  senderName: string;
}) {
  const downloadHref = `${documentUrl}?download=1`;

  return (
    <header className="sticky top-0 z-40 bg-[rgb(var(--page-rgb)/0.92)] pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="page-width flex h-16 items-center gap-3 sm:gap-4">
        <OrgMark className="shrink-0" compact />
        <span
          aria-hidden="true"
          className="h-6 w-px shrink-0 bg-(--divider) max-sm:hidden"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] leading-5 font-semibold tracking-[-0.015em] text-(--fg)">
            {envelopeTitle}
          </p>
          <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
            From {senderName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 max-sm:hidden">
          <Button asChild size="sm" variant="ghost">
            <a download="document.pdf" href={downloadHref}>
              <DownloadIcon aria-hidden="true" />
              Download PDF
            </a>
          </Button>
          <Button
            disabled={disabled}
            onClick={onDecline}
            size="sm"
            variant="ghost"
          >
            Decline
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <IconButton
              aria-label="More"
              className="bg-(--paper) shadow-(--ring-soft) sm:hidden"
              tooltip={false}
            >
              <EllipsisIcon />
            </IconButton>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5">
            <a
              className="flex min-h-11 items-center gap-3 rounded-[0.625rem] px-3 text-[0.9375rem] font-medium text-(--fg) outline-none hover:bg-(--hover) focus-visible:bg-(--hover)"
              download="document.pdf"
              href={downloadHref}
            >
              <DownloadIcon
                aria-hidden="true"
                className="size-[1.125rem] text-(--secondary)"
                strokeWidth={1.75}
              />
              Download PDF
            </a>
            <PopoverClose asChild>
              <button
                className="flex min-h-11 w-full items-center gap-3 rounded-[0.625rem] px-3 text-left text-[0.9375rem] font-medium text-(--danger) outline-none hover:bg-(--hover) focus-visible:bg-(--hover) disabled:opacity-50"
                disabled={disabled}
                onClick={onDecline}
                type="button"
              >
                <XIcon
                  aria-hidden="true"
                  className="size-[1.125rem]"
                  strokeWidth={1.75}
                />
                Decline
              </button>
            </PopoverClose>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
