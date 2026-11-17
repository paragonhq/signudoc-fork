"use client";

import { ChevronDownIcon } from "@/components/ui/icons";
import { motion } from "motion/react";
import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { cn } from "@/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SPRING_SNAPPY } from "@/components/ui/motion-tokens";
import { SimpleTooltip } from "@/components/ui/tooltip";

import { fieldToolIcons, SignLine } from "./field-glyphs";
import {
  fieldTools,
  summarizeSigner,
  type FieldTool,
  type PrepareField,
  type PrepareFieldType,
  type PrepareShellSigner,
} from "./model";
import { ShortcutsButton } from "./shortcuts";
import { SignerAvatar } from "./signer-avatar";

const DRAG_THRESHOLD_PX = 4;

type DockDrag = {
  dragging: boolean;
  height: number;
  over: boolean;
  pointerId: number;
  rect: DOMRect | null;
  startX: number;
  startY: number;
  tool: FieldTool;
  width: number;
};

type ToolDockProps = {
  armedTool: PrepareFieldType | null;
  /** Every field, for each signer's "Signature ready" line. */
  fields: readonly PrepareField[];
  /** The element fields are placed in (the page), for drop hit-testing. */
  getDropTarget: () => HTMLElement | null;
  onArm: (type: PrepareFieldType) => void;
  /** A tool was dragged out of the dock and let go over the page. */
  onDropTool: (
    type: PrepareFieldType,
    clientX: number,
    clientY: number,
  ) => void;
  /** "⌘" or "Ctrl", for the shortcuts list. */
  mod: string;
  /** A drag out of the dock started (true) or ended (false). */
  onDragStateChange?: (isDragging: boolean) => void;
  onSelectSigner: (signerId: string) => void;
  selectedSigner: PrepareShellSigner;
  signers: readonly PrepareShellSigner[];
};

/**
 * The floating white dock at the foot of the desk: who new fields are for
 * (their avatar; the menu says who still needs somewhere to sign), the
 * eight field tools, and the keyboard shortcuts. Click a tool to arm it (or press its
 * number), then click the page; or drag a tool straight onto the page,
 * where a ghost of the field follows the pointer exactly and lands where
 * it is let go.
 */
