"use client";

import { useState } from "react";
import {
  ExternalLink,
  GitPullRequestArrow,
  RefreshCw,
} from "@/components/ui/icons";

import {
  CardNotice,
  Notice,
  Reveal,
  SettingRow,
  SettingsGroup,
  SettingsSection,
} from "@/components/settings/settings-ui";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusFlag } from "@/components/ui/status-flag";
import { TextMorph } from "@/components/ui/text-morph";
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
import type { UpdateStatus } from "@/lib/software-update";

// The SignuDoc section of Settings, for the administrator: the version this
// install runs, a button that asks GitHub whether a newer one is out, and
// how to take it. Updating happens in the install's own GitHub repository,
// not here: a workflow there opens a pull request, and Vercel deploys it.

const linkClassName =
  "inline-flex items-center gap-1 font-medium text-(--accent-ink) underline decoration-[rgb(var(--accent-rgb)/0.35)] underline-offset-4 hover:decoration-(--accent-ink)";

function ExternalAnchor({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <a className={linkClassName} href={href} rel="noreferrer" target="_blank">
      {children}
      <ExternalLink aria-hidden="true" className="size-3" />
    </a>
  );
}

export function UpdatesPanel({
  initialStatus,
}: {
  initialStatus: UpdateStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const check = status.check;

  async function checkNow() {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/updates", { method: "POST" });
      const payload = (await response.json().catch(() => null)) as
        (UpdateStatus & { error?: undefined }) | { error: string } | null;

      if (!response.ok || !payload || "error" in payload) {
        setError(
          (payload && "error" in payload && payload.error) ||
            "Updates could not be checked. Please try again.",
        );
        return;
      }

      setStatus(payload);
    } catch {
      setError("Updates could not be checked. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  const updateAvailable = Boolean(check?.ok && check.updateAvailable);

  return (
    <SettingsGroup label="System">
      <SettingsSection
        status={
          check?.ok ? (
            check.updateAvailable ? (
              <StatusFlag glyph="dot" size="sm" tone="accent">
                Update available
              </StatusFlag>
            ) : (
              <StatusFlag glyph="check" size="sm" tone="success">
                Up to date
              </StatusFlag>
            )
          ) : null
        }
        description="The version of SignuDoc this site runs, and how to move to a newer one."
        id="signudoc"
        title="Updates"
      >
        <SettingRow
          controlWidth="auto"
          description={
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              {status.commit ? (
                <span className="inline-flex items-center gap-0.5">
                  Commit{" "}
                  <code className="font-mono text-xs">{status.commit}</code>
                  <CopyButton
                    aria-label="Copy commit"
                    size="icon-xs"
                    value={status.commit}
                  />
                </span>
              ) : null}
              <span>
                Releases are published on{" "}
                <ExternalAnchor href={status.releasesUrl}>
                  GitHub
                </ExternalAnchor>
                .
              </span>
            </span>
          }
          kind="group"
          label={
            <>
              This site runs SignuDoc{" "}
              <span className="tabular-nums" data-testid="running-version">
                {status.current}
              </span>
            </>
          }
        >
          <Button
            className="max-md:w-full"
            loading={isChecking}
            onClick={() => void checkNow()}
            variant="outline"
          >
            <RefreshCw aria-hidden="true" />
            <TextMorph>{check ? "Check again" : "Check for updates"}</TextMorph>
          </Button>
        </SettingRow>

        <Reveal show={Boolean(error) || Boolean(check)}>
          <CardNotice>
            {error ? (
              <Notice role="alert" tone="danger">
                {error}
              </Notice>
            ) : check ? (
              check.ok ? (
                updateAvailable && check.updateAvailable ? (
                  <Notice
                    action={
                      check.latest.notes ? (
                        <ReleaseNotesTray
                          name={check.latest.name}
                          notes={check.latest.notes}
                          url={check.latest.url}
                        />
                      ) : null
                    }
                    role="status"
                    title={`${check.latest.name} is out`}
                    tone="accent"
                  >
                    This site runs {check.current}.{" "}
                    <ExternalAnchor href={check.latest.url}>
                      Read the release on GitHub
                    </ExternalAnchor>
                  </Notice>
                ) : (
                  <Notice role="status" tone="success">
                    You are up to date. {check.latest.version} is the latest
                    release.
                  </Notice>
                )
              ) : (
                <Notice role="status" tone="warning">
                  {check.error}{" "}
                  <ExternalAnchor href={status.releasesUrl}>
                    See the releases
                  </ExternalAnchor>
                </Notice>
              )
            ) : null}
          </CardNotice>
        </Reveal>

        <SettingRow
          controlWidth="auto"
          description="A workflow in your GitHub repository brings in the new version for you to merge."
          kind="group"
          label="How to update"
        >
          <Tray>
            <TrayTrigger asChild>
              <Button
                className="max-md:w-full"
                variant={updateAvailable ? "default" : "ghost"}
              >
                Show me how
              </Button>
            </TrayTrigger>
            <TrayContent size="lg">
              <TrayHeader>
                <TrayTitle>How to update</TrayTitle>
                <TrayDescription>
                  Updating happens in the repository this site is built from,
                  not here.
                </TrayDescription>
              </TrayHeader>
              <TrayBody className="pt-4">
                <HowToUpdate status={status} />
              </TrayBody>
              <TrayFooter>
                <TrayClose asChild>
                  <Button variant="outline">Close</Button>
                </TrayClose>
                {status.repository && !status.repository.isUpstream ? (
                  <Button asChild>
                    <a
                      href={status.repository.actionsUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <GitPullRequestArrow aria-hidden="true" />
                      Open the workflow
                    </a>
                  </Button>
                ) : null}
              </TrayFooter>
            </TrayContent>
          </Tray>
        </SettingRow>
      </SettingsSection>
    </SettingsGroup>
  );
}

/** What is new in a release, in a tray: long notes never sit inline. */
function ReleaseNotesTray({
  name,
  notes,
  url,
}: {
  name: string;
  notes: string;
  url: string;
}) {
  return (
    <Tray>
      <TrayTrigger asChild>
        <Button size="sm" variant="outline">
          What&apos;s new
        </Button>
      </TrayTrigger>
      <TrayContent size="lg">
        <TrayHeader>
          <TrayTitle>{`What's new in ${name}`}</TrayTitle>
          <TrayDescription>
            <ExternalAnchor href={url}>The release on GitHub</ExternalAnchor>
          </TrayDescription>
        </TrayHeader>
        <TrayBody className="flex flex-col gap-1 pt-4 text-sm leading-6 text-(--secondary-strong)">
          <ReleaseNotes notes={notes} />
        </TrayBody>
        <TrayFooter>
          <TrayClose asChild>
            <Button>Done</Button>
          </TrayClose>
        </TrayFooter>
      </TrayContent>
    </Tray>
  );
}

/**
 * Release notes are Markdown. They are shown as plain text, with headings
 * and list items picked out and the rest of the markup dropped: nothing in
 * them becomes HTML or a link.
 */
function ReleaseNotes({ notes }: { notes: string }) {
  const clean = (text: string) =>
    text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, "$1");

  return notes.split(/\r?\n/).map((line, index) => {
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    const item = /^\s*[-*+]\s+(.*)$/.exec(line);

    if (heading) {
      return (
        <p className="pt-3 font-medium text-(--fg) first:pt-0" key={index}>
          {clean(heading[1])}
        </p>
      );
    }

    if (item) {
      return (
        <p className="flex gap-2 pl-1" key={index}>
          <span aria-hidden="true" className="text-(--tertiary)">
            –
          </span>
          <span>{clean(item[1])}</span>
        </p>
      );
    }

    return line.trim() ? <p key={index}>{clean(line)}</p> : null;
  });
}

function HowToUpdate({ status }: { status: UpdateStatus }) {
  const repository = status.repository;

  if (!repository || repository.isUpstream) {
    return (
      <p className="text-sm leading-6 text-pretty text-(--secondary-strong)">
        Bring the new release into the repository this site is built from, then
        deploy it. The{" "}
        <ExternalAnchor href={status.docsUrl}>update guide</ExternalAnchor>{" "}
        shows how, including a GitHub workflow that does it for you.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-3.5">
        {[
          <>
            In your repository{" "}
            <ExternalAnchor href={repository.url}>
              {repository.owner}/{repository.slug}
            </ExternalAnchor>
            , open the Update SignuDoc workflow and press{" "}
            <span className="font-medium text-(--fg)">Run workflow</span>. It
            also runs by itself once a week.
          </>,
          <>
            It opens a pull request with the new version, and Vercel builds a
            preview of it. Your own changes are kept; if they clash with the
            update, the workflow says which files.
          </>,
          <>
            Merge the pull request. Vercel deploys it, and the build applies any
            database changes the new version needs.
          </>,
        ].map((text, index) => (
          <li className="flex gap-3" key={index}>
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-(--accent-softer) text-xs font-semibold text-(--accent-ink) tabular-nums"
            >
              {index + 1}
            </span>
            <p className="text-sm leading-6 text-pretty text-(--secondary-strong)">
              {text}
            </p>
          </li>
        ))}
      </ol>
      <p className="text-[0.8125rem] leading-5 text-pretty text-(--secondary)">
        No such workflow? Copies made before version 0.2.0 do not have it.{" "}
        <ExternalAnchor href={repository.addWorkflowUrl}>
          Create the file
        </ExternalAnchor>{" "}
        once and paste in{" "}
        <ExternalAnchor href={status.workflowSourceUrl}>
          its contents
        </ExternalAnchor>
        . The{" "}
        <ExternalAnchor href={status.docsUrl}>update guide</ExternalAnchor> has
        the details.
      </p>
    </div>
  );
}
