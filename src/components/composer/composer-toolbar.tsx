"use client";

import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CalendarDaysIcon,
  CheckListIcon,
  ClipboardPasteIcon,
  HighlighterIcon,
  ImageAddIcon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  LinkIcon,
  MinusIcon,
  MoreVerticalIcon,
  PlusIcon,
  QuoteDownIcon,
  Redo2Icon,
  SignatureIcon,
  SourceCodeIcon,
  TableIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextClearIcon,
  TextColorIcon,
  TextIndentLessIcon,
  TextIndentMoreIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextSubscriptIcon,
  TextSuperscriptIcon,
  TextUnderlineIcon,
  Undo2Icon,
} from "@/components/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SimpleTooltip } from "@/components/ui/tooltip";
import type {
  BlockType,
  ComposerEditor,
  FormatState,
} from "@/lib/composer/editor";
import {
  COMPOSER_FONTS,
  FONT_CATEGORY_LABELS,
  FONT_SIZES_PT,
  type FontCategory,
} from "@/lib/composer/fonts";
import { cn } from "@/lib/cn";

import {
  ColorButton,
  keepSelection,
  TableGrid,
  ToolButton,
  ToolDivider,
  ToolTrigger,
} from "./composer-controls";
import { altShortcut, mod, shortcut } from "./composer-keys";

export const BLOCK_LABELS: Record<BlockType, string> = {
  blockquote: "Quote",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  h5: "Heading 5",
  h6: "Heading 6",
  p: "Normal text",
  pre: "Code block",
  subtitle: "Subtitle",
  title: "Title",
};

const BLOCK_PREVIEW: Record<BlockType, string> = {
  blockquote: "border-l-2 border-(--border-strong) pl-2 text-(--secondary)",
  h1: "text-[1.25rem] font-bold",
  h2: "text-[1.0625rem] font-bold",
  h3: "text-[0.9375rem] font-bold",
  h4: "text-[0.875rem] font-bold",
  h5: "text-[0.8125rem] font-bold",
  h6: "text-[0.8125rem] italic text-(--secondary)",
  p: "text-[0.8125rem]",
  pre: "font-mono text-[0.75rem]",
  subtitle: "text-[0.9375rem] text-(--secondary)",
  title: "text-[1.375rem]",
};

const BLOCK_ORDER: BlockType[] = [
  "p",
  "title",
  "subtitle",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "pre",
];

export const SYMBOLS = [
  "©",
  "®",
  "™",
  "§",
  "¶",
  "†",
  "‡",
  "•",
  "…",
  "—",
  "–",
  "°",
  "±",
  "×",
  "÷",
  "≈",
  "≠",
  "≤",
  "≥",
  "½",
  "¼",
  "¾",
  "€",
  "£",
  "¥",
  "¢",
  "→",
  "←",
  "↑",
  "↓",
  "“",
  "”",
  "‘",
  "’",
  "«",
  "»",
  "µ",
  "Ω",
  "π",
  "∞",
  "√",
  "✓",
];

const LINE_HEIGHTS = [1, 1.15, 1.5, 2, 2.5, 3];

export type ToolbarActions = {
  onImage: () => void;
  onLink: () => void;
};

