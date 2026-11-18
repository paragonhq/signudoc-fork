"use client";

import {
  BellRingIcon,
  CheckIcon,
  EyeIcon,
  PencilIcon,
  XIcon,
} from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { useSyncExternalStore, type ReactNode } from "react";

import { getInitials } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { getSignerPalette } from "@/components/envelopes/signer-palette";
import { cn } from "@/lib/cn";

import {
  firstName,
  latestEvent,
  parseShortDate,
  parseTimelineStamp,
  relativeDay,
  relativeTime,
  signerPresence,
  type RouteNode,
} from "./derive";
import type { DetailModel } from "./model";
import { Section } from "./section";

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/**
 * The people, top to bottom in signing order: a face, a name and an
 * address, and where each of them stands in words with when. The person
 * whose turn it is sits on a soft tint. People who only get a copy follow,
 * quieter. Correcting a signer appears on the row when you reach for it.
 */
export function People({
  activeSigner = null,
  model,
  onCorrect,
  onHoverSigner,
}: {
  /** The signer whose fields are in focus on the document. */
  activeSigner?: number | null;
  model: DetailModel;
  onCorrect: (node: RouteNode) => void;
  /** Pointing at a signer brings their fields forward on the document. */
  onHoverSigner?: (signer: number | null) => void;
}) {
  const { record, route } = model;
  const copies = record.copyRecipients ?? [];
  const canCorrect = model.isOwn && record.status === "sent" && !record.part11;
  const description =
    record.signatureTypeLabel ??
    (route.length > 1 ? "One after another, in this order." : null);

  return (
    <Section description={description} title="Signers">
      <div className="overflow-hidden rounded-(--radius-card) bg-(--paper) shadow-(--shadow-card)">
        {route.length === 0 ? (
          <p className="px-5 py-6 text-[0.9375rem] leading-6 text-(--secondary)">
            Nobody yet. Add who signs before you send it.
          </p>
        ) : (
          <ol
            aria-label="Signers in signing order"
            className="px-4 py-2 sm:px-5"
            onPointerLeave={() => onHoverSigner?.(null)}
          >
            {route.map((node, position) => (
              <SignerRow
                active={activeSigner === node.index}
                canCorrect={
                  canCorrect &&
                  (node.signer.status === "waiting" ||
                    node.signer.status === "pending")
                }
                key={node.signer.id}
                model={model}
                node={node}
                last={position === route.length - 1}
                onCorrect={() => onCorrect(node)}
                onHover={() => onHoverSigner?.(node.index)}
                previous={route[position - 1] ?? null}
              />
            ))}
          </ol>
        )}

        {copies.length > 0 ? (
          <div className="border-t border-(--divider)">
            <h3 className="px-4 pt-4 text-[0.8125rem] leading-5 font-medium text-(--secondary) sm:px-5">
              Gets a copy
            </h3>
            <ul>
              {copies.map((recipient) => (
                <li
                  className="flex min-h-16 items-center gap-3.5 px-4 py-3 sm:px-5"
                  key={recipient.id}
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-(--surface-strong) text-xs font-medium text-(--secondary)"
                  >
                    {getInitials(recipient.name || recipient.email)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[0.9375rem] leading-5 font-medium text-(--fg)">
                      {recipient.name}
                    </span>
                    <span className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
                      {recipient.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[0.8125rem] leading-5 text-(--secondary)">
                    {record.status === "completed"
                      ? "Sent the signed PDF"
                      : "When it’s done"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Section>
  );
}

type Standing = {
  tone: "accent" | "danger" | "muted" | "success";
  when: string | null;
  word: string | null;
};

/** Where one person stands, in words, and since when. */
function standing(
  node: RouteNode,
  previous: RouteNode | null,
  model: DetailModel,
): Standing {
  const { record, now } = model;
  const { signer, state } = node;
  const dated = (label: string | undefined, prefix: string) =>
    label?.startsWith(prefix)
      ? relativeDay(parseShortDate(label.slice(prefix.length)), now)
      : null;
  const eventWhen = (verb: string) => {
    const event = latestEvent(
      record.timeline,
      (item) =>
        item.description.startsWith(`${verb} `) &&
        (item.description.includes(signer.name) ||
          item.description.includes(signer.email)),
    );

    return event
      ? relativeTime(parseTimelineStamp(event.timestamp, now), now)
      : null;
  };

  switch (state) {
    case "signed":
      return {
        tone: "success",
        when:
          eventWhen("Signed by") ?? dated(signer.statusDateLabel, "Signed "),
        word: "Signed",
      };
    case "declined":
      return {
        tone: "danger",
        when: dated(signer.statusDateLabel, "Declined "),
        word: "Declined",
      };
    case "current": {
      const sent = eventWhen("Sent to");

      return {
        tone: "accent",
        when: sent
          ? `sent ${sent}`
          : (dated(signer.statusDateLabel, "Sent ") ?? null),
        word: "Their turn",
      };
    }
    case "viewed": {
      // Opening it is told on its own line under the address.
      const sent = eventWhen("Sent to");

      return {
        tone: "accent",
        when: sent
          ? `sent ${sent}`
          : (dated(signer.statusDateLabel, "Sent ") ?? null),
        word: "Their turn",
      };
    }
    case "not-reached":
      return { tone: "muted", when: null, word: "Not reached" };
    default:
      if (record.status === "draft") {
        return {
          tone: "muted",
          when: null,
          word:
            model.route.length > 1
              ? `Signs ${ORDINALS[node.index] ?? String(node.index + 1)}`
              : null,
        };
      }

      return {
        tone: "muted",
        when: null,
        word: previous
          ? `After ${firstName(previous.signer.name)}`
          : "Waiting their turn",
      };
  }
}

const TONE_TEXT: Record<Standing["tone"], string> = {
  accent: "text-(--accent-ink)",
  danger: "text-(--danger)",
  muted: "text-(--secondary)",
  success: "text-(--success)",
};

const subscribeNever = () => () => {};

/** True once mounted: motion the server cannot know about waits for it. */
function useMounted() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/**
 * One step of the signing order: a face on a quiet line that joins the
 * steps (green once they have signed), the person, where they stand and
 * since when, and the little things that say what is happening: whether
 * they have opened it, and when they were last reminded. The person whose
 * turn it is gets a ring, and one soft pulse when the page opens.
 */
function SignerRow({
  active,
  canCorrect,
  last,
  model,
  node,
  onCorrect,
  onHover,
  previous,
}: {
  active: boolean;
  canCorrect: boolean;
  last: boolean;
  model: DetailModel;
  node: RouteNode;
  onCorrect: () => void;
  onHover: () => void;
  previous: RouteNode | null;
}) {
  const { signer, state } = node;
  const palette = getSignerPalette(node.index);
  const theirTurn = state === "current" || state === "viewed";
  const where = standing(node, previous, model);
  const presence = theirTurn
    ? signerPresence(signer, model.record.timeline, model.now)
    : null;
  const lastReminder = presence?.reminders.at(-1) ?? null;
  const reminded = lastReminder
    ? relativeTime(lastReminder.at, model.now)
    : null;
  const reminderCount = presence?.reminders.length ?? 0;
  const mounted = useMounted();
  const reduceMotion = useReducedMotion();

  return (
    <li
      aria-current={theirTurn ? "step" : undefined}
      className="group/signer relative flex gap-3.5 py-3"
      data-state={state}
      onPointerEnter={onHover}
    >
      {!last ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-[3.25rem] -bottom-1 left-[1.0625rem] w-0.5 rounded-full",
            state === "signed" ? "bg-(--success)/40" : "bg-(--divider)",
          )}
        />
      ) : null}

      <span aria-hidden="true" className="relative size-9 shrink-0">
        {theirTurn && mounted && !reduceMotion ? (
          <motion.span
            animate={{ opacity: [0, 0.55, 0], scale: [1, 1, 1.75] }}
            className="absolute inset-0 rounded-full"
            initial={{ opacity: 0, scale: 1 }}
            style={{ boxShadow: `0 0 0 2px ${palette.color}` }}
            transition={{
              delay: 0.6,
              duration: 1.4,
              ease: [0.23, 1, 0.32, 1],
              times: [0, 0.15, 1],
            }}
          />
        ) : null}
        <span
          className={cn(
            "relative inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold transition-[box-shadow] duration-(--dur-move) ease-(--ease-out)",
            state === "not-reached" && "opacity-50",
          )}
          style={{
            background: palette.tint,
            boxShadow:
              theirTurn || active
                ? `0 0 0 2px var(--paper), 0 0 0 3.5px ${palette.color}`
                : undefined,
            color: palette.color,
          }}
        >
          {getInitials(signer.name || signer.email)}
        </span>
        {state === "signed" || state === "declined" ? (
          <span
            className={cn(
              "absolute -right-0.5 -bottom-0.5 inline-flex size-4 items-center justify-center rounded-full text-(--on-accent) shadow-[0_0_0_2px_var(--paper)]",
              state === "signed" ? "bg-(--success)" : "bg-(--danger)",
            )}
          >
            {state === "signed" ? (
              <CheckIcon className="size-2.5" strokeWidth={3} />
            ) : (
              <XIcon className="size-2.5" strokeWidth={3} />
            )}
          </span>
        ) : null}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-px">
        <span className="flex min-w-0 items-baseline gap-3">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[0.9375rem] leading-5 font-medium tracking-[-0.01em]",
              state === "not-reached" ? "text-(--secondary)" : "text-(--fg)",
            )}
          >
            {signer.name}
          </span>
          {where.word ? (
            <span
              className={cn(
                "shrink-0 text-[0.8125rem] leading-5 font-medium",
                TONE_TEXT[where.tone],
              )}
            >
              {where.word}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] leading-5 text-(--secondary)">
            {signer.email}
          </span>
          {where.when ? (
            <span className="shrink-0 text-[0.8125rem] leading-5 text-(--secondary)">
              {where.when}
            </span>
          ) : null}
        </span>

        {presence ? (
          <span className="mt-1.5 flex flex-col gap-1">
            <PresenceLine
              icon={<EyeIcon />}
              tone={presence.viewedAt ? "fg" : "muted"}
            >
              {presence.viewedAt
                ? `Viewed ${relativeTime(presence.viewedAt, model.now) ?? ""}`.trim()
                : state === "viewed"
                  ? "Viewed it"
                  : "Hasn’t opened it yet"}
            </PresenceLine>
            {reminded ? (
              <PresenceLine icon={<BellRingIcon />} tone="muted">
                {reminderCount > 1
                  ? `${String(reminderCount)} reminders, the last ${reminded}`
                  : `${lastReminder?.automatic ? "Automatic reminder" : "Reminded"} ${reminded}`}
              </PresenceLine>
            ) : null}
          </span>
        ) : null}

        {node.declineReason ? (
          <span className="mt-1 text-[0.8125rem] leading-5 text-pretty text-(--fg)">
            <span className="text-(--secondary)">Decline reason: </span>
            {node.declineReason}
          </span>
        ) : null}
      </span>

      {canCorrect ? (
        <IconButton
          aria-label={`Correct ${signer.name}'s name or email`}
          className="-mr-1.5 shrink-0 self-center transition-opacity duration-(--dur-hover) ease-(--ease-out) pointer-fine:opacity-0 pointer-fine:group-hover/signer:opacity-100 pointer-fine:focus-visible:opacity-100"
          onClick={onCorrect}
          size="sm"
          tooltip="Correct name or email"
          variant="ghost"
        >
          <PencilIcon />
        </IconButton>
      ) : null}
    </li>
  );
}

function PresenceLine({
  children,
  icon,
  tone,
}: {
  children: ReactNode;
  icon: ReactNode;
  tone: "fg" | "muted";
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[0.8125rem] leading-5 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]",
        tone === "fg" ? "text-(--fg)" : "text-(--secondary)",
      )}
    >
      <span aria-hidden="true" className="inline-flex text-(--secondary)">
        {icon}
      </span>
      {children}
    </span>
  );
}
