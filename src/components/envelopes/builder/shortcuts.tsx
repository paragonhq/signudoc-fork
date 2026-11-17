"use client";

import { KeyboardIcon } from "@/components/ui/icons";

import { IconButton } from "@/components/ui/icon-button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * The builder's keys, behind one quiet keyboard button at the end of the
 * dock: there when someone wants to go faster, out of the way otherwise.
 */
export function ShortcutsButton({ mod }: { mod: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          aria-label="Keyboard shortcuts"
          className="rounded-full"
          size="md"
        >
          <KeyboardIcon />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-4"
        side="top"
        sideOffset={14}
      >
        <h2 className="mb-3 text-sm font-semibold text-(--fg)">
          Keyboard shortcuts
        </h2>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 text-[0.8125rem] text-(--secondary)">
          <Shortcut keys={["1", "–", "9"]} label="Pick a field" />
          <Shortcut keys={["⇧", "Click"]} label="Select several" />
          <Shortcut keys={["←", "→", "↑", "↓"]} label="Nudge (⇧ for 10)" />
          <Shortcut keys={[mod, "D"]} label="Duplicate" />
          <Shortcut keys={["⌫"]} label="Delete" />
          <Shortcut keys={[mod, "Z"]} label="Undo" />
          <Shortcut keys={["⇧", mod, "Z"]} label="Redo" />
          <Shortcut keys={["Alt"]} label="Drag without snapping" />
          <Shortcut keys={["Esc"]} label="Deselect" />
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>
        <KbdGroup>
          {keys.map((key, index) =>
            key === "–" ? (
              <span
                aria-hidden="true"
                className="px-0.5 text-(--secondary)"
                key={index}
              >
                –
              </span>
            ) : (
              <Kbd key={index}>{key}</Kbd>
            ),
          )}
        </KbdGroup>
      </dd>
    </>
  );
}
