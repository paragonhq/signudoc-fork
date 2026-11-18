"use client";

import { useState, type ReactNode } from "react";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  CalendarDaysIcon,
  ClipboardIcon,
  ClipboardPasteIcon,
  DeleteColumnIcon,
  DeleteRowIcon,
  ExternalLinkIcon,
  ImageAddIcon,
  InsertColumnLeftIcon,
  InsertColumnRightIcon,
  InsertRowDownIcon,
  InsertRowUpIcon,
  LeftToRightListBulletIcon,
  LinkIcon,
  MinusIcon,
  PaintBrushIcon,
  ParagraphIcon,
  ScissorsIcon,
  SignatureIcon,
  TableIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
  TextBoldIcon,
  TextClearIcon,
  TextIndentLessIcon,
  TextIndentMoreIcon,
  TextSelectionIcon,
  Trash2Icon,
  UnlinkIcon,
} from "@/components/ui/icons";
import type {
  BlockType,
  ComposerEditor,
  FormatState,
} from "@/lib/composer/editor";

import { ColorGrid } from "./composer-controls";
import { altShortcut, mod, shortcut } from "./composer-keys";
import { BLOCK_LABELS, SYMBOLS } from "./composer-toolbar";

type Props = {
  children: ReactNode;
  editor: ComposerEditor | null;
  onImage: () => void;
  onLink: () => void;
  readState: () => FormatState | null;
};

