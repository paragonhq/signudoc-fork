"use client";

import {
  AlignCenterHorizontalIcon,
  AlignCenterVerticalIcon,
  AlignEndHorizontalIcon,
  AlignEndVerticalIcon,
  AlignStartHorizontalIcon,
  AlignStartVerticalIcon,
  ChevronRightIcon,
  CopyIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import {
  labelTextToShow,
  MAX_FIELD_OPTION_LENGTH,
  MAX_FIELD_OPTIONS,
  MAX_RADIO_GROUP_BUTTONS,
  optionsTextToShow,
  parseOptionLines,
} from "@/lib/field-choices";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { DUR, EASE, exitDuration } from "@/components/ui/motion-tokens";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SimpleTooltip } from "@/components/ui/tooltip";

import { fieldToolIcons } from "./field-glyphs";
import {
  canBeOptional,
  canHaveLabel,
  getFieldTool,
  type Alignment,
  type PrepareField,
  type PrepareFieldType,
  type PrepareShellSigner,
  type Rect,
} from "./model";
import { ScrubInput } from "./scrub-input";
import { SignerAvatar } from "./signer-avatar";
import { boundingRect, toPoints } from "./snapping";

export type InspectorActions = {
  onAddRadioButton: () => void;
  onAlign: (alignment: Alignment) => void;
  onAssign: (signerId: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  /** Geometry in page fractions, from the W/H/X/Y fields. */
  onGeometry: (patch: Partial<Rect>) => void;
  onScrubChange: (isScrubbing: boolean) => void;
  onSelectField: (fieldId: string) => void;
  onSetLabel: (label: string | undefined) => void;
  onSetOptions: (options: string[]) => void;
  onSetRequired: (required: boolean) => void;
};

type FieldInspectorProps = InspectorActions & {
  /** The radio buttons in the primary field's group, itself included. */
  group: readonly PrepareField[];
  /** Short labels: "⌘" or "Ctrl". */
  mod: string;
  /** Closes the panel (deselects). Without it there is no close button. */
  onClose?: () => void;
  page: { heightPt: number; widthPt: number };
  primary: PrepareField;
  selection: readonly PrepareField[];
  /** False inside a tray, which has its own title. */
  showHeader?: boolean;
  signers: readonly PrepareShellSigner[];
};

/* ------------------------------------------------------------------ */
/* Layout parts                                                         */
/* ------------------------------------------------------------------ */

/** A group of rows, with a hairline above every group but the first. */
function Group({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 px-4 py-4 not-first:before:absolute not-first:before:inset-x-4 not-first:before:top-0 not-first:before:h-px not-first:before:bg-(--divider)",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A label on the left, its direct control on the right. */
function Row({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor?: string;
  label: ReactNode;
}) {
  const LabelTag = htmlFor ? "label" : "span";

  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <LabelTag
        className="shrink-0 text-sm leading-5 font-medium text-(--fg)"
        htmlFor={htmlFor}
      >
        {label}
      </LabelTag>
      <div className="flex min-w-0 items-center justify-end gap-1.5">
        {children}
      </div>
    </div>
  );
}

const alignments: ReadonlyArray<{
  icon: typeof AlignStartVerticalIcon;
  label: string;
  value: Alignment;
}> = [
  { icon: AlignStartVerticalIcon, label: "Align left", value: "left" },
  {
    icon: AlignCenterVerticalIcon,
    label: "Align horizontal centres",
    value: "center-x",
  },
  { icon: AlignEndVerticalIcon, label: "Align right", value: "right" },
  { icon: AlignStartHorizontalIcon, label: "Align top", value: "top" },
  {
    icon: AlignCenterHorizontalIcon,
    label: "Align vertical centres",
    value: "center-y",
  },
  { icon: AlignEndHorizontalIcon, label: "Align bottom", value: "bottom" },
];

/** Signers as small avatars; the field's signer wears a ring in their colour. */
function SignerPicker({
  activeSignerId,
  onAssign,
  signers,
}: {
  activeSignerId: string | null;
  onAssign: (signerId: string) => void;
  signers: readonly PrepareShellSigner[];
}) {
  return (
    <div
      aria-label="Assigned to"
      className="flex flex-wrap items-center justify-end gap-1"
      role="group"
    >
      {signers.map((signer) => {
        const isActive = signer.id === activeSignerId;

        return (
          <SimpleTooltip key={signer.id} label={signer.name}>
            <button
              aria-label={`Assign to ${signer.name}`}
              aria-pressed={isActive}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-full outline-none pointer-coarse:size-11",
                "transition-[box-shadow,scale,opacity] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.92] active:duration-(--dur-press)",
                "focus-visible:shadow-(--focus-ring)",
                isActive ? "opacity-100" : "opacity-55 hover:opacity-100",
              )}
              onClick={() => onAssign(signer.id)}
              style={
                isActive
                  ? { boxShadow: `inset 0 0 0 2px ${signer.color}` }
                  : undefined
              }
              type="button"
            >
              <SignerAvatar signer={signer} />
            </button>
          </SimpleTooltip>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The field inspector                                                  */
/* ------------------------------------------------------------------ */

/**
 * The settings of the selected field, as compact rows of direct controls
 * (who it is for, whether it is required, what it asks), with position
 * and size behind one disclosure because they are rarely typed.
 */
export function FieldInspector(props: FieldInspectorProps) {
  const { mod, page, primary, selection, signers } = props;
  const isMulti = selection.length > 1;
  const tool = getFieldTool(primary.type);
  const Icon = fieldToolIcons[primary.type];
  const sharedSigner = selection.every(
    (field) => field.signerId === primary.signerId,
  )
    ? primary.signerId
    : null;
  const signer = signers.find((entry) => entry.id === sharedSigner);
  const box = isMulti ? boundingRect(selection) : primary;
  const allOptional = selection.every((field) => canBeOptional(field.type));
  const required = selection.every((field) => field.required);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const layoutId = useId();

  const alignRow = (
    <div
      aria-label={isMulti ? "Align fields" : "Align to page"}
      className="flex items-center justify-between rounded-xl bg-(--track) p-1"
      role="group"
    >
      {alignments.map((alignment, index) => {
        const AlignIcon = alignment.icon;

        return (
          <span className="contents" key={alignment.value}>
            {index === 3 ? (
              <span aria-hidden="true" className="h-4 w-px bg-(--divider)" />
            ) : null}
            <IconButton
              aria-label={
                isMulti ? alignment.label : `${alignment.label} of page`
              }
              className="flex-1 rounded-[0.625rem] hover:bg-(--paper)"
              onClick={() => props.onAlign(alignment.value)}
              size="xs"
            >
              <AlignIcon />
            </IconButton>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {props.showHeader === false ? null : (
        <header className="flex items-center gap-3 px-4 pt-4 pb-1">
          <span
            aria-hidden="true"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[0.625rem]"
            style={{
              background: signer?.tint ?? "var(--surface)",
              color: signer?.color ?? "var(--secondary)",
            }}
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="truncate text-[0.9375rem] leading-5 font-semibold tracking-[-0.01em] text-(--fg)">
              {isMulti ? `${String(selection.length)} fields` : tool.label}
            </h2>
            <p className="truncate text-[0.8125rem] leading-5 text-(--secondary)">
              {signer ? `For ${signer.name}` : "Several signers"}
            </p>
          </div>
          <IconButton
            aria-label={isMulti ? "Duplicate fields" : "Duplicate field"}
            className="rounded-full"
            onClick={props.onDuplicate}
            shortcut={`${mod}D`}
            size="sm"
          >
            <CopyIcon />
          </IconButton>
          {props.onClose ? (
            <IconButton
              aria-label="Close"
              className="-mr-1 rounded-full"
              onClick={props.onClose}
              shortcut="Esc"
              size="sm"
            >
              <XIcon />
            </IconButton>
          ) : null}
        </header>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Group>
          <Row label="For">
            <SignerPicker
              activeSignerId={sharedSigner}
              onAssign={props.onAssign}
              signers={signers}
            />
          </Row>
          <RequiredRow
            disabled={!allOptional}
            isRadio={primary.type === "radio" && !isMulti}
            onChange={props.onSetRequired}
            required={allOptional ? required : true}
          />
        </Group>

        {!isMulti && hasTypeControls(primary.type) ? (
          <Group>
            <TypeControls key={primary.id} {...props} />
          </Group>
        ) : null}

        {isMulti ? <Group>{alignRow}</Group> : null}

        <Group className="gap-0 py-1.5">
          <button
            aria-controls={layoutId}
            aria-expanded={isLayoutOpen}
            className="group/disclosure -mx-2 flex min-h-10 items-center justify-between rounded-xl px-2 text-sm font-medium text-(--fg) outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) focus-visible:shadow-(--focus-ring)"
            onClick={() => setIsLayoutOpen((open) => !open)}
            type="button"
          >
            Position and size
            <span className="flex items-center gap-2 text-[0.8125rem] font-normal text-(--secondary) tabular-nums">
              {isLayoutOpen
                ? null
                : `${String(toPoints(box.width, page.widthPt))} × ${String(toPoints(box.height, page.heightPt))}`}
              <ChevronRightIcon
                aria-hidden="true"
                className={cn(
                  "size-4 transition-[rotate] duration-(--dur-move) ease-(--ease-out)",
                  isLayoutOpen && "rotate-90",
                )}
              />
            </span>
          </button>
          <AnimatePresence initial={false}>
            {isLayoutOpen ? (
              <motion.div
                animate={{ height: "auto", opacity: 1 }}
                className="-mx-1 overflow-hidden px-1"
                exit={{
                  height: 0,
                  opacity: 0,
                  transition: {
                    duration: exitDuration(DUR.panel),
                    ease: EASE.out,
                  },
                }}
                id={layoutId}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR.panel, ease: EASE.out }}
              >
                <div className="flex flex-col gap-2 pt-1 pb-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <ScrubInput
                      aria-label="Width in points"
                      disabled={isMulti}
                      label="W"
                      max={page.widthPt}
                      min={2}
                      onChange={(value) =>
                        props.onGeometry({ width: value / page.widthPt })
                      }
                      onScrubChange={props.onScrubChange}
                      value={toPoints(box.width, page.widthPt)}
                    />
                    <ScrubInput
                      aria-label="Height in points"
                      disabled={isMulti}
                      label="H"
                      max={page.heightPt}
                      min={2}
                      onChange={(value) =>
                        props.onGeometry({ height: value / page.heightPt })
                      }
                      onScrubChange={props.onScrubChange}
                      value={toPoints(box.height, page.heightPt)}
                    />
                    <ScrubInput
                      aria-label="Distance from the left edge in points"
                      disabled={isMulti}
                      label="X"
                      max={page.widthPt}
                      min={0}
                      onChange={(value) =>
                        props.onGeometry({ x: value / page.widthPt })
                      }
                      onScrubChange={props.onScrubChange}
                      value={toPoints(box.x, page.widthPt)}
                    />
                    <ScrubInput
                      aria-label="Distance from the top edge in points"
                      disabled={isMulti}
                      label="Y"
                      max={page.heightPt}
                      min={0}
                      onChange={(value) =>
                        props.onGeometry({ y: value / page.heightPt })
                      }
                      onScrubChange={props.onScrubChange}
                      value={toPoints(box.y, page.heightPt)}
                    />
                  </div>
                  {isMulti ? null : alignRow}
                  <p className="text-xs leading-5 text-(--secondary)">
                    In points. Drag a letter sideways to adjust.
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Group>
      </div>

      <footer className="p-2">
        <Button
          className="w-full justify-between rounded-xl"
          onClick={props.onDelete}
          variant="destructive-ghost"
        >
          <span className="inline-flex items-center gap-2">
            <Trash2Icon aria-hidden="true" />
            {isMulti
              ? `Delete ${String(selection.length)} fields`
              : "Delete field"}
          </span>
          <Kbd className="pointer-coarse:hidden">⌫</Kbd>
        </Button>
      </footer>
    </div>
  );
}

function hasTypeControls(type: PrepareFieldType) {
  return canHaveLabel(type) || type === "radio";
}

function RequiredRow({
  disabled,
  isRadio,
  onChange,
  required,
}: {
  disabled: boolean;
  isRadio: boolean;
  onChange: (required: boolean) => void;
  required: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <label
          className="text-sm leading-5 font-medium text-(--fg)"
          htmlFor={id}
        >
          {isRadio ? "Required (whole group)" : "Required"}
        </label>
        <p className="text-xs leading-4 text-(--secondary)" id={hintId}>
          {disabled
            ? "Signatures, initials and dates always are."
            : required
              ? "The signer has to fill it in."
              : "The signer may leave it empty."}
        </p>
      </div>
      <Switch
        aria-describedby={hintId}
        checked={required}
        disabled={disabled}
        id={id}
        onCheckedChange={onChange}
      />
    </div>
  );
}

/** Label, choices and radio-group controls, by field type. */
function TypeControls({
  group,
  onAddRadioButton,
  onSelectField,
  onSetLabel,
  onSetOptions,
  primary: field,
}: FieldInspectorProps) {
  // What is being typed, kept as typed. The field holds the tidied value;
  // without a copy of its own the box would lose a trailing space or an
  // empty line mid-thought. Keyed by field, so these start over for each.
  const [labelDraft, setLabelDraft] = useState(field.label ?? "");
  const [optionsDraft, setOptionsDraft] = useState(
    (field.options ?? []).join("\n"),
  );
  // The inspector can be on the page twice (the side panel and the phone
  // tray) and only one is typed in; each shows its own text only while
  // that still stands for the saved value.
  const shownLabel = labelTextToShow(labelDraft, field.label);
  const shownOptions = optionsTextToShow(optionsDraft, field.options);
  const editorId = useId();
  const optionsId = `${editorId}-options`;
  const labelId = `${editorId}-label`;
  const optionCount = field.options?.length ?? 0;
  const groupSize = group.length;

  return (
    <>
      {canHaveLabel(field.type) ? (
        <div className="flex flex-col gap-1.5">
          <label
            className="text-sm leading-5 font-medium text-(--fg)"
            htmlFor={labelId}
          >
            Label
          </label>
          <Input
            aria-describedby={`${labelId}-help`}
            className="h-10"
            id={labelId}
            maxLength={120}
            onChange={(event) => {
              setLabelDraft(event.target.value);
              onSetLabel(event.target.value.trim() || undefined);
            }}
            placeholder={defaultPrompt(field.type)}
            value={shownLabel}
          />
          <p
            className="text-xs leading-4 text-(--secondary)"
            id={`${labelId}-help`}
          >
            What the signer sees in the field.
          </p>
        </div>
      ) : null}

      {field.type === "dropdown" ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label
              className="text-sm leading-5 font-medium text-(--fg)"
              htmlFor={optionsId}
            >
              Choices
            </label>
            <span
              className={cn(
                "text-xs tabular-nums",
                optionCount < 2 ? "text-(--warning)" : "text-(--secondary)",
              )}
            >
              {optionCount} of {MAX_FIELD_OPTIONS}
            </span>
          </div>
          <Textarea
            aria-describedby={`${optionsId}-help`}
            aria-invalid={
              (shownOptions.trim() !== "" && optionCount < 2) || undefined
            }
            className="min-h-28 text-sm leading-6"
            id={optionsId}
            onChange={(event) => {
              setOptionsDraft(event.target.value);
              onSetOptions(parseOptionLines(event.target.value));
            }}
            placeholder={"Yes\nNo\nNot sure"}
            spellCheck={false}
            value={shownOptions}
          />
          <p
            className={cn(
              "text-xs leading-4",
              optionCount < 2 ? "text-(--warning)" : "text-(--secondary)",
            )}
            id={`${optionsId}-help`}
          >
            {optionCount < 2
              ? "One choice per line. Add at least two."
              : "One choice per line. The signer picks one."}
          </p>
        </div>
      ) : null}

      {field.type === "radio" ? (
        <div className="flex flex-col gap-2">
          <label
            className="text-sm leading-5 font-medium text-(--fg)"
            htmlFor={labelId}
          >
            What this button means
          </label>
          <Input
            aria-describedby={`${labelId}-help`}
            className="h-10"
            id={labelId}
            maxLength={MAX_FIELD_OPTION_LENGTH}
            onChange={(event) => {
              setLabelDraft(event.target.value);
              onSetLabel(event.target.value.trim() || undefined);
            }}
            placeholder="Yes"
            value={shownLabel}
          />
          <div
            aria-label="Buttons in this group"
            className="flex flex-wrap gap-1 pt-1"
            role="group"
          >
            {group.map((button) => {
              const isCurrent = button.id === field.id;

              return (
                <button
                  aria-current={isCurrent ? "true" : undefined}
                  className={cn(
                    "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium outline-none",
                    "transition-[background-color,color,scale] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.96] active:duration-(--dur-press)",
                    "focus-visible:shadow-(--focus-ring)",
                    isCurrent
                      ? "bg-(--accent-soft) text-(--accent-ink)"
                      : "bg-(--track) text-(--secondary-strong) hover:bg-(--surface-strong) hover:text-(--fg)",
                  )}
                  key={button.id}
                  onClick={() => onSelectField(button.id)}
                  type="button"
                >
                  <span className="truncate">
                    {button.label?.trim() || "Untitled"}
                  </span>
                  {button.page !== field.page ? (
                    <span className="text-xs font-normal opacity-80">
                      page {button.page}
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button
              aria-label="+ Add a button to this group"
              className={cn(
                "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.8125rem] font-medium text-(--accent-ink) outline-none",
                "transition-[background-color,scale] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--accent-soft) active:scale-[0.96] active:duration-(--dur-press)",
                "focus-visible:shadow-(--focus-ring) disabled:pointer-events-none disabled:opacity-45",
              )}
              disabled={groupSize >= MAX_RADIO_GROUP_BUTTONS}
              onClick={onAddRadioButton}
              type="button"
            >
              <PlusIcon aria-hidden="true" className="size-3.5" />
              Add
            </button>
          </div>
          <p
            className={cn(
              "text-xs leading-4",
              groupSize < 2 ? "text-(--warning)" : "text-(--secondary)",
            )}
            id={`${labelId}-help`}
          >
            {groupSize < 2
              ? "Add at least one more button so the signer has a choice."
              : `${String(groupSize)} buttons in this group. The signer picks one.`}
          </p>
        </div>
      ) : null}
    </>
  );
}

function defaultPrompt(type: PrepareFieldType) {
  switch (type) {
    case "number":
      return "Enter a number";
    case "dropdown":
      return "Choose one";
    case "checkbox":
      return "Checkbox";
    default:
      return "Enter text";
  }
}
