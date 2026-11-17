"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from "@/components/ui/icons";
import { type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  Tray,
  TrayBody,
  TrayContent,
  TrayDescription,
  TrayHeader,
  TrayTitle,
} from "@/components/ui/tray";

import { fieldToolIcons } from "./field-glyphs";
import {
  fieldTools,
  getFieldTool,
  type PrepareField,
  type PrepareFieldType,
  type PrepareShellSigner,
} from "./model";
import { SignerAvatar } from "./signer-avatar";

type MobileBarProps = {
  activePage: number;
  armedTool: PrepareFieldType | null;
  /** A gentle note about what still blocks Next, above the bar. */
  blocker: ReactNode;
  canUndo: boolean;
  /** Field selected while the inspector is not on screen (phones). */
  contextField: PrepareField | null;
  contextCount: number;
  onCancelArm: () => void;
  onDelete: () => void;
  onDeselect: () => void;
  onDuplicate: () => void;
  onOpenInspector: () => void;
  onOpenSigners: () => void;
  onOpenTools: () => void;
  onPageChange: (page: number) => void;
  onUndo: () => void;
  pageCount: number;
  selectedSigner: PrepareShellSigner;
};

const barButton =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-(--fg) outline-none transition-[background-color,scale] duration-(--dur-hover) ease-(--ease-out) hover:bg-(--hover) active:scale-[0.96] active:bg-(--press) active:duration-(--dur-press) focus-visible:shadow-(--focus-ring)";

const barIcon = "size-11 rounded-full text-(--fg) disabled:opacity-35";

/**
 * The phone and tablet bar floating over the foot of the desk (a white
 * pill, in the thumb zone): who new fields are for, pages, undo and "Add
 * field". While a tool is
 * armed it says what a tap will do; while a field is selected on a phone,
 * it carries that field's actions.
 */
export function MobileBar(props: MobileBarProps) {
  const {
    activePage,
    armedTool,
    blocker,
    contextField,
    pageCount,
    selectedSigner,
  } = props;
  let content: ReactNode;

  if (armedTool) {
    const tool = getFieldTool(armedTool);
    const Icon = fieldToolIcons[armedTool];

    content = (
      <>
        <span
          className="ml-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{
            background: selectedSigner.tint,
            color: selectedSigner.color,
          }}
        >
          <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </span>
        <p className="min-w-0 flex-1 leading-5" aria-live="polite">
          <span className="block truncate text-sm font-medium text-(--fg)">
            Tap to place {tool.label.toLowerCase()}
          </span>
          <span className="block truncate text-xs text-(--secondary)">
            For {selectedSigner.name}
          </span>
        </p>
        <button className={barButton} onClick={props.onCancelArm} type="button">
          Cancel
        </button>
      </>
    );
  } else if (contextField) {
    const tool = getFieldTool(contextField.type);
    const Icon = fieldToolIcons[contextField.type];

    content = (
      <>
        <button
          className={cn(
            barButton,
            "min-w-0 flex-1 justify-start bg-(--track) pl-1.5",
          )}
          onClick={props.onOpenInspector}
          type="button"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-(--paper)">
            <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </span>
          <span className="truncate">
            {props.contextCount > 1
              ? `${String(props.contextCount)} fields`
              : tool.label}
          </span>
          <SlidersHorizontalIcon
            aria-hidden="true"
            className="ml-auto size-4 shrink-0 text-(--secondary)"
          />
          <span className="sr-only">: edit</span>
        </button>
        <IconButton
          aria-label="Duplicate field"
          className={barIcon}
          onClick={props.onDuplicate}
          tooltip={false}
        >
          <CopyIcon />
        </IconButton>
        <IconButton
          aria-label="Delete field"
          className={barIcon}
          onClick={props.onDelete}
          tooltip={false}
        >
          <Trash2Icon />
        </IconButton>
        <IconButton
          aria-label="Deselect"
          className={barIcon}
          onClick={props.onDeselect}
          tooltip={false}
        >
          <XIcon />
        </IconButton>
      </>
    );
  } else {
    content = (
      <>
        <button
          aria-label={`New fields for ${selectedSigner.name}. Change signer`}
          className={cn(barButton, "px-1.5")}
          onClick={props.onOpenSigners}
          type="button"
        >
          <SignerAvatar className="size-8" signer={selectedSigner} />
        </button>
        <div className="flex items-center">
          <IconButton
            aria-label="Previous page"
            className={barIcon}
            disabled={activePage <= 1}
            onClick={() => props.onPageChange(activePage - 1)}
            tooltip={false}
          >
            <ChevronLeftIcon />
          </IconButton>
          <span className="min-w-12 text-center text-[0.8125rem] font-medium text-(--fg) tabular-nums">
            <span className="sr-only">Page </span>
            {activePage}
            <span className="text-(--secondary)"> of {pageCount}</span>
          </span>
          <IconButton
            aria-label="Next page"
            className={barIcon}
            disabled={activePage >= pageCount}
            onClick={() => props.onPageChange(activePage + 1)}
            tooltip={false}
          >
            <ChevronRightIcon />
          </IconButton>
        </div>
        <IconButton
          aria-label="Undo"
          className={barIcon}
          disabled={!props.canUndo}
          onClick={props.onUndo}
          tooltip={false}
        >
          <Undo2Icon />
        </IconButton>
        <Button className="ml-auto h-11" onClick={props.onOpenTools}>
          <PlusIcon aria-hidden="true" />
          Add field
        </Button>
      </>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      {blocker && !armedTool ? (
        <div className="pointer-events-auto max-w-full">{blocker}</div>
      ) : null}
      <div
        aria-label="Builder"
        className="pointer-events-auto flex min-h-14 w-full max-w-xl items-center gap-1 rounded-full bg-(--paper) p-1.5 shadow-(--shadow-pop)"
        role="toolbar"
      >
        {content}
      </div>
    </div>
  );
}

