"use client";

import { ChevronRightIcon, SendIcon } from "@/components/ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PaperThumb } from "@/components/dashboard/paper-thumb";
import { Button } from "@/components/ui/button";
import { StatusFlag } from "@/components/ui/status-flag";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";
import { cn } from "@/lib/cn";
import { describeAgo } from "@/lib/contact-words";
import type { ContactDocument, ContactWithDocuments } from "@/lib/contacts";

import { rememberSendTo } from "./contact-data";
import { ContactAvatar } from "./contact-parts";

type ContactTrayProps = {
  contact: ContactWithDocuments | null;
  now: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function describeDocument(document: ContactDocument, now: number) {
  const role = document.role === "cc" ? "Gets a copy" : "Signs";

  if (document.sentAt === null) {
    return `${role} · not sent yet`;
  }

  return `${role} · sent ${describeAgo(document.sentAt, now)}`;
}

/**
 * One contact, in a tray: who they are, how their documents stand at a
 * glance, the most recent of those documents to open, and the one thing
 * you are most likely here to do: send them another.
 */
export function ContactTray({
  contact,
  now,
  onOpenChange,
  open,
}: ContactTrayProps) {
  const router = useRouter();

  function sendThemADocument() {
    if (!contact) {
      return;
    }

    rememberSendTo({ email: contact.email, name: contact.name });
    onOpenChange(false);
    router.push("/envelopes/new");
  }

  const stats = contact
    ? [
        {
          label: contact.documentCount === 1 ? "Document" : "Documents",
          value: contact.documentCount,
        },
        { label: "Completed", value: contact.statusMix.completed },
        { label: "Waiting", value: contact.statusMix.waiting },
      ]
    : [];

  return (
    <Tray onOpenChange={onOpenChange} open={open}>
      <TrayContent size="md">
        {contact ? (
          <>
            <TrayHeader>
              <div className="flex min-w-0 items-center gap-3.5">
                <ContactAvatar
                  email={contact.email}
                  name={contact.name}
                  size="xl"
                />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <TrayTitle className="truncate">{contact.name}</TrayTitle>
                  <TrayDescription className="truncate">
                    {contact.email}
                  </TrayDescription>
                </div>
              </div>
            </TrayHeader>

            <TrayBody className="flex flex-col gap-5">
              <dl className="grid grid-cols-3 gap-2">
                {stats.map((stat) => (
                  <div
                    className="flex flex-col gap-0.5 rounded-(--radius-well) bg-(--surface) px-3.5 py-3"
                    key={stat.label}
                  >
                    <dt className="text-[0.8125rem] leading-5 text-(--secondary)">
                      {stat.label}
                    </dt>
                    <dd className="text-xl leading-7 font-semibold tracking-[-0.02em] text-(--fg) tabular-nums">
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <section
                aria-labelledby="contact-documents"
                className="flex flex-col gap-1.5"
              >
                <h3
                  className="px-1 text-[0.8125rem] leading-5 font-medium text-(--secondary)"
                  id="contact-documents"
                >
                  {contact.documents.length < contact.documentCount
                    ? "Most recent documents"
                    : "Their documents"}
                </h3>
                <ul className="-mx-2 flex flex-col">
                  {contact.documents.map((document) => (
                    <li key={document.id}>
                      <Link
                        className={cn(
                          "group/doc flex min-h-14 items-center gap-3 rounded-(--radius-well) px-2 py-2 outline-none",
                          "transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) focus-visible:shadow-(--focus-ring) active:bg-(--press)",
                        )}
                        href={`/envelopes/${encodeURIComponent(document.id)}`}
                        onClick={() => onOpenChange(false)}
                      >
                        <span className="flex h-11 w-9 shrink-0 items-center justify-center">
                          <PaperThumb
                            className="h-11"
                            envelopeId={document.id}
                            morph={false}
                            title={document.title}
                          />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm leading-5 font-medium text-(--fg)">
                            {document.title}
                          </span>
                          <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
                            {describeDocument(document, now)}
                          </span>
                        </span>
                        <StatusFlag size="sm" status={document.status} />
                        <ChevronRightIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-(--secondary) transition-[opacity,translate] duration-(--dur-hover) ease-(--ease-out) pointer-fine:-translate-x-1 pointer-fine:opacity-0 pointer-fine:group-hover/doc:translate-x-0 pointer-fine:group-hover/doc:opacity-100"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </TrayBody>

            <TrayFooter>
              <Button
                className="max-sm:h-12 max-sm:flex-1"
                onClick={sendThemADocument}
                type="button"
              >
                <SendIcon aria-hidden="true" />
                Send them a document
              </Button>
            </TrayFooter>
          </>
        ) : (
          <TrayHeader>
            <TrayTitle>Contact</TrayTitle>
          </TrayHeader>
        )}
      </TrayContent>
    </Tray>
  );
}
