"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Mail,
  MailCheck,
  MailWarning,
  MailX,
  RefreshCw,
  Send,
} from "@/components/ui/icons";

import {
  GENERIC_ERROR_MESSAGE,
  Notice,
  isAbortError,
} from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusFlag, type StatusFlagTone } from "@/components/ui/status-flag";
import { toast } from "@/components/ui/toaster";
import {
  Tray,
  TrayBody,
  TrayClose,
  TrayContent,
  TrayDescription,
  TrayFooter,
  TrayHeader,
  TrayTitle,
  TrayTrigger,
} from "@/components/ui/tray";
import { cn } from "@/lib/cn";
import type { EmailDnsRecord, EmailStatus } from "@/lib/email-status";

// Whether email works yet, as one row in words, and what to do until it
// does. The long parts (the steps, the DNS records to add, each with its
// own status and copy buttons) open in a tray. Lives in the Email section
// of the Organization group.

const RESEND_DOMAINS_URL = "https://resend.com/domains";
const RESEND_MARKETPLACE_URL = "https://vercel.com/marketplace/resend";

type EmailResponse = {
  error?: string;
  status?: EmailStatus;
  test?: { sent: true; to: string } | { sent: false; message: string };
} | null;

type EmailAction = "add_domain" | "recheck" | "send_test";

async function fetchEmailStatus(
  signal: AbortSignal,
): Promise<{ error: string; status: null } | { status: EmailStatus }> {
  const response = await fetch("/api/admin/email", { signal });
  const payload = (await response.json().catch(() => null)) as EmailResponse;

  if (!response.ok || !payload?.status) {
    return { error: payload?.error ?? GENERIC_ERROR_MESSAGE, status: null };
  }

  return { status: payload.status };
}