export function ToolDock({
  armedTool,
  fields,
  getDropTarget,
  mod,
  onArm,
  onDragStateChange,
  onDropTool,
  onSelectSigner,
  selectedSigner,
  signers,
}: ToolDockProps) {
  const selectedSummary = summarizeSigner(fields, selectedSigner.id);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DockDrag | null>(null);
  const suppressClickRef = useRef(false);
  const dragStateRef = useRef(onDragStateChange);

  useEffect(() => {
    dragStateRef.current = onDragStateChange;
  });

  useEffect(() => {
    function cancelOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && dragRef.current?.dragging) {
        event.stopPropagation();
        dragRef.current = null;
        hideGhost();
        dragStateRef.current?.(false);
      }
    }

    window.addEventListener("keydown", cancelOnEscape, true);

    return () => window.removeEventListener("keydown", cancelOnEscape, true);
  }, []);

  function hideGhost() {
    const ghost = ghostRef.current;

    if (ghost) {
      ghost.dataset.active = "false";
      ghost.dataset.over = "false";
    }
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    tool: FieldTool,
  ) {
    // Touch arms the tool with a tap; dragging out is for mouse and pen.
    if (event.button !== 0 || event.pointerType === "touch") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      dragging: false,
      height: 0,
      over: false,
      pointerId: event.pointerId,
      rect: null,
      startX: event.clientX,
      startY: event.clientY,
      tool,
      width: 0,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const ghost = ghostRef.current;

    if (!drag || drag.pointerId !== event.pointerId || !ghost) {
      return;
    }

    if (!drag.dragging) {
      if (
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) <
        DRAG_THRESHOLD_PX
      ) {
        return;
      }

      // One layout read, at the start: where the page is and how big a
      // field of this kind is on it at the current zoom.
      const rect = getDropTarget()?.getBoundingClientRect() ?? null;

      drag.dragging = true;
      drag.rect = rect;
      drag.width = Math.max(18, (rect?.width ?? 600) * drag.tool.defaultWidth);
      drag.height = Math.max(
        14,
        (rect?.height ?? 800) * drag.tool.defaultHeight,
      );
      ghost.style.width = `${drag.width}px`;
      ghost.style.height = `${drag.height}px`;
      ghost.dataset.type = drag.tool.type;
      ghost.dataset.active = "true";
      renderGhostContent(ghost, drag.tool);
      onDragStateChange?.(true);
    }

    const rect = drag.rect;
    const over =
      rect !== null &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    drag.over = over;
    ghost.dataset.over = String(over);
    ghost.style.transform = `translate3d(${event.clientX - drag.width / 2}px, ${event.clientY - drag.height / 2}px, 0)`;
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!drag.dragging) {
      return;
    }

    suppressClickRef.current = true;
    hideGhost();
    onDragStateChange?.(false);

    if (drag.over && event.type === "pointerup") {
      onDropTool(drag.tool.type, event.clientX, event.clientY);
    }
  }

  // The ghost's inner parts are static per tool; filled in once per drag
  // instead of re-rendering the dock.
  function renderGhostContent(ghost: HTMLDivElement, tool: FieldTool) {
    const label = ghost.querySelector<HTMLElement>("[data-ghost-label]");

    if (label) {
      label.textContent = tool.placeholderLabel;
    }

    ghost.querySelectorAll<HTMLElement>("[data-ghost-icon]").forEach((icon) => {
      icon.hidden = icon.dataset.ghostIcon !== tool.type;
    });
  }

  return (
    <>
      <div
        aria-label="Field tools"
        className="pointer-events-auto flex items-center gap-1 rounded-full bg-(--paper) p-1.5 shadow-(--shadow-pop)"
        role="toolbar"
      >
        <DropdownMenu>
          <SimpleTooltip label="Who new fields are for">
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`New fields for ${selectedSigner.name}`}
                className={cn(
                  "flex h-10 max-w-48 items-center gap-2 rounded-full pr-3 pl-1 outline-none",
                  "transition-[background-color,scale] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.97] active:duration-(--dur-press)",
                  "hover:bg-(--hover) focus-visible:shadow-(--focus-ring) data-[state=open]:bg-(--hover)",
                )}
                type="button"
              >
                <SignerAvatar className="size-8" signer={selectedSigner} />
                <span className="flex min-w-0 flex-col items-start leading-4">
                  <span className="max-w-full truncate text-[0.8125rem] font-medium text-(--fg)">
                    {selectedSigner.name.split(" ")[0]}
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate text-xs",
                      selectedSummary.hasSignature
                        ? "text-(--secondary)"
                        : "text-(--warning)",
                    )}
                  >
                    {selectedSummary.hasSignature
                      ? "Signature ready"
                      : "Needs a signature"}
                  </span>
                </span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-(--secondary)"
                />
              </button>
            </DropdownMenuTrigger>
          </SimpleTooltip>
          <DropdownMenuContent
            align="start"
            className="w-72"
            side="top"
            sideOffset={14}
          >
            <DropdownMenuLabel>New fields are for</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={onSelectSigner}
              value={selectedSigner.id}
            >
              {signers.map((signer) => {
                const summary = summarizeSigner(fields, signer.id);

                return (
                  <DropdownMenuRadioItem
                    className="py-2"
                    key={signer.id}
                    value={signer.id}
                  >
                    <SignerAvatar signer={signer} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-(--fg)">
                        {signer.name}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs",
                          summary.hasSignature
                            ? "text-(--secondary)"
                            : "text-(--warning)",
                        )}
                      >
                        {summary.hasSignature
                          ? `${String(summary.count)} ${summary.count === 1 ? "field" : "fields"}, ready to sign`
                          : "Needs a signature"}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <span aria-hidden="true" className="mx-1 h-6 w-px bg-(--divider)" />

        {fieldTools.map((tool) => {
          const Icon = fieldToolIcons[tool.type];
          const isArmed = armedTool === tool.type;

          return (
            <SimpleTooltip
              key={tool.type}
              label={tool.label}
              shortcut={tool.key}
            >
              <button
                aria-label={tool.label}
                aria-pressed={isArmed}
                className={cn(
                  "relative isolate inline-flex size-10 shrink-0 cursor-grab items-center justify-center rounded-full outline-none active:cursor-grabbing",
                  "transition-[color,scale] duration-(--dur-hover) ease-(--ease-out) active:scale-[0.94] active:duration-(--dur-press)",
                  "focus-visible:shadow-(--focus-ring)",
                  isArmed
                    ? "text-(--accent-ink)"
                    : "text-(--secondary) hover:bg-(--hover) hover:text-(--fg)",
                )}
                onClick={() => {
                  if (suppressClickRef.current) {
                    suppressClickRef.current = false;
                    return;
                  }

                  onArm(tool.type);
                }}
                onLostPointerCapture={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerDown={(event) => handlePointerDown(event, tool)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                type="button"
              >
                {isArmed ? (
                  // One soft pill travels to whichever tool is armed.
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-full bg-(--accent-soft)"
                    layoutId="builder-dock-armed"
                    transition={SPRING_SNAPPY}
                  />
                ) : null}
                <Icon
                  aria-hidden="true"
                  className="size-[1.1875rem]"
                  strokeWidth={1.75}
                />
              </button>
            </SimpleTooltip>
          );
        })}

        <span aria-hidden="true" className="mx-1 h-6 w-px bg-(--divider)" />
        <ShortcutsButton mod={mod} />
      </div>

      {/* The drag ghost: one fixed element, moved with transforms. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed top-0 left-0 z-50 flex items-center gap-1.5 overflow-hidden rounded-[0.3125rem] border px-2 text-xs font-medium",
          "opacity-0 data-[active=true]:opacity-95 data-[active=true]:data-[over=false]:opacity-55 data-[over=false]:border-dashed",
          "shadow-(--shadow-pop)",
          "data-[type=checkbox]:justify-center data-[type=checkbox]:px-0 data-[type=radio]:justify-center data-[type=radio]:rounded-full data-[type=radio]:px-0",
        )}
        data-active="false"
        data-over="false"
        ref={ghostRef}
        style={{
          backgroundColor: selectedSigner.tint,
          borderColor: selectedSigner.color,
          color: selectedSigner.color,
        }}
      >
        {fieldTools.map((tool) => {
          const Icon = fieldToolIcons[tool.type];

          return (
            <span
              className="inline-flex [&[hidden]]:hidden"
              data-ghost-icon={tool.type}
              hidden
              key={tool.type}
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
            </span>
          );
        })}
        <span
          className="truncate in-data-[type=checkbox]:hidden in-data-[type=radio]:hidden"
          data-ghost-label
        />
        <span className="hidden in-data-[type=initials]:block in-data-[type=signature]:block">
          <SignLine />
        </span>
      </div>
    </>
  );
}