export function ComposerContextMenu({
  children,
  editor,
  onImage,
  onLink,
  readState,
}: Props) {
  // Read once when the menu opens, so its items match where it was opened.
  const [state, setState] = useState<FormatState | null>(null);
  const image = editor?.getSelectedImage() ?? null;

  return (
    <ContextMenu
      modal={false}
      onOpenChange={(open) => {
        if (open) setState(readState());
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      {editor && state ? (
        <ContextMenuContent
          className="w-72"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            editor.focus();
          }}
        >
          <ContextMenuItem
            disabled={!state.hasSelection && !image}
            onSelect={() => editor.copySelection(true)}
          >
            <ScissorsIcon />
            Cut
            <ContextMenuShortcut>{shortcut("X")}</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            disabled={!state.hasSelection && !image}
            onSelect={() => editor.copySelection(false)}
          >
            <ClipboardIcon />
            Copy
            <ContextMenuShortcut>{shortcut("C")}</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => void editor.pasteFromClipboard(false)}
          >
            <ClipboardPasteIcon />
            Paste
            <ContextMenuShortcut>{shortcut("V")}</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => void editor.pasteFromClipboard(true)}
          >
            <ClipboardPasteIcon />
            Paste without formatting
            <ContextMenuShortcut>{shortcut("V", true)}</ContextMenuShortcut>
          </ContextMenuItem>

          <ContextMenuSeparator />

          {image ? (
            <>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <ImageAddIcon />
                  Picture size
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {(
                    [
                      ["Small", 0.25],
                      ["Medium", 0.5],
                      ["Large", 0.75],
                      ["Full width", 1],
                    ] as const
                  ).map(([label, share]) => (
                    <ContextMenuItem
                      key={label}
                      onSelect={() => {
                        const width =
                          (editor.root.getBoundingClientRect().width /
                            editor.zoom()) *
                          0.75 *
                          share;
                        editor.setImageWidth(image, width);
                      }}
                    >
                      {label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuItem
                variant="destructive"
                onSelect={() => editor.removeImage(image)}
              >
                <Trash2Icon />
                Delete picture
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}

          {state.link ? (
            <>
              <ContextMenuItem onSelect={onLink}>
                <LinkIcon />
                Edit link…
              </ContextMenuItem>
              <ContextMenuItem
                onSelect={() =>
                  window.open(state.link!, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLinkIcon />
                Open link
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.removeLink()}>
                <UnlinkIcon />
                Remove link
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem onSelect={onLink}>
              <LinkIcon />
              Insert link…
              <ContextMenuShortcut>{shortcut("K")}</ContextMenuShortcut>
            </ContextMenuItem>
          )}

          {state.inTable ? (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <TableIcon />
                Table
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-60">
                <ContextMenuItem
                  onSelect={() => editor.tableAction("rowAbove")}
                >
                  <InsertRowUpIcon />
                  Insert row above
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => editor.tableAction("rowBelow")}
                >
                  <InsertRowDownIcon />
                  Insert row below
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => editor.tableAction("columnLeft")}
                >
                  <InsertColumnLeftIcon />
                  Insert column left
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => editor.tableAction("columnRight")}
                >
                  <InsertColumnRightIcon />
                  Insert column right
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuCheckboxItem
                  checked={state.tableHeader}
                  onCheckedChange={() => editor.tableAction("toggleHeader")}
                >
                  Header row
                </ContextMenuCheckboxItem>
                <ContextMenuCheckboxItem
                  checked={state.tableBorders}
                  onCheckedChange={() => editor.tableAction("toggleBorders")}
                >
                  Borders
                </ContextMenuCheckboxItem>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <PaintBrushIcon />
                    Cell colour
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-auto p-3">
                    <ColorGrid
                      onPick={(color) => editor.setCellBackground(color)}
                      resetLabel="No colour"
                      value={null}
                    />
                  </ContextMenuSubContent>
                </ContextMenuSub>
                <ContextMenuSeparator />
                <ContextMenuItem
                  variant="destructive"
                  onSelect={() => editor.tableAction("deleteRow")}
                >
                  <DeleteRowIcon />
                  Delete row
                </ContextMenuItem>
                <ContextMenuItem
                  variant="destructive"
                  onSelect={() => editor.tableAction("deleteColumn")}
                >
                  <DeleteColumnIcon />
                  Delete column
                </ContextMenuItem>
                <ContextMenuItem
                  variant="destructive"
                  onSelect={() => editor.tableAction("deleteTable")}
                >
                  <Trash2Icon />
                  Delete table
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          ) : null}

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ImageAddIcon />
              Insert
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56">
              <ContextMenuItem onSelect={onImage}>
                <ImageAddIcon />
                Picture…
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.insertTable(3, 3)}>
                <TableIcon />
                Table
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.insertHorizontalRule()}>
                <MinusIcon />
                Horizontal line
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.insertPageBreak()}>
                <MinusIcon />
                Page break
                <ContextMenuShortcut>{shortcut("↵")}</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.insertDate()}>
                <CalendarDaysIcon />
                Today’s date
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.insertSignatureBlock()}>
                <SignatureIcon />
                Signature lines
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <span aria-hidden="true" className="w-4 text-center">
                    Ω
                  </span>
                  Special character
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-auto p-2">
                  <div className="grid grid-cols-7 gap-0.5">
                    {SYMBOLS.map((symbol) => (
                      <ContextMenuItem
                        aria-label={`Insert ${symbol}`}
                        className="size-8 min-h-0 justify-center p-0 text-[0.9375rem]"
                        key={symbol}
                        onSelect={() => editor.insertSymbol(symbol)}
                      >
                        {symbol}
                      </ContextMenuItem>
                    ))}
                  </div>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <TextBoldIcon />
              Format
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56">
              <ContextMenuCheckboxItem
                checked={state.bold}
                onCheckedChange={() => editor.toggleMark("bold")}
              >
                Bold<ContextMenuShortcut>{shortcut("B")}</ContextMenuShortcut>
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={state.italic}
                onCheckedChange={() => editor.toggleMark("italic")}
              >
                Italic<ContextMenuShortcut>{shortcut("I")}</ContextMenuShortcut>
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={state.underline}
                onCheckedChange={() => editor.toggleMark("underline")}
              >
                Underline
                <ContextMenuShortcut>{shortcut("U")}</ContextMenuShortcut>
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={state.strike}
                onCheckedChange={() => editor.toggleMark("strikeThrough")}
              >
                Strikethrough
                <ContextMenuShortcut>{shortcut("X", true)}</ContextMenuShortcut>
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={state.superscript}
                onCheckedChange={() => editor.toggleMark("superscript")}
              >
                Superscript<ContextMenuShortcut>{mod}.</ContextMenuShortcut>
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={state.subscript}
                onCheckedChange={() => editor.toggleMark("subscript")}
              >
                Subscript<ContextMenuShortcut>{mod},</ContextMenuShortcut>
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={state.code}
                onCheckedChange={() => editor.toggleCode()}
              >
                Inline code
              </ContextMenuCheckboxItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ParagraphIcon />
              Paragraph style
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56">
              {(
                [
                  "p",
                  "title",
                  "subtitle",
                  "h1",
                  "h2",
                  "h3",
                  "h4",
                  "blockquote",
                  "pre",
                ] as BlockType[]
              ).map((type) => (
                <ContextMenuCheckboxItem
                  checked={state.block === type}
                  key={type}
                  onCheckedChange={() => editor.setBlockType(type)}
                >
                  {BLOCK_LABELS[type]}
                  {type === "p" || /^h\d$/.test(type) ? (
                    <ContextMenuShortcut>
                      {altShortcut(type === "p" ? "0" : type.slice(1))}
                    </ContextMenuShortcut>
                  ) : null}
                </ContextMenuCheckboxItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <TextAlignLeftIcon />
              Align and indent
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56">
              <ContextMenuItem onSelect={() => editor.setAlign("left")}>
                <TextAlignLeftIcon />
                Left
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.setAlign("center")}>
                <TextAlignCenterIcon />
                Centre
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.setAlign("right")}>
                <TextAlignRightIcon />
                Right
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.setAlign("justify")}>
                <TextAlignJustifyIcon />
                Justified
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => editor.indent()}>
                <TextIndentMoreIcon />
                Increase indent
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => editor.outdent()}>
                <TextIndentLessIcon />
                Decrease indent
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <LeftToRightListBulletIcon />
              Bullets and numbering
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56">
              <ContextMenuCheckboxItem
                checked={state.list === "ul"}
                onCheckedChange={() => editor.toggleList("ul")}
              >
                Bulleted list
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={state.list === "ol"}
                onCheckedChange={() => editor.toggleList("ol")}
              >
                Numbered list
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                checked={state.list === "checklist"}
                onCheckedChange={() => editor.toggleList("checklist")}
              >
                Checklist
              </ContextMenuCheckboxItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => editor.clearFormatting()}>
            <TextClearIcon />
            Clear formatting
            <ContextMenuShortcut>{mod}\</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => {
              editor.focus();
              const range = document.createRange();
              range.selectNodeContents(editor.root);
              window.getSelection()?.removeAllRanges();
              window.getSelection()?.addRange(range);
            }}
          >
            <TextSelectionIcon />
            Select all
            <ContextMenuShortcut>{shortcut("A")}</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      ) : null}
    </ContextMenu>
  );
}