export function EmailSetupPanel() {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<EmailAction | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchEmailStatus(controller.signal)
      .then((result) => {
        if (result.status) {
          setLoadError(null);
          setStatus(result.status);
        } else {
          setLoadError(result.error);
        }
      })
      .catch((error: unknown) => {
        // Leaving the page cancels the request; that is not a failure.
        if (!isAbortError(error)) {
          setLoadError(GENERIC_ERROR_MESSAGE);
        }
      });

    return () => controller.abort();
  }, [attempt]);

  async function runAction(action: EmailAction) {
    if (pendingAction) {
      return;
    }

    setPendingAction(action);
    setTestError(null);

    try {
      const response = await fetch("/api/admin/email", {
        body: JSON.stringify({ action }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as EmailResponse;

      if (payload?.status) {
        setLoadError(null);
        setStatus(payload.status);
      }

      if (payload?.test) {
        if (payload.test.sent) {
          toast.success("Test email sent", {
            description: `Sent to ${payload.test.to}. Check that inbox.`,
          });
        } else {
          setTestError(payload.test.message);
        }
      } else if (!response.ok) {
        setLoadError(payload?.error ?? GENERIC_ERROR_MESSAGE);
      } else if (action === "recheck" && payload?.status?.state === "ready") {
        toast.success("Email is working", {
          description: `${payload.status.domain} is verified.`,
        });
      }
    } catch {
      setLoadError(GENERIC_ERROR_MESSAGE);
    } finally {
      setPendingAction(null);
    }
  }

  const summary = status ? describeEmailStatus(status) : null;
  const canSendTest =
    status !== null &&
    status.state !== "missing_key" &&
    status.state !== "capture";
  const detailsLabel =
    status?.state === "domain_pending"
      ? "See DNS records"
      : summary?.steps
        ? "Show me how"
        : summary && summary.lines.length > 1
          ? "Learn more"
          : null;
  const hasActions =
    status?.state === "domain_missing" ||
    status?.state === "domain_pending" ||
    canSendTest ||
    status?.state === "restricted_key" ||
    status?.state === "error" ||
    status?.state === "test_sender" ||
    detailsLabel !== null;

  const recheckButton =
    status?.state === "domain_pending" ? (
      <Button
        disabled={pendingAction !== null && pendingAction !== "recheck"}
        loading={pendingAction === "recheck"}
        onClick={() => void runAction("recheck")}
        type="button"
      >
        <RefreshCw aria-hidden="true" />
        Check DNS records
      </Button>
    ) : null;

  return (
    <div
      aria-busy={!summary && !loadError ? true : undefined}
      className="flex scroll-mt-32 flex-col gap-3 px-4 py-4 sm:px-5 lg:scroll-mt-24 xl:scroll-mt-10"
      id="email-setup"
    >
      {loadError ? (
        <Notice
          action={
            <Button
              onClick={() => {
                setLoadError(null);
                setAttempt((value) => value + 1);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Try again
            </Button>
          }
          role="alert"
          tone="danger"
        >
          {loadError}
        </Notice>
      ) : null}

      {!summary ? (
        loadError ? null : (
          <div className="flex items-center gap-3.5">
            <span className="sr-only">Checking email…</span>
            <Skeleton className="size-10 rounded-[0.625rem]" delay={150} />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" delay={150} />
              <Skeleton className="h-3.5 w-72 max-w-full" delay={150} />
            </div>
          </div>
        )
      ) : (
        <div
          className="flex items-start gap-3.5"
          data-email-state={status?.state}
        >
          <StateTile tone={summary.tone} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <p className="text-[0.9375rem] leading-5 font-medium tracking-[-0.01em] text-(--fg)">
              {summary.title}
            </p>
            <p className="max-w-[60ch] text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
              {summary.lines[0]}
            </p>
          </div>
        </div>
      )}

      {testError ? (
        <Notice
          role="alert"
          tone="danger"
          title="The test email did not go out"
        >
          {testError}
        </Notice>
      ) : null}

      {summary && hasActions ? (
        <div className="flex flex-wrap gap-2 max-sm:*:flex-1 sm:pl-[3.375rem]">
          {status?.state === "domain_missing" ? (
            <Button
              disabled={
                pendingAction !== null && pendingAction !== "add_domain"
              }
              loading={pendingAction === "add_domain"}
              onClick={() => void runAction("add_domain")}
              size="sm"
              type="button"
            >
              {`Set up ${status.domain}`}
            </Button>
          ) : null}
          {detailsLabel ? (
            <Tray onOpenChange={setDetailsOpen} open={detailsOpen}>
              <TrayTrigger asChild>
                <Button
                  size="sm"
                  type="button"
                  variant={
                    status?.state === "domain_pending" ? "default" : "outline"
                  }
                >
                  {detailsLabel}
                </Button>
              </TrayTrigger>
              <TrayContent size="lg">
                <TrayHeader>
                  <TrayTitle>{summary.title}</TrayTitle>
                  <TrayDescription>{summary.lines[0]}</TrayDescription>
                </TrayHeader>
                <TrayBody className="flex flex-col gap-4 pt-4">
                  {summary.lines.slice(1).map((line) => (
                    <p
                      className="text-sm leading-6 text-pretty text-(--secondary)"
                      key={line}
                    >
                      {line}
                    </p>
                  ))}
                  {summary.steps ? <EmailSteps steps={summary.steps} /> : null}
                  {status?.state === "domain_pending" ? (
                    <DnsRecordsChecklist
                      domain={status.domain}
                      records={status.records}
                    />
                  ) : null}
                </TrayBody>
                <TrayFooter>
                  <TrayClose asChild>
                    <Button
                      type="button"
                      variant={recheckButton ? "outline" : "default"}
                    >
                      {recheckButton ? "Close" : "Done"}
                    </Button>
                  </TrayClose>
                  {recheckButton}
                </TrayFooter>
              </TrayContent>
            </Tray>
          ) : null}
          {status?.state === "domain_pending" ? (
            <Button
              disabled={pendingAction !== null && pendingAction !== "recheck"}
              loading={pendingAction === "recheck"}
              onClick={() => void runAction("recheck")}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" />
              Check again
            </Button>
          ) : null}
          {canSendTest ? (
            <Button
              disabled={pendingAction !== null && pendingAction !== "send_test"}
              loading={pendingAction === "send_test"}
              onClick={() => void runAction("send_test")}
              size="sm"
              type="button"
              variant="outline"
            >
              <Send aria-hidden="true" />
              Send me a test email
            </Button>
          ) : null}
          {status?.state === "restricted_key" ||
          status?.state === "error" ||
          status?.state === "test_sender" ? (
            <Button asChild size="sm" variant="ghost">
              <a href={RESEND_DOMAINS_URL} rel="noreferrer" target="_blank">
                Open Resend
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const STATE_TILES: Record<
  StatusFlagTone,
  { className: string; icon: typeof MailCheck }
> = {
  accent: {
    className: "bg-(--accent-soft) text-(--accent-ink)",
    icon: MailCheck,
  },
  danger: { className: "bg-(--danger-soft) text-(--danger)", icon: MailX },
  neutral: {
    className: "bg-(--surface-strong) text-(--secondary-strong)",
    icon: Mail,
  },
  success: {
    className: "bg-(--success-soft) text-(--success)",
    icon: MailCheck,
  },
  warning: {
    className: "bg-(--warning-soft) text-(--warning)",
    icon: MailWarning,
  },
};

/** Where email stands, as an icon in a soft tile tinted by meaning. */
function StateTile({ tone }: { tone: StatusFlagTone }) {
  const tile = STATE_TILES[tone] ?? STATE_TILES.neutral;
  const Icon = tile.icon;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-[0.625rem]",
        tile.className,
      )}
    >
      <Icon className="size-[1.125rem]" strokeWidth={1.75} />
    </span>
  );
}

function EmailSteps({ steps }: { steps: EmailStep[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li className="flex gap-3" key={step.text}>
          <span
            aria-hidden="true"
            className="mt-px inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-(--accent-softer) text-xs font-semibold text-(--accent-ink) tabular-nums"
          >
            {index + 1}
          </span>
          <p className="text-sm leading-6 text-pretty text-(--secondary-strong)">
            {step.text}
            {step.link ? (
              <>
                {" "}
                <a
                  className="inline-flex items-center gap-1 font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.35)] underline-offset-4 hover:decoration-(--accent-ink)"
                  href={step.link.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {step.link.label}
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              </>
            ) : null}
          </p>
        </li>
      ))}
    </ol>
  );
}

type EmailStep = {
  link?: { href: string; label: string };
  text: string;
};

type EmailSummary = {
  flag: string;
  glyph: "check" | "clock" | "dot" | "x" | "ring";
  lines: string[];
  ready: boolean;
  steps?: EmailStep[];
  title: string;
  tone: StatusFlagTone;
};

function describeEmailStatus(status: EmailStatus): EmailSummary {
  switch (status.state) {
    case "capture":
      return {
        flag: "Captured",
        glyph: "dot",
        lines: [
          "This is a development setup. Emails are saved to a folder on this machine instead of being sent.",
        ],
        ready: true,
        title: "Emails are being captured, not sent",
        tone: "accent",
      };
    case "missing_key":
      return status.onVercel
        ? {
            flag: "Not connected",
            glyph: "x",
            lines: [
              "This site has no Resend API key, so it cannot send anything: no sign-up confirmations and no signing invitations.",
            ],
            ready: false,
            steps: [
              {
                link: {
                  href: RESEND_MARKETPLACE_URL,
                  label: "Resend on the Vercel Marketplace",
                },
                text: "Open Resend on the Vercel Marketplace. Choose Install (or Connect Project if your team already has Resend) and connect it to this project.",
              },
              {
                text: "In this project on Vercel, open Settings, then Environment Variables, and check that RESEND_API_KEY is listed for Production.",
              },
              {
                text: "Open Deployments, open the ••• menu on the latest Production deployment and choose Redeploy. Environment variables only reach deployments made after they were added, so a site deployed before Resend was connected still has no key until it is redeployed.",
              },
              {
                text: "When the new deployment is ready, reload this page.",
              },
            ],
            title: "Email is not connected",
            tone: "danger",
          }
        : {
            flag: "Not connected",
            glyph: "x",
            lines: [
              "This site has no Resend API key, so it cannot send anything: no sign-up confirmations and no signing invitations.",
            ],
            ready: false,
            steps: [
              {
                link: {
                  href: "https://resend.com/api-keys",
                  label: "Resend API keys",
                },
                text: "Create an API key in Resend with full access, so this page can add your domain and check its DNS records.",
              },
              {
                text: "Set it as the RESEND_API_KEY environment variable where this site runs.",
              },
              { text: "Restart the app, then reload this page." },
            ],
            title: "Email is not connected",
            tone: "danger",
          };
    case "test_sender":
      return {
        flag: "Test sender",
        glyph: "clock",
        lines: [
          `Emails are going out from Resend's shared test address (${status.senderAddress}). Resend only delivers those to the owner of the Resend account, so signers and new users will not receive anything yet.`,
          'Enter an address at your own domain in "Send email from" above and save. The DNS records to add will appear here.',
        ],
        ready: false,
        title: "Email only reaches you so far",
        tone: "warning",
      };
    case "domain_missing":
      return {
        flag: "Domain needed",
        glyph: "clock",
        lines: [
          `${status.domain} has not been added to your Resend account yet. Set it up here to get the DNS records that prove you own it.`,
        ],
        ready: false,
        title: `${status.domain} needs to be set up`,
        tone: "warning",
      };
    case "domain_pending":
      return {
        flag: "Waiting for DNS",
        glyph: "clock",
        lines: [
          `Add these records where ${status.domain}'s DNS is managed, then check them. DNS changes can take a few minutes to be seen, and sometimes longer.`,
          ...(status.mayAlreadySend
            ? [
                "Resend has verified part of this domain, so sending may already work. Send yourself a test email to find out. If it arrives, email is working.",
              ]
            : []),
        ],
        ready: false,
        title: `Waiting for ${status.domain}'s DNS records`,
        tone: "warning",
      };
    case "restricted_key":
      return {
        flag: "Check in Resend",
        glyph: "ring",
        lines: [
          `This site's Resend key is only allowed to send email, so it cannot check ${status.domain} from here. Open Resend to add the domain and see its DNS records.`,
          "When that is done, send yourself a test email. If it arrives, email is working.",
        ],
        ready: false,
        title: "Finish the domain in Resend",
        tone: "warning",
      };
    case "ready":
      return {
        flag: "Working",
        glyph: "check",
        lines: [
          `Emails are sent from ${status.senderAddress}, and ${status.domain} is verified.`,
        ],
        ready: true,
        title: "Email is working",
        tone: "success",
      };
    case "error":
      return {
        flag: "Unknown",
        glyph: "x",
        lines: [
          `Resend could not be asked about this site's email: ${status.message}`,
        ],
        ready: false,
        title: "Email could not be checked",
        tone: "danger",
      };
  }
}

/** One row per DNS record: its own status, and a copy button per value. */
function DnsRecordsChecklist({
  domain,
  records,
}: {
  domain: string;
  records: readonly EmailDnsRecord[];
}) {
  if (records.length === 0) {
    return (
      <Notice tone="neutral">
        Resend did not list any records for {domain}. Open Resend to see them.
      </Notice>
    );
  }

  const found = records.filter((record) => record.status === "verified").length;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[0.8125rem] leading-5 font-medium text-(--secondary)">
        {found} of {records.length} found for {domain}
      </p>
      <ul
        aria-label={`DNS records to add for ${domain}`}
        className="flex flex-col gap-2"
      >
        {records.map((record) => {
          const verified = record.status === "verified";

          return (
            <li
              className="flex flex-col gap-2.5 rounded-(--radius-well) bg-(--surface) p-3"
              key={`${record.type}-${record.name}-${record.value}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-(--fg)">
                  {record.type} record
                </span>
                {record.purpose ? (
                  <span className="text-[0.8125rem] text-(--secondary)">
                    {record.purpose}
                  </span>
                ) : null}
                {record.priority !== null ? (
                  <span className="text-[0.8125rem] text-(--secondary)">
                    Priority {record.priority}
                  </span>
                ) : null}
                <StatusFlag
                  className="ml-auto"
                  glyph={verified ? "check" : "clock"}
                  size="sm"
                  tone={verified ? "success" : "warning"}
                >
                  {verified ? "Found" : "Not found yet"}
                </StatusFlag>
              </div>
              <dl className="grid min-w-0 gap-1.5">
                <DnsValue label="Name" value={record.name} />
                <DnsValue label="Value" value={record.value} />
              </dl>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DnsValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <dt className="w-11 shrink-0 pt-1.5 text-[0.8125rem] text-(--secondary)">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 items-start gap-1 rounded-[0.625rem] bg-(--paper) py-1 pr-1 pl-2.5 shadow-(--ring-soft)">
        <span className="min-w-0 flex-1 pt-0.5 font-mono text-xs leading-5 break-all text-(--fg)">
          {value}
        </span>
        <CopyButton
          aria-label={`Copy ${label.toLowerCase()}`}
          size="icon-xs"
          value={value}
        />
      </dd>
    </div>
  );
}