export function ComposerToolbar({
  actions,
  editor,
  state,
}: {
  actions: ToolbarActions;
  editor: ComposerEditor | null;
  state: FormatState;
}) {
  if (!editor) {
    return <div className="h-12 border-b border-(--divider) bg-(--paper)" />;
  }

  const closeFocus = (event: Event) => {
    event.preventDefault();
    editor.focus();
  };

  const alignIcon = {
    center: <TextAlignCenterIcon />,
    justify: <TextAlignJustifyIcon />,
    left: <TextAlignLeftIcon />,
    right: <TextAlignRightIcon />,
  }[state.align];

  return (
    <div
      aria-label="Formatting"
      className="relative border-b border-(--divider) bg-(--paper)"
      role="toolbar"
    >
      <div className="flex h-12 items-center gap-0.5 overflow-x-auto px-2 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden">
        <ToolButton
          disabled={!state.canUndo}
          label="Undo"
          onClick={() => editor.undo()}
          shortcut={shortcut("Z")}
        >
          <Undo2Icon />
        </ToolButton>
        <ToolButton
          disabled={!state.canRedo}
          label="Redo"
          onClick={() => editor.redo()}
          shortcut={shortcut("Z", true)}
        >
          <Redo2Icon />
        </ToolButton>
        <ToolButton
          label="Clear formatting"
          onClick={() => editor.clearFormatting()}
          shortcut={`${mod}\\`}
        >
          <TextClearIcon />
        </ToolButton>

        <ToolDivider />

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <ToolTrigger
              className="w-[8.25rem] justify-between"
              label="Paragraph style"
            >
              {BLOCK_LABELS[state.block]}
            </ToolTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" onCloseAutoFocus={closeFocus}>
            {BLOCK_ORDER.map((type) => (
              <DropdownMenuItem
                className={cn(
                  "justify-between",
                  state.block === type && "bg-(--accent-softer)",
                )}
                key={type}
                onSelect={() => editor.setBlockType(type)}
              >
                <span className={BLOCK_PREVIEW[type]}>
                  {BLOCK_LABELS[type]}
                </span>
                {type === "p" ? (
                  <DropdownMenuShortcut>
                    {altShortcut("0")}
                  </DropdownMenuShortcut>
                ) : /^h[1-6]$/.test(type) ? (
                  <DropdownMenuShortcut>
                    {altShortcut(type.slice(1))}
                  </DropdownMenuShortcut>
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolDivider />

        <FontMenu
          editor={editor}
          onCloseAutoFocus={closeFocus}
          value={state.fontFamily}
        />

        <ToolDivider />

        <FontSizeControl editor={editor} value={state.fontSizePt} />

        <ToolDivider />

        <ToolButton
          active={state.bold}
          label="Bold"
          onClick={() => editor.toggleMark("bold")}
          shortcut={shortcut("B")}
        >
          <TextBoldIcon />
        </ToolButton>
        <ToolButton
          active={state.italic}
          label="Italic"
          onClick={() => editor.toggleMark("italic")}
          shortcut={shortcut("I")}
        >
          <TextItalicIcon />
        </ToolButton>
        <ToolButton
          active={state.underline}
          label="Underline"
          onClick={() => editor.toggleMark("underline")}
          shortcut={shortcut("U")}
        >
          <TextUnderlineIcon />
        </ToolButton>
        <ToolButton
          active={state.strike}
          label="Strikethrough"
          onClick={() => editor.toggleMark("strikeThrough")}
          shortcut={shortcut("X", true)}
        >
          <TextStrikethroughIcon />
        </ToolButton>
        <ColorButton
          label="Text colour"
          onPick={(color) => editor.setColor(color)}
          resetLabel="Automatic"
          swatch={state.color}
          value={state.color}
        >
          <TextColorIcon />
        </ColorButton>
        <ColorButton
          label="Highlight colour"
          onPick={(color) => editor.setHighlight(color)}
          resetLabel="None"
          swatch={state.highlight}
          value={state.highlight}
        >
          <HighlighterIcon />
        </ColorButton>

        <ToolDivider />

        <ToolButton
          active={!!state.link}
          label={state.link ? "Edit link" : "Insert link"}
          onClick={actions.onLink}
          shortcut={shortcut("K")}
        >
          <LinkIcon />
        </ToolButton>
        <ToolButton label="Insert picture" onClick={actions.onImage}>
          <ImageAddIcon />
        </ToolButton>
        <TablePicker editor={editor} />
        <DropdownMenu modal={false}>
          <SimpleTooltip label="Insert" side="bottom">
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Insert"
                className="inline-flex size-(--control-h-sm) shrink-0 items-center justify-center rounded-[0.5rem] text-(--secondary-strong) outline-none hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring) data-[state=open]:bg-(--hover)"
                onMouseDown={keepSelection}
                type="button"
              >
                <PlusIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
          </SimpleTooltip>
          <DropdownMenuContent className="w-60" onCloseAutoFocus={closeFocus}>
            <InsertMenuItems
              editor={editor}
              onImage={actions.onImage}
              onLink={actions.onLink}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolDivider />

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <ToolTrigger
              className="px-2 [&_svg:first-child]:size-4"
              label="Align and indent"
            >
              <span className="flex items-center text-(--secondary-strong) [&_svg]:size-4">
                {alignIcon}
              </span>
            </ToolTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" onCloseAutoFocus={closeFocus}>
            {(
              [
                ["left", "Left", <TextAlignLeftIcon key="l" />, "L"],
                ["center", "Centre", <TextAlignCenterIcon key="c" />, "E"],
                ["right", "Right", <TextAlignRightIcon key="r" />, "R"],
                ["justify", "Justified", <TextAlignJustifyIcon key="j" />, "J"],
              ] as const
            ).map(([value, label, icon, key]) => (
              <DropdownMenuItem
                className={cn(state.align === value && "bg-(--accent-softer)")}
                key={value}
                onSelect={() => editor.setAlign(value)}
              >
                {icon}
                {label}
                <DropdownMenuShortcut>
                  {shortcut(key, true)}
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => editor.indent()}>
              <TextIndentMoreIcon />
              Increase indent
              <DropdownMenuShortcut>{mod}]</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => editor.outdent()}>
              <TextIndentLessIcon />
              Decrease indent
              <DropdownMenuShortcut>{mod}[</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <ToolTrigger className="px-2" label="Line and paragraph spacing">
              <span className="text-xs tabular-nums text-(--secondary-strong)">
                {state.lineHeight.toFixed(2).replace(/0$/, "")}
              </span>
            </ToolTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" onCloseAutoFocus={closeFocus}>
            <DropdownMenuLabel>Line spacing</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={(value) => editor.setLineHeight(Number(value))}
              value={String(
                LINE_HEIGHTS.find(
                  (height) => Math.abs(height - state.lineHeight) < 0.03,
                ) ?? "",
              )}
            >
              {LINE_HEIGHTS.map((height) => (
                <DropdownMenuRadioItem key={height} value={String(height)}>
                  {height === 1
                    ? "Single"
                    : height === 2
                      ? "Double"
                      : height.toFixed(2).replace(/0$/, "")}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={state.spaceBefore}
              onCheckedChange={() => editor.toggleSpacing("before")}
            >
              Space before paragraph
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={state.spaceAfter}
              onCheckedChange={() => editor.toggleSpacing("after")}
            >
              Space after paragraph
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolDivider />

        <ListButton
          editor={editor}
          kind="ul"
          onCloseAutoFocus={closeFocus}
          state={state}
        />
        <ListButton
          editor={editor}
          kind="ol"
          onCloseAutoFocus={closeFocus}
          state={state}
        />
        <ToolButton
          active={state.list === "checklist"}
          label="Checklist"
          onClick={() => editor.toggleList("checklist")}
          shortcut={shortcut("9", true)}
        >
          <CheckListIcon />
        </ToolButton>
        <ToolButton
          label="Decrease indent"
          onClick={() => editor.outdent()}
          shortcut={`${mod}[`}
        >
          <TextIndentLessIcon />
        </ToolButton>
        <ToolButton
          label="Increase indent"
          onClick={() => editor.indent()}
          shortcut={`${mod}]`}
        >
          <TextIndentMoreIcon />
        </ToolButton>

        <ToolDivider />

        <DropdownMenu modal={false}>
          <SimpleTooltip label="More formatting" side="bottom">
            <DropdownMenuTrigger asChild>
              <button
                aria-label="More formatting"
                className="inline-flex size-(--control-h-sm) shrink-0 items-center justify-center rounded-[0.5rem] text-(--secondary-strong) outline-none hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring) data-[state=open]:bg-(--hover)"
                onMouseDown={keepSelection}
                type="button"
              >
                <MoreVerticalIcon className="size-4" />
              </button>
            </DropdownMenuTrigger>
          </SimpleTooltip>
          <DropdownMenuContent
            align="end"
            className="w-64"
            onCloseAutoFocus={closeFocus}
          >
            <DropdownMenuCheckboxItem
              checked={state.superscript}
              onCheckedChange={() => editor.toggleMark("superscript")}
            >
              <TextSuperscriptIcon />
              Superscript
              <DropdownMenuShortcut>{mod}.</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={state.subscript}
              onCheckedChange={() => editor.toggleMark("subscript")}
            >
              <TextSubscriptIcon />
              Subscript
              <DropdownMenuShortcut>{mod},</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={state.code}
              onCheckedChange={() => editor.toggleCode()}
            >
              <SourceCodeIcon />
              Inline code
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                editor.setBlockType(
                  state.block === "blockquote" ? "p" : "blockquote",
                )
              }
            >
              <QuoteDownIcon />
              {state.block === "blockquote" ? "Remove quote" : "Quote"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.setBlockType(state.block === "pre" ? "p" : "pre")
              }
            >
              <SourceCodeIcon />
              {state.block === "pre" ? "Remove code block" : "Code block"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => void editor.pasteFromClipboard(true)}
            >
              <ClipboardPasteIcon />
              Paste without formatting
              <DropdownMenuShortcut>{shortcut("V", true)}</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function InsertMenuItems({
  editor,
  onImage,
  onLink,
}: {
  editor: ComposerEditor;
  onImage: () => void;
  onLink: () => void;
}) {
  return (
    <>
      <DropdownMenuItem onSelect={onImage}>
        <ImageAddIcon />
        Picture…
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => editor.insertTable(3, 3)}>
        <TableIcon />
        Table (3 × 3)
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={onLink}>
        <LinkIcon />
        Link…
        <DropdownMenuShortcut>{shortcut("K")}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => editor.insertHorizontalRule()}>
        <MinusIcon />
        Horizontal line
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => editor.insertPageBreak()}>
        <span
          aria-hidden="true"
          className="flex size-4 flex-col justify-center gap-[3px]"
        >
          <span className="h-px w-full bg-current opacity-60" />
          <span className="h-px w-full border-t border-dashed border-current" />
        </span>
        Page break
        <DropdownMenuShortcut>{shortcut("↵")}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => editor.insertDate()}>
        <CalendarDaysIcon />
        Today’s date
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => editor.insertSignatureBlock()}>
        <SignatureIcon />
        Signature lines
      </DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <span aria-hidden="true" className="w-4 text-center text-sm">
            Ω
          </span>
          Special character
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-auto p-2">
          <div className="grid grid-cols-7 gap-0.5">
            {SYMBOLS.map((symbol) => (
              <DropdownMenuItem
                aria-label={`Insert ${symbol}`}
                className="size-8 min-h-0 justify-center p-0 text-[0.9375rem]"
                key={symbol}
                onSelect={() => editor.insertSymbol(symbol)}
              >
                {symbol}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}

function FontMenu({
  editor,
  onCloseAutoFocus,
  value,
}: {
  editor: ComposerEditor;
  onCloseAutoFocus: (event: Event) => void;
  value: string;
}) {
  const groups = new Map<FontCategory, (typeof COMPOSER_FONTS)[number][]>();
  for (const font of COMPOSER_FONTS) {
    groups.set(font.category, [...(groups.get(font.category) ?? []), font]);
  }
  const current = COMPOSER_FONTS.find((font) => font.family === value);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolTrigger className="w-[8.5rem] justify-between" label="Font">
          <span style={{ fontFamily: current?.stack }}>{value}</span>
        </ToolTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] w-60"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {[...groups.entries()].map(([category, fonts], index) => (
          <div key={category}>
            {index > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel>
              {FONT_CATEGORY_LABELS[category]}
            </DropdownMenuLabel>
            {fonts.map((font) => (
              <DropdownMenuItem
                className={cn(
                  "justify-between text-[0.9375rem]",
                  font.family === value && "bg-(--accent-softer)",
                )}
                key={font.family}
                onSelect={() => editor.setFontFamily(font.family)}
                style={{ fontFamily: font.stack }}
              >
                {font.family}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FontSizeControl({
  editor,
  value,
}: {
  editor: ComposerEditor;
  value: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const apply = (next: number) => {
    if (Number.isFinite(next) && next > 0) {
      editor.setFontSize(Math.min(400, next));
    }
    setOpen(false);
  };

  return (
    <div className="flex shrink-0 items-center">
      <ToolButton
        label="Decrease font size"
        onClick={() => editor.stepFontSize(-1)}
        shortcut={shortcut("<", true)}
      >
        <MinusIcon />
      </ToolButton>
      <Popover
        onOpenChange={(next) => {
          if (next) setDraft(String(value));
          setOpen(next);
        }}
        open={open}
      >
        <PopoverTrigger asChild>
          <button
            aria-label={`Font size, ${value} points`}
            className="h-7 w-10 rounded-[0.4375rem] border border-(--border) bg-(--paper) text-center text-[0.8125rem] font-medium tabular-nums text-(--fg) outline-none hover:border-(--border-hover) focus-visible:shadow-(--focus-ring) data-[state=open]:border-(--accent)"
            onMouseDown={keepSelection}
            type="button"
          >
            {value}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="w-36 p-1.5"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
          }}
        >
          <form
            className="p-1"
            onSubmit={(event) => {
              event.preventDefault();
              apply(Number.parseFloat(draft));
            }}
          >
            <input
              aria-label="Font size in points"
              autoFocus
              className="h-8 w-full rounded-[0.4375rem] border border-(--border) bg-(--paper) px-2 text-center text-sm tabular-nums outline-none focus:border-(--accent) focus:shadow-(--focus-ring-input)"
              inputMode="decimal"
              onChange={(event) => setDraft(event.target.value)}
              onFocus={(event) => event.target.select()}
              value={draft}
            />
          </form>
          <div className="mt-1 max-h-56 overflow-y-auto">
            {FONT_SIZES_PT.map((size) => (
              <button
                className={cn(
                  "flex h-8 w-full items-center rounded-[0.4375rem] px-3 text-left text-[0.8125rem] tabular-nums outline-none hover:bg-(--hover) focus-visible:bg-(--hover)",
                  size === value &&
                    "bg-(--accent-softer) font-medium text-(--accent-ink)",
                )}
                key={size}
                onClick={() => apply(size)}
                type="button"
              >
                {size}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <ToolButton
        label="Increase font size"
        onClick={() => editor.stepFontSize(1)}
        shortcut={shortcut(">", true)}
      >
        <PlusIcon />
      </ToolButton>
    </div>
  );
}

function TablePicker({ editor }: { editor: ComposerEditor }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <SimpleTooltip label="Insert table" side="bottom">
        <PopoverTrigger asChild>
          <button
            aria-label="Insert table"
            className="inline-flex size-(--control-h-sm) shrink-0 items-center justify-center rounded-[0.5rem] text-(--secondary-strong) outline-none hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring) data-[state=open]:bg-(--hover)"
            onMouseDown={keepSelection}
            type="button"
          >
            <TableIcon className="size-4" />
          </button>
        </PopoverTrigger>
      </SimpleTooltip>
      <PopoverContent
        align="start"
        className="w-auto p-3"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <TableGrid
          onPick={(rows, columns) => {
            setOpen(false);
            editor.insertTable(rows, columns);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

const BULLET_STYLES = [
  ["disc", "●  Filled circle"],
  ["circle", "○  Hollow circle"],
  ["square", "■  Square"],
] as const;

const NUMBER_STYLES = [
  ["decimal", "1.  2.  3."],
  ["lower-alpha", "a.  b.  c."],
  ["upper-alpha", "A.  B.  C."],
  ["lower-roman", "i.  ii.  iii."],
  ["upper-roman", "I.  II.  III."],
] as const;

function ListButton({
  editor,
  kind,
  onCloseAutoFocus,
  state,
}: {
  editor: ComposerEditor;
  kind: "ul" | "ol";
  onCloseAutoFocus: (event: Event) => void;
  state: FormatState;
}) {
  const active = state.list === kind;
  const label = kind === "ul" ? "Bulleted list" : "Numbered list";
  const styles = kind === "ul" ? BULLET_STYLES : NUMBER_STYLES;

  return (
    <div className="flex shrink-0 items-center">
      <ToolButton
        active={active}
        label={label}
        onClick={() => editor.toggleList(kind)}
        shortcut={shortcut(kind === "ul" ? "8" : "7", true)}
      >
        {kind === "ul" ? (
          <LeftToRightListBulletIcon />
        ) : (
          <LeftToRightListNumberIcon />
        )}
      </ToolButton>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`${label} styles`}
            className="-ml-1 inline-flex h-(--control-h-sm) w-4 items-center justify-center rounded-[0.375rem] text-(--tertiary) outline-none hover:bg-(--hover) hover:text-(--fg) focus-visible:shadow-(--focus-ring) data-[state=open]:bg-(--hover)"
            onMouseDown={keepSelection}
            type="button"
          >
            <svg aria-hidden="true" className="size-2.5" viewBox="0 0 10 10">
              <path
                d="M2 4l3 3 3-3"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-52"
          onCloseAutoFocus={onCloseAutoFocus}
        >
          {styles.map(([style, preview]) => (
            <DropdownMenuItem
              className={cn(
                "font-mono text-[0.8125rem] whitespace-pre",
                active && state.listStyle === style && "bg-(--accent-softer)",
              )}
              key={style}
              onSelect={() => {
                if (state.list !== kind) editor.toggleList(kind);
                editor.setListStyle(style);
              }}
            >
              {preview}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