/** The eight tools, in a tray. Tap one, then tap the page. */
export function ToolsTray({
  armedTool,
  onOpenChange,
  onPick,
  open,
  selectedSigner,
}: {
  armedTool: PrepareFieldType | null;
  onOpenChange: (open: boolean) => void;
  onPick: (type: PrepareFieldType) => void;
  open: boolean;
  selectedSigner: PrepareShellSigner;
}) {
  return (
    <Tray onOpenChange={onOpenChange} open={open}>
      <TrayContent size="sm">
        <TrayHeader>
          <div className="flex flex-col gap-1">
            <TrayTitle>Add a field</TrayTitle>
            <TrayDescription>
              Pick one, then tap where it goes. For {selectedSigner.name}.
            </TrayDescription>
          </div>
        </TrayHeader>
        <TrayBody className="pb-5">
          <div className="grid grid-cols-2 gap-1.5">
            {fieldTools.map((tool) => {
              const Icon = fieldToolIcons[tool.type];
              const isArmed = armedTool === tool.type;

              return (
                <button
                  aria-pressed={isArmed}
                  className={cn(
                    "flex h-14 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium outline-none",
                    "transition-[background-color,scale] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.97] active:duration-(--dur-press)",
                    "focus-visible:shadow-(--focus-ring)",
                    isArmed
                      ? "bg-(--accent-soft) text-(--accent-ink)"
                      : "bg-(--track) text-(--fg) hover:bg-(--surface-strong)",
                  )}
                  key={tool.type}
                  onClick={() => onPick(tool.type)}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-[0.625rem]"
                    style={{
                      background: "var(--paper)",
                      color: selectedSigner.color,
                    }}
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  {tool.label}
                </button>
              );
            })}
          </div>
        </TrayBody>
      </TrayContent>
    </Tray>
  );
}

export function PanelTray({
  children,
  description,
  onOpenChange,
  open,
  title,
}: {
  children: ReactNode;
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  return (
    <Tray onOpenChange={onOpenChange} open={open}>
      <TrayContent size="sm">
        <TrayHeader>
          <div className="flex flex-col gap-1">
            <TrayTitle>{title}</TrayTitle>
            {description ? (
              <TrayDescription>{description}</TrayDescription>
            ) : null}
          </div>
        </TrayHeader>
        <TrayBody className="px-0 pb-2">{children}</TrayBody>
      </TrayContent>
    </Tray>
  );
}
