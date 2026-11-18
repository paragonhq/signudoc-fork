// The composer's editing engine: a contentEditable page with our own
// command layer on top. The browser does what it does well (typing, the
// caret, IME, spell check, bold/italic, lists, links); everything that
// needs to be exact is ours: font sizes in points, block styles, indents,
// checklists, tables, pictures, page breaks, paste cleaning, and the undo
// history (the browser's own forgets anything changed outside it).

import { INDENT_STEP_PT } from "./doc-styles.ts";
import { DEFAULT_FONT, DEFAULT_FONT_SIZE_PT, matchFont } from "./fonts.ts";
import {
  escapeHtml,
  htmlToPlainText,
  sanitizeHtml,
  textToHtml,
} from "./sanitize.ts";

export type BlockType =
  | "p"
  | "title"
  | "subtitle"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "blockquote"
  | "pre";

export type Align = "left" | "center" | "right" | "justify";
export type ListKind = "ul" | "ol" | "checklist";
export type InlineMark =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "superscript"
  | "subscript";

export type TableAction =
  | "rowAbove"
  | "rowBelow"
  | "columnLeft"
  | "columnRight"
  | "deleteRow"
  | "deleteColumn"
  | "deleteTable"
  | "toggleHeader"
  | "toggleBorders";

export type FormatState = {
  align: Align;
  block: BlockType;
  bold: boolean;
  canRedo: boolean;
  canUndo: boolean;
  code: boolean;
  color: string;
  fontFamily: string;
  fontSizePt: number;
  hasSelection: boolean;
  highlight: string | null;
  inTable: boolean;
  italic: boolean;
  lineHeight: number;
  link: string | null;
  list: ListKind | null;
  listStyle: string | null;
  spaceAfter: boolean;
  spaceBefore: boolean;
  strike: boolean;
  subscript: boolean;
  superscript: boolean;
  tableBorders: boolean;
  tableHeader: boolean;
  underline: boolean;
};

export const EMPTY_DOCUMENT = "<p><br></p>";

const LEAF_BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "PRE",
]);
const BLOCK_TAGS = new Set([
  ...LEAF_BLOCK_TAGS,
  "BLOCKQUOTE",
  "UL",
  "OL",
  "TABLE",
  "HR",
  "DIV",
  "TD",
  "TH",
  "TR",
  "TBODY",
  "THEAD",
]);

type Snapshot = { html: string; selection: SavedPath | null };
type SavedPath = {
  anchor: number[];
  anchorOffset: number;
  focus: number[];
  focusOffset: number;
};
type NodeSelection = {
  anchor: Node;
  anchorOffset: number;
  focus: Node;
  focusOffset: number;
};

const HISTORY_LIMIT = 300;

function isMac() {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform)
  );
}

function rgbToHex(value: string) {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);

  if (!match) return value;
  if (match[4] !== undefined && Number.parseFloat(match[4]) === 0)
    return "transparent";

  return `#${[match[1], match[2], match[3]]
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

function today() {
  return new Date().toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type ComposerEditorOptions = {
  onChange: () => void;
  onSelectionChange: () => void;
  onImageSelect: (image: HTMLImageElement | null) => void;
  onLinkShortcut: () => void;
  onFilesDropped: (files: File[], at: Range | null) => void;
  onNotice: (message: string) => void;
};

export class ComposerEditor {
  readonly root: HTMLElement;
  private readonly options: ComposerEditorOptions;
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private current: Snapshot;
  private commitTimer: number | null = null;
  private savedRange: Range | null = null;
  private pendingFontSize: number | null = null;
  private selectedImage: HTMLImageElement | null = null;
  private internalDrag = false;
  private readonly cleanup: Array<() => void> = [];

  constructor(root: HTMLElement, html: string, options: ComposerEditorOptions) {
    this.root = root;
    this.options = options;
    root.contentEditable = "true";
    root.spellcheck = true;
    root.setAttribute("role", "textbox");
    root.setAttribute("aria-multiline", "true");
    root.innerHTML = html || EMPTY_DOCUMENT;
    this.normalize();
    this.current = { html: root.innerHTML, selection: null };

    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      // Older engines: Enter still works, it just makes <div>s we tidy up.
    }

    this.listen(root, "beforeinput", (event) =>
      this.onBeforeInput(event as InputEvent),
    );
    this.listen(root, "input", (event) => this.onInput(event as InputEvent));
    this.listen(root, "keydown", (event) =>
      this.onKeyDown(event as KeyboardEvent),
    );
    this.listen(root, "paste", (event) =>
      this.onPaste(event as ClipboardEvent),
    );
    this.listen(root, "copy", (event) =>
      this.onCopy(event as ClipboardEvent, false),
    );
    this.listen(root, "cut", (event) =>
      this.onCopy(event as ClipboardEvent, true),
    );
    this.listen(root, "mousedown", (event) =>
      this.onMouseDown(event as MouseEvent),
    );
    this.listen(root, "click", (event) => this.onClick(event as MouseEvent));
    this.listen(root, "dragstart", () => {
      this.internalDrag = true;
    });
    this.listen(root, "dragend", () => {
      this.internalDrag = false;
    });
    this.listen(root, "drop", (event) => this.onDrop(event as DragEvent));
    this.listen(document, "selectionchange", () => this.onSelectionChange());
  }

  private listen(
    target: EventTarget,
    type: string,
    handler: (event: Event) => void,
  ) {
    target.addEventListener(type, handler);
    this.cleanup.push(() => target.removeEventListener(type, handler));
  }

  destroy() {
    if (this.commitTimer) window.clearTimeout(this.commitTimer);
    for (const off of this.cleanup) off();
    this.root.contentEditable = "false";
  }

  // ── Content ──────────────────────────────────────────────────────────

  getHtml() {
    const clone = this.root.cloneNode(true) as HTMLElement;

    for (const element of Array.from(
      clone.querySelectorAll(
        "[data-selected], [data-cell-selected], [data-placeholder]",
      ),
    )) {
      element.removeAttribute("data-selected");
      element.removeAttribute("data-cell-selected");
      element.removeAttribute("data-placeholder");
    }

    return clone.innerHTML;
  }

  setHtml(html: string, options: { record?: boolean } = {}) {
    this.flushCommit();
    this.root.innerHTML = html || EMPTY_DOCUMENT;
    this.normalize();

    if (options.record === false) {
      this.undoStack = [];
      this.redoStack = [];
      this.current = { html: this.root.innerHTML, selection: null };
    } else {
      this.commit();
    }

    this.options.onChange();
  }

  isEmpty() {
    return (
      !this.root.textContent?.trim() &&
      !this.root.querySelector("img, table, hr")
    );
  }

  focus() {
    if (document.activeElement !== this.root) {
      this.root.focus({ preventScroll: true });
    }

    const selection = window.getSelection();

    if (
      this.savedRange &&
      selection &&
      !this.root.contains(selection.anchorNode)
    ) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
    } else if (selection && !this.root.contains(selection.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(this.root.firstElementChild ?? this.root);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  /** Puts the caret at the end of the document. */
  focusEnd() {
    this.root.focus({ preventScroll: true });
    const range = document.createRange();
    // Inside the last block, never between blocks, so typing lands in it.
    range.selectNodeContents(this.root.lastElementChild ?? this.root);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private range(): Range | null {
    const selection = window.getSelection();

    if (
      selection &&
      selection.rangeCount > 0 &&
      this.root.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      return selection.getRangeAt(0);
    }

    return this.savedRange;
  }

  // ── History ──────────────────────────────────────────────────────────

  private savePath(): SavedPath | null {
    const selection = window.getSelection();

    if (
      !selection ||
      !selection.anchorNode ||
      !this.root.contains(selection.anchorNode)
    ) {
      return null;
    }

    const path = (node: Node) => {
      const out: number[] = [];
      let current: Node | null = node;
      while (current && current !== this.root) {
        const parent: Node | null = current.parentNode;
        if (!parent) break;
        out.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
        current = parent;
      }
      return out;
    };

    return {
      anchor: path(selection.anchorNode),
      anchorOffset: selection.anchorOffset,
      focus: path(selection.focusNode ?? selection.anchorNode),
      focusOffset: selection.focusOffset,
    };
  }

  private restorePath(saved: SavedPath | null) {
    if (!saved) return;
    const resolve = (path: number[]) => {
      let node: Node = this.root;
      for (const index of path) {
        const next = node.childNodes[index];
        if (!next) break;
        node = next;
      }
      return node;
    };
    const clamp = (node: Node, offset: number) =>
      Math.min(
        offset,
        node.nodeType === Node.TEXT_NODE
          ? (node.textContent?.length ?? 0)
          : node.childNodes.length,
      );

    try {
      const anchor = resolve(saved.anchor);
      const focus = resolve(saved.focus);
      const selection = window.getSelection();
      selection?.setBaseAndExtent(
        anchor,
        clamp(anchor, saved.anchorOffset),
        focus,
        clamp(focus, saved.focusOffset),
      );
    } catch {
      // A path that no longer fits: leave the caret where it is.
    }
  }

  /** Records the document as it is now, if it changed. */
  commit() {
    if (this.commitTimer) {
      window.clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }

    const html = this.root.innerHTML;
    const selection = this.savePath();

    if (html === this.current.html) {
      this.current.selection = selection;
      return;
    }

    this.undoStack.push(this.current);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.current = { html, selection };
  }

  private scheduleCommit() {
    if (this.commitTimer) window.clearTimeout(this.commitTimer);
    this.commitTimer = window.setTimeout(() => {
      this.commitTimer = null;
      this.commit();
      this.options.onSelectionChange();
    }, 500);
  }

  private flushCommit() {
    if (this.commitTimer) this.commit();
  }

  canUndo() {
    return this.undoStack.length > 0 || this.commitTimer !== null;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    this.flushCommit();
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(this.current);
    this.applySnapshot(previous);
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.current);
    this.applySnapshot(next);
  }

  private applySnapshot(snapshot: Snapshot) {
    this.current = snapshot;
    this.root.innerHTML = snapshot.html;
    this.selectImage(null);
    this.root.focus({ preventScroll: true });
    this.restorePath(snapshot.selection);
    this.options.onChange();
    this.options.onSelectionChange();
  }

  /** Runs a change as one undo step, with the selection put back first. */
  run(change: () => void) {
    this.flushCommit();
    this.focus();

    try {
      change();
    } finally {
      this.normalize();
      this.commit();
      this.saveRange();
      this.options.onChange();
      this.options.onSelectionChange();
    }
  }

  private exec(command: string, value?: string, css = false) {
    document.execCommand("styleWithCSS", false, css ? "true" : "false");
    return document.execCommand(command, false, value);
  }

  // ── Events ───────────────────────────────────────────────────────────

  private saveRange() {
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (this.root.contains(range.commonAncestorContainer)) {
        this.savedRange = range.cloneRange();
      }
    }
  }

  private onSelectionChange() {
    const selection = window.getSelection();

    if (!selection || !this.root.contains(selection.anchorNode)) {
      return;
    }

    this.saveRange();
    this.options.onSelectionChange();
  }

  private onBeforeInput(event: InputEvent) {
    if (event.inputType === "historyUndo") {
      event.preventDefault();
      this.undo();
    } else if (event.inputType === "historyRedo") {
      event.preventDefault();
      this.redo();
    } else if (event.inputType === "insertFromDrop" && !this.internalDrag) {
      // Handled in onDrop, cleaned.
      event.preventDefault();
    }
  }

  private onInput(event: InputEvent) {
    if (this.pendingFontSize) {
      this.replaceSizeMarkers(this.pendingFontSize);
    }

    this.tidyAfterInput();

    const immediate =
      event.inputType === "insertParagraph" ||
      event.inputType === "insertFromPaste" ||
      event.inputType === "insertFromDrop" ||
      event.inputType === "deleteByCut" ||
      event.inputType?.startsWith("format");

    if (immediate) {
      this.commit();
    } else {
      this.scheduleCommit();
    }

    this.options.onChange();
  }

  private onKeyDown(event: KeyboardEvent) {
    const mod = isMac() ? event.metaKey : event.ctrlKey;
    const key = event.key.toLowerCase();

    if (mod && !event.altKey) {
      const shift = event.shiftKey;
      const handled = (() => {
        if (key === "z" && !shift) return (this.undo(), true);
        if ((key === "z" && shift) || key === "y") return (this.redo(), true);
        if (key === "b" && !shift) return (this.toggleMark("bold"), true);
        if (key === "i" && !shift) return (this.toggleMark("italic"), true);
        if (key === "u" && !shift) return (this.toggleMark("underline"), true);
        if (key === "x" && shift)
          return (this.toggleMark("strikeThrough"), true);
        if (key === "k") return (this.options.onLinkShortcut(), true);
        if (key === "\\") return (this.clearFormatting(), true);
        if (key === "enter") return (this.insertPageBreak(), true);
        if (key === "." && !shift)
          return (this.toggleMark("superscript"), true);
        if (key === "," && !shift) return (this.toggleMark("subscript"), true);
        if (key === "]") return (this.indent(), true);
        if (key === "[") return (this.outdent(), true);
        if (shift && (key === "7" || event.code === "Digit7"))
          return (this.toggleList("ol"), true);
        if (shift && (key === "8" || event.code === "Digit8"))
          return (this.toggleList("ul"), true);
        if (shift && (key === "9" || event.code === "Digit9"))
          return (this.toggleList("checklist"), true);
        if (shift && key === "l") return (this.setAlign("left"), true);
        if (shift && key === "e") return (this.setAlign("center"), true);
        if (shift && key === "r") return (this.setAlign("right"), true);
        if (shift && key === "j") return (this.setAlign("justify"), true);
        if (shift && (key === ">" || key === "."))
          return (this.stepFontSize(1), true);
        if (shift && (key === "<" || key === ","))
          return (this.stepFontSize(-1), true);
        if (shift && key === "v")
          return (void this.pasteFromClipboard(true), true);
        return false;
      })();

      if (handled) {
        event.preventDefault();
        return;
      }
    }

    if (mod && event.altKey) {
      const digit = /^Digit(\d)$/.exec(event.code)?.[1];
      if (digit !== undefined) {
        event.preventDefault();
        this.setBlockType(
          digit === "0" ? "p" : (`h${Math.min(6, Number(digit))}` as BlockType),
        );
        return;
      }
    }

    if (event.key === "Tab" && !mod && !event.altKey) {
      const range = this.range();
      const cell = range ? this.closest(range.startContainer, "td, th") : null;
      const li = range ? this.closest(range.startContainer, "li") : null;

      event.preventDefault();

      if (cell) {
        this.moveToCell(cell as HTMLTableCellElement, event.shiftKey ? -1 : 1);
      } else if (li) {
        if (event.shiftKey) {
          this.outdent();
        } else {
          this.indent();
        }
      } else if (event.shiftKey) {
        this.outdent();
      } else {
        this.run(() => this.exec("insertText", "\t"));
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && !mod) {
      this.handleEnter(event);
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      this.selectedImage
    ) {
      event.preventDefault();
      const image = this.selectedImage;
      this.run(() => image.remove());
      this.selectImage(null);
    }
  }

  /**
   * Enter at the end of a heading, title or subtitle starts plain text, as
   * in any word processor. Elsewhere the browser's own Enter is right.
   */
  private handleEnter(event: KeyboardEvent) {
    const range = this.range();
    if (!range || !range.collapsed) return;
    const block = this.leafBlock(range.startContainer);
    if (!block) return;
    const styled =
      /^H\d$/.test(block.tagName) || block.hasAttribute("data-style");
    if (!styled) return;

    const tail = document.createRange();
    tail.setStart(range.startContainer, range.startOffset);
    tail.setEnd(block, block.childNodes.length);
    if (tail.toString().length > 0) return;

    event.preventDefault();
    this.run(() => {
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      block.after(p);
      this.placeCaret(p, 0);
    });
  }

  private moveToCell(cell: HTMLTableCellElement, step: number) {
    const table = cell.closest("table")!;
    const cells = Array.from(table.querySelectorAll("td, th"));
    const index = cells.indexOf(cell) + step;

    if (index >= cells.length) {
      this.tableAction("rowBelow");
      return;
    }

    const target = cells[Math.max(0, index)];
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // The checkbox of a checklist item is drawn in the gutter to its left.
    const li = target.closest?.(
      "ul[data-type='checklist'] > li",
    ) as HTMLElement | null;
    if (li && this.root.contains(li)) {
      const box = li.getBoundingClientRect();
      if (event.clientX < box.left) {
        event.preventDefault();
        this.run(() => {
          li.setAttribute(
            "data-checked",
            li.getAttribute("data-checked") === "true" ? "false" : "true",
          );
        });
        return;
      }
    }

    if (target.tagName !== "IMG") {
      this.selectImage(null);
    }
  }

  private onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (target.tagName === "IMG" && this.root.contains(target)) {
      this.selectImage(target as HTMLImageElement);
      const range = document.createRange();
      range.selectNode(target);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    // Links open with a modifier click, like in Docs.
    const link = target.closest?.("a") as HTMLAnchorElement | null;
    if (
      link &&
      (event.metaKey || event.ctrlKey) &&
      /^(https?:|mailto:|tel:)/.test(link.href)
    ) {
      window.open(link.href, "_blank", "noopener,noreferrer");
    }
  }

  selectImage(image: HTMLImageElement | null) {
    if (this.selectedImage === image) return;
    this.selectedImage?.removeAttribute("data-selected");
    this.selectedImage = image;
    image?.setAttribute("data-selected", "");
    this.options.onImageSelect(image);
  }

  getSelectedImage() {
    return this.selectedImage;
  }

  private onCopy(event: ClipboardEvent, cut: boolean) {
    const range = this.range();
    if (!range || range.collapsed || !event.clipboardData) return;

    const holder = document.createElement("div");
    holder.appendChild(range.cloneContents());
    // A selection inside one list item or table cell copies its context
    // too, so it pastes back as a list or table.
    const html = holder.innerHTML;
    event.preventDefault();
    event.clipboardData.setData("text/html", html);
    event.clipboardData.setData("text/plain", htmlToPlainText(html));

    if (cut) {
      this.run(() => range.deleteContents());
    }
  }

  private onPaste(event: ClipboardEvent) {
    const data = event.clipboardData;
    if (!data) return;
    event.preventDefault();

    const files = Array.from(data.files ?? []);
    const images = files.filter((file) => file.type.startsWith("image/"));
    const html = data.getData("text/html");
    const text = data.getData("text/plain");

    if (images.length && !html) {
      void this.insertImageFiles(images);
      return;
    }

    if (html) {
      this.insertContent(sanitizeHtml(html));
    } else if (text) {
      this.insertContent(textToHtml(text));
    }
  }

  /** Paste through the Clipboard API (menus can't fire a paste event). */
  async pasteFromClipboard(plain: boolean) {
    this.saveRange();

    try {
      if (!plain && "read" in navigator.clipboard) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((type) =>
            type.startsWith("image/"),
          );
          if (item.types.includes("text/html")) {
            const html = await (await item.getType("text/html")).text();
            this.insertContent(sanitizeHtml(html));
            return;
          }
          if (imageType && !item.types.includes("text/plain")) {
            const blob = await item.getType(imageType);
            await this.insertImageFiles([
              new File([blob], "pasted", { type: imageType }),
            ]);
            return;
          }
        }
      }

      const text = await navigator.clipboard.readText();
      if (text) this.insertContent(textToHtml(text));
    } catch {
      this.options.onNotice(
        `Your browser blocked pasting from the menu. Use ${isMac() ? "⌘V" : "Ctrl+V"}${plain ? ` with Shift` : ""} instead.`,
      );
    }
  }

  copySelection(cut: boolean) {
    this.focus();
    const ok = document.execCommand(cut ? "cut" : "copy");
    if (!ok) {
      this.options.onNotice(
        `Use ${isMac() ? (cut ? "⌘X" : "⌘C") : cut ? "Ctrl+X" : "Ctrl+C"} instead.`,
      );
    }
  }

  private onDrop(event: DragEvent) {
    if (this.internalDrag) {
      this.internalDrag = false;
      window.setTimeout(() => {
        this.normalize();
        this.commit();
        this.options.onChange();
      });
      return;
    }

    const data = event.dataTransfer;
    if (!data) return;
    event.preventDefault();
    event.stopPropagation();

    const caret = this.rangeFromPoint(event.clientX, event.clientY);
    if (caret) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(caret);
      this.saveRange();
    }

    const files = Array.from(data.files ?? []);
    if (files.length) {
      this.options.onFilesDropped(files, caret);
      return;
    }

    const html = data.getData("text/html");
    const text = data.getData("text/plain");
    if (html) this.insertContent(sanitizeHtml(html));
    else if (text) this.insertContent(textToHtml(text));
  }

  private rangeFromPoint(x: number, y: number): Range | null {
    const doc = document as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offset: number; offsetNode: Node } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };

    if (doc.caretPositionFromPoint) {
      const position = doc.caretPositionFromPoint(x, y);
      if (position && this.root.contains(position.offsetNode)) {
        const range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
        return range;
      }
    }

    const range = doc.caretRangeFromPoint?.(x, y) ?? null;

    return range && this.root.contains(range.startContainer) ? range : null;
  }

  // ── Structure helpers ────────────────────────────────────────────────

  private closest(node: Node | null, selector: string): HTMLElement | null {
    const element =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node?.parentElement;
    const found = element?.closest(selector) as HTMLElement | null;

    return found && this.root.contains(found) && found !== this.root
      ? found
      : null;
  }

  private leafBlock(node: Node | null): HTMLElement | null {
    let current: Node | null = node;

    while (current && current !== this.root) {
      if (
        current.nodeType === Node.ELEMENT_NODE &&
        LEAF_BLOCK_TAGS.has((current as Element).tagName)
      ) {
        return current as HTMLElement;
      }
      if (
        current.nodeType === Node.ELEMENT_NODE &&
        /^(TD|TH|BLOCKQUOTE)$/.test((current as Element).tagName)
      ) {
        return current as HTMLElement;
      }
      current = current.parentNode;
    }

    return null;
  }

  /** The paragraphs, headings and list items the selection touches. */
  selectedBlocks(): HTMLElement[] {
    const range = this.range();
    if (!range) return [];

    const blocks = new Set<HTMLElement>();
    const start = this.leafBlock(range.startContainer);
    if (start) blocks.add(start);

    if (!range.collapsed) {
      const walker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let node: Node | null = walker.currentNode;
      while (node) {
        if (range.intersectsNode(node)) {
          if (
            node.nodeType === Node.TEXT_NODE ||
            (node as Element).tagName === "BR" ||
            (node as Element).tagName === "IMG"
          ) {
            const block = this.leafBlock(node);
            if (block) blocks.add(block);
          }
        }
        node = walker.nextNode();
      }
      const end = this.leafBlock(range.endContainer);
      if (end) blocks.add(end);
    }

    // A list item holding a nested list counts once, as itself.
    return [...blocks];
  }

  private placeCaret(node: Node, offset: number) {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private keepSelection(): NodeSelection | null {
    const selection = window.getSelection();
    if (!selection?.anchorNode || !this.root.contains(selection.anchorNode))
      return null;

    return {
      anchor: selection.anchorNode,
      anchorOffset: selection.anchorOffset,
      focus: selection.focusNode ?? selection.anchorNode,
      focusOffset: selection.focusOffset,
    };
  }

  private putSelection(saved: NodeSelection | null) {
    if (
      !saved ||
      !this.root.contains(saved.anchor) ||
      !this.root.contains(saved.focus)
    )
      return;

    try {
      window
        .getSelection()
        ?.setBaseAndExtent(
          saved.anchor,
          saved.anchorOffset,
          saved.focus,
          saved.focusOffset,
        );
    } catch {
      // Offsets past the end after a move: leave it.
    }
  }

  /**
   * Keeps the editor's structure editable: blocks at the top, never empty,
   * <div>s from older engines turned into paragraphs, no stray inline
   * content between blocks.
   */
  normalize() {
    const root = this.root;

    for (const div of Array.from(root.querySelectorAll("div"))) {
      const p = document.createElement("p");
      for (const attr of Array.from(div.attributes))
        p.setAttribute(attr.name, attr.value);
      while (div.firstChild) p.appendChild(div.firstChild);
      div.replaceWith(p);
    }

    let loose: HTMLElement | null = null;
    for (const child of Array.from(root.childNodes)) {
      const isBlock =
        child.nodeType === Node.ELEMENT_NODE &&
        BLOCK_TAGS.has((child as Element).tagName);
      if (isBlock) {
        loose = null;
        continue;
      }
      if (child.nodeType === Node.TEXT_NODE && !child.textContent) {
        child.remove();
        continue;
      }
      if (!loose) {
        loose = document.createElement("p");
        root.insertBefore(loose, child);
      }
      loose.appendChild(child);
    }

    if (!root.firstElementChild) {
      root.innerHTML = EMPTY_DOCUMENT;
    }

    // Something to type into after a trailing table, rule or page break.
    const last = root.lastElementChild;
    if (last && /^(TABLE|HR|UL|OL|BLOCKQUOTE|PRE)$/.test(last.tagName)) {
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      root.appendChild(p);
    }
    const first = root.firstElementChild;
    if (first && /^(TABLE|HR)$/.test(first.tagName)) {
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      root.insertBefore(p, first);
    }

    for (const block of Array.from(
      root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li"),
    )) {
      if (!block.firstChild) block.appendChild(document.createElement("br"));
    }

    for (const cell of Array.from(root.querySelectorAll("td, th"))) {
      if (!cell.firstChild) {
        const p = document.createElement("p");
        p.appendChild(document.createElement("br"));
        cell.appendChild(p);
      }
    }

    // Lists the browser emptied.
    for (const list of Array.from(root.querySelectorAll("ul, ol"))) {
      if (!list.querySelector("li")) list.remove();
    }
  }

  private tidyAfterInput() {
    // Chrome's Enter may carry a title/heading marker into an empty line;
    // and deleting everything can leave a bare <br> at the top.
    const root = this.root;
    if (root.childNodes.length === 1 && root.firstChild?.nodeName === "BR") {
      root.innerHTML = EMPTY_DOCUMENT;
      this.placeCaret(root.firstChild!, 0);
    }

    for (const div of Array.from(root.querySelectorAll(":scope > div"))) {
      const saved = this.keepSelection();
      const p = document.createElement("p");
      while (div.firstChild) p.appendChild(div.firstChild);
      div.replaceWith(p);
      this.putSelection(saved);
    }

    // Font-size placeholders from execCommand("fontSize") that weren't
    // replaced (rare: the browser applied them on the next keystroke).
    if (root.querySelector("font[size='7'], span[style*='xxx-large']")) {
      this.replaceSizeMarkers(this.pendingFontSize ?? DEFAULT_FONT_SIZE_PT);
    }
  }

  // ── Inline formatting ────────────────────────────────────────────────

  toggleMark(mark: InlineMark) {
    this.run(() => {
      if (mark === "superscript" || mark === "subscript") {
        const other = mark === "superscript" ? "subscript" : "superscript";
        if (document.queryCommandState(other)) this.exec(other);
      }
      this.exec(mark);
    });
  }

  toggleCode() {
    this.run(() => {
      const range = this.range();
      if (!range) return;
      const code = this.closest(range.startContainer, "code");

      if (code && !code.closest("pre")) {
        const saved = this.keepSelection();
        code.replaceWith(...Array.from(code.childNodes));
        this.putSelection(saved);
        return;
      }

      if (range.collapsed) return;
      const wrapper = document.createElement("code");
      wrapper.appendChild(range.extractContents());
      range.insertNode(wrapper);
      const next = document.createRange();
      next.selectNodeContents(wrapper);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(next);
    });
  }

  setFontFamily(family: string) {
    const font = matchFont(family) ?? DEFAULT_FONT;
    this.run(() => {
      this.exec("fontName", font.family, true);
    });
  }

  setFontSize(pt: number) {
    const size = Math.max(1, Math.min(400, Math.round(pt * 2) / 2));
    this.run(() => {
      const range = this.range();
      this.pendingFontSize = size;
      this.exec("fontSize", "7", true);

      if (range && !range.collapsed) {
        this.replaceSizeMarkers(size);
        this.pendingFontSize = null;
      }
    });
  }

  stepFontSize(direction: 1 | -1) {
    const current = this.getState().fontSizePt;
    const sizes = [
      6, 7, 8, 9, 10, 10.5, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32,
      36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96,
    ];
    const next =
      direction > 0
        ? (sizes.find((size) => size > current) ?? current + 8)
        : ([...sizes].reverse().find((size) => size < current) ??
          Math.max(1, current - 1));
    this.setFontSize(next);
  }

  private replaceSizeMarkers(pt: number) {
    const saved = this.keepSelection();

    for (const font of Array.from(
      this.root.querySelectorAll("font[size='7']"),
    )) {
      const span = document.createElement("span");
      span.style.fontSize = `${pt}pt`;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    }

    for (const span of Array.from(
      this.root.querySelectorAll<HTMLElement>("span[style*='xxx-large']"),
    )) {
      span.style.fontSize = `${pt}pt`;
    }

    // Spans inside the resized text that set their own size would win
    // over the new one; drop theirs.
    for (const span of Array.from(
      this.root.querySelectorAll<HTMLElement>(
        `span[style*='font-size: ${pt}pt'] span[style*='font-size']`,
      ),
    )) {
      span.style.removeProperty("font-size");
      if (!span.getAttribute("style"))
        span.replaceWith(...Array.from(span.childNodes));
    }

    this.putSelection(saved);
  }

  setColor(color: string | null) {
    this.run(() => {
      this.exec("foreColor", color ?? "#1f1f1f", true);
    });
  }

  setHighlight(color: string | null) {
    this.run(() => {
      if (!this.exec("hiliteColor", color ?? "transparent", true)) {
        this.exec("backColor", color ?? "transparent", true);
      }
      if (!color) {
        for (const span of Array.from(
          this.root.querySelectorAll<HTMLElement>(
            "span[style*='background-color']",
          ),
        )) {
          if (
            /transparent|rgba\(0, 0, 0, 0\)/.test(span.style.backgroundColor)
          ) {
            span.style.removeProperty("background-color");
            if (!span.getAttribute("style"))
              span.replaceWith(...Array.from(span.childNodes));
          }
        }
      }
    });
  }

  clearFormatting() {
    this.run(() => {
      this.exec("removeFormat");
      this.exec("unlink");
      const range = this.range();
      if (!range) return;

      for (const span of Array.from(
        this.root.querySelectorAll<HTMLElement>("span, code, u, s, sup, sub"),
      )) {
        if (range.intersectsNode(span) && !span.closest("pre")) {
          span.replaceWith(...Array.from(span.childNodes));
        }
      }
    });
  }

  // ── Links ────────────────────────────────────────────────────────────

  currentLink(): HTMLAnchorElement | null {
    const range = this.range();
    return range
      ? (this.closest(range.startContainer, "a") as HTMLAnchorElement | null)
      : null;
  }

  selectedText() {
    return this.range()?.toString() ?? "";
  }

  setLink(href: string, text?: string) {
    const url = /^(https?:|mailto:|tel:)/i.test(href)
      ? href
      : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(href)
        ? `mailto:${href}`
        : `https://${href.replace(/^\/+/, "")}`;

    this.run(() => {
      const existing = this.currentLink();

      if (existing) {
        existing.href = url;
        if (text && text !== existing.textContent) existing.textContent = text;
        return;
      }

      const range = this.range();
      if (!range) return;

      if (range.collapsed || (text && text !== range.toString())) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.textContent = text || url;
        range.deleteContents();
        range.insertNode(anchor);
        this.placeCaret(
          anchor.parentNode!,
          Array.prototype.indexOf.call(anchor.parentNode!.childNodes, anchor) +
            1,
        );
      } else {
        this.exec("createLink", url);
      }
    });
  }

  removeLink() {
    this.run(() => {
      const link = this.currentLink();
      if (link) {
        link.replaceWith(...Array.from(link.childNodes));
      } else {
        this.exec("unlink");
      }
    });
  }

  /** Where to anchor a link editor: the link, or the selection. */
  selectionRect(): DOMRect | null {
    const link = this.currentLink();
    if (link) return link.getBoundingClientRect();
    const range = this.range();
    if (!range) return null;
    const rects = range.getClientRects();
    return rects.length
      ? rects[rects.length - 1]
      : range.getBoundingClientRect();
  }

  // ── Blocks ───────────────────────────────────────────────────────────

  setBlockType(type: BlockType) {
    this.run(() => {
      const blocks = this.selectedBlocks();

      if (type === "blockquote" || type === "pre") {
        const inside = blocks.some((block) => block.closest(type));
        this.exec("formatBlock", inside ? "<p>" : `<${type}>`);
        return;
      }

      // Blocks inside list items and table cells keep their container.
      const tag = type === "title" || type === "subtitle" ? "p" : type;
      this.exec("formatBlock", `<${tag}>`);

      for (const block of this.selectedBlocks()) {
        if (type === "title" || type === "subtitle") {
          block.setAttribute("data-style", type);
        } else {
          block.removeAttribute("data-style");
        }
      }
    });
  }

  setAlign(align: Align) {
    this.run(() => {
      for (const block of this.selectedBlocks()) {
        block.style.textAlign = align === "left" ? "" : align;
        if (!block.getAttribute("style")) block.removeAttribute("style");
      }
      const image = this.selectedImage;
      if (image) {
        if (align === "left" || align === "justify")
          image.removeAttribute("data-align");
        else image.setAttribute("data-align", align);
      }
    });
  }

  setLineHeight(value: number) {
    this.run(() => {
      for (const block of this.selectedBlocks()) {
        block.style.lineHeight =
          Math.abs(value - 1.15) < 0.01 ? "" : String(value);
        if (!block.getAttribute("style")) block.removeAttribute("style");
      }
    });
  }

  toggleSpacing(side: "before" | "after") {
    const state = this.getState();
    const on = side === "before" ? !state.spaceBefore : !state.spaceAfter;

    this.run(() => {
      for (const block of this.selectedBlocks()) {
        const prop = side === "before" ? "marginTop" : "marginBottom";
        block.style[prop] = on ? (side === "before" ? "10pt" : "10pt") : "0pt";
      }
    });
  }

  indent() {
    this.run(() => {
      const blocks = this.selectedBlocks();
      const items = blocks.filter((block) => block.tagName === "LI");

      if (items.length) {
        const saved = this.keepSelection();
        for (const li of items) this.sinkListItem(li);
        this.putSelection(saved);
        return;
      }

      for (const block of blocks) {
        if (block.tagName === "TD" || block.tagName === "TH") continue;
        const current = Number.parseFloat(block.style.marginLeft) || 0;
        block.style.marginLeft = `${Math.min(current + INDENT_STEP_PT, INDENT_STEP_PT * 8)}pt`;
      }
    });
  }

  outdent() {
    this.run(() => {
      const blocks = this.selectedBlocks();
      const items = blocks.filter((block) => block.tagName === "LI");

      if (items.length) {
        const saved = this.keepSelection();
        for (const li of items.reverse()) this.liftListItem(li);
        this.putSelection(saved);
        return;
      }

      for (const block of blocks) {
        const current = Number.parseFloat(block.style.marginLeft) || 0;
        const next = Math.max(0, current - INDENT_STEP_PT);
        block.style.marginLeft = next ? `${next}pt` : "";
        if (!block.getAttribute("style")) block.removeAttribute("style");
      }
    });
  }

  private sinkListItem(li: HTMLElement) {
    const previous = li.previousElementSibling as HTMLElement | null;
    const list = li.parentElement!;
    if (!previous || previous.tagName !== "LI") return;

    let nested = previous.lastElementChild as HTMLElement | null;
    if (!nested || (nested.tagName !== "UL" && nested.tagName !== "OL")) {
      nested = document.createElement(list.tagName.toLowerCase());
      if (list.getAttribute("data-type") === "checklist")
        nested.setAttribute("data-type", "checklist");
      previous.appendChild(nested);
    }

    nested.appendChild(li);
  }

  private liftListItem(li: HTMLElement) {
    const list = li.parentElement!;
    const parentItem = list.parentElement;

    // Items after this one move under it, so the order holds.
    const following: Element[] = [];
    let next = li.nextElementSibling;
    while (next) {
      following.push(next);
      next = next.nextElementSibling;
    }

    if (parentItem && parentItem.tagName === "LI") {
      if (following.length) {
        const rest = document.createElement(list.tagName.toLowerCase());
        if (list.getAttribute("data-type") === "checklist")
          rest.setAttribute("data-type", "checklist");
        for (const item of following) rest.appendChild(item);
        li.appendChild(rest);
      }
      parentItem.after(li);
      if (!list.children.length) list.remove();
      return;
    }

    // Out of the list entirely: becomes a paragraph between two lists.
    const p = document.createElement("p");
    for (const child of Array.from(li.childNodes)) {
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        /^(UL|OL)$/.test((child as Element).tagName)
      )
        continue;
      p.appendChild(child);
    }
    if (!p.firstChild) p.appendChild(document.createElement("br"));
    const nestedLists = Array.from(li.children).filter((child) =>
      /^(UL|OL)$/.test(child.tagName),
    );

    let after: Element = list;
    if (following.length || nestedLists.length) {
      const rest = document.createElement(list.tagName.toLowerCase());
      for (const attr of Array.from(list.attributes))
        rest.setAttribute(attr.name, attr.value);
      rest.removeAttribute("start");
      for (const nested of nestedLists)
        for (const item of Array.from(nested.children)) rest.appendChild(item);
      for (const item of following) rest.appendChild(item);
      list.after(rest);
      after = list;
      rest.before(p);
    } else {
      after.after(p);
    }

    li.remove();
    if (!list.children.length) list.remove();
  }

  toggleList(kind: ListKind) {
    this.run(() => {
      const range = this.range();
      const list = range
        ? (this.closest(range.startContainer, "ul, ol") as HTMLElement | null)
        : null;
      const isChecklist = list?.getAttribute("data-type") === "checklist";
      const currentKind: ListKind | null = list
        ? isChecklist
          ? "checklist"
          : (list.tagName.toLowerCase() as ListKind)
        : null;

      if (currentKind === kind) {
        this.exec(kind === "ol" ? "insertOrderedList" : "insertUnorderedList");
        return;
      }

      if (kind === "checklist") {
        if (currentKind !== "ul") this.exec("insertUnorderedList");
      } else if (currentKind === "checklist" && kind === "ul") {
        // fall through to the marker change below
      } else {
        this.exec(kind === "ol" ? "insertOrderedList" : "insertUnorderedList");
      }

      const after = this.range();
      const target = after
        ? (this.closest(after.startContainer, "ul, ol") as HTMLElement | null)
        : null;
      if (!target) return;

      if (kind === "checklist") {
        target.setAttribute("data-type", "checklist");
        for (const li of Array.from(target.children)) {
          if (!li.hasAttribute("data-checked"))
            li.setAttribute("data-checked", "false");
        }
      } else {
        target.removeAttribute("data-type");
        for (const li of Array.from(target.children))
          li.removeAttribute("data-checked");
      }
    });
  }

  setListStyle(style: string) {
    this.run(() => {
      const range = this.range();
      const list = range
        ? (this.closest(range.startContainer, "ul, ol") as HTMLElement | null)
        : null;
      if (!list) return;
      list.style.listStyleType = style;
    });
  }

  // ── Insert ───────────────────────────────────────────────────────────

  /**
   * Inserts cleaned HTML at the selection the way a word processor pastes:
   * the first pasted paragraph joins the line the caret is on, the last
   * joins what followed the caret, anything between stands on its own.
   */
  insertContent(html: string) {
    this.run(() => {
      const range = this.range();
      if (!range) return;
      range.deleteContents();

      const template = document.createElement("template");
      template.innerHTML = html;
      const nodes = Array.from(template.content.childNodes);
      if (!nodes.length) return;

      const isBlock = (node: Node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        BLOCK_TAGS.has((node as Element).tagName);
      const mergeable = (node: Node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        /^(P|H\d)$/.test((node as Element).tagName);

      // Inline only, or a single paragraph: goes into the line as is.
      if (!nodes.some(isBlock) || (nodes.length === 1 && mergeable(nodes[0]))) {
        const fragment = document.createDocumentFragment();
        const source =
          nodes.length === 1 && mergeable(nodes[0])
            ? Array.from(nodes[0].childNodes)
            : nodes;
        for (const node of source) fragment.appendChild(node);
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);
        if (lastNode) {
          const after = document.createRange();
          after.setStartAfter(lastNode);
          after.collapse(true);
          window.getSelection()?.removeAllRanges();
          window.getSelection()?.addRange(after);
        }
        return;
      }

      const block = this.leafBlock(range.startContainer);

      if (!block || block.tagName === "TD" || block.tagName === "TH") {
        // Into an empty cell or the bare root: place the blocks there.
        const fragment = document.createDocumentFragment();
        for (const node of nodes) fragment.appendChild(node);
        const lastNode = fragment.lastChild;
        range.insertNode(fragment);
        if (lastNode) {
          const end = document.createRange();
          end.selectNodeContents(lastNode);
          end.collapse(false);
          window.getSelection()?.removeAllRanges();
          window.getSelection()?.addRange(end);
        }
        return;
      }

      // Split the current block at the caret.
      const tailRange = document.createRange();
      tailRange.setStart(range.startContainer, range.startOffset);
      tailRange.setEndAfter(block);
      const tailFragment = tailRange.extractContents();
      const tail = tailFragment.firstElementChild as HTMLElement | null;
      const head = block;
      const headEmpty = !head.textContent && !head.querySelector("img");
      const tailEmpty =
        !tail || (!tail.textContent && !tail.querySelector("img"));

      const blocks = nodes.filter(
        (node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim(),
      );
      let caretAnchor: Node | null = null;

      // First block merges into the head line (unless the head is empty,
      // where the pasted block replaces it with its own type).
      if (
        blocks.length &&
        mergeable(blocks[0]) &&
        !headEmpty &&
        head.tagName !== "LI"
      ) {
        const first = blocks.shift()!;
        for (const child of Array.from(first.childNodes))
          head.appendChild(child);
      }

      let insertAfter: Element = head;
      for (const node of blocks) {
        const element =
          node.nodeType === Node.ELEMENT_NODE && isBlock(node)
            ? (node as Element)
            : (() => {
                const p = document.createElement("p");
                p.appendChild(node);
                return p;
              })();
        insertAfter.after(element);
        insertAfter = element;
        caretAnchor = element;
      }

      if (tail && !tailEmpty) {
        insertAfter.after(tail);
        if (caretAnchor && mergeable(caretAnchor) && mergeable(tail)) {
          // The last pasted paragraph and the rest of the line become one.
          const marker = document.createTextNode("");
          (caretAnchor as Element).appendChild(marker);
          for (const child of Array.from(tail.childNodes))
            (caretAnchor as Element).appendChild(child);
          tail.remove();
          this.placeCaret(marker, 0);
        } else {
          this.placeCaret(tail, 0);
        }
      } else if (caretAnchor) {
        const end = document.createRange();
        end.selectNodeContents(caretAnchor);
        end.collapse(false);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(end);
      }

      if (headEmpty && head.parentNode) {
        head.remove();
      } else if (!head.firstChild) {
        head.appendChild(document.createElement("br"));
      }
    });
  }

  /** Inserts a block (table, rule, page break) after the current line. */
  private insertBlock(element: HTMLElement, caretInto?: Node) {
    this.run(() => {
      const range = this.range();
      const block = range ? this.leafBlock(range.startContainer) : null;
      const target =
        block && block.tagName !== "TD" && block.tagName !== "TH"
          ? block
          : null;

      if (target) {
        const empty = !target.textContent && !target.querySelector("img");
        // In a list, the block goes after the whole list.
        let anchor: HTMLElement = target;
        while (
          anchor.parentElement &&
          anchor.parentElement !== this.root &&
          /^(UL|OL|LI|BLOCKQUOTE)$/.test(anchor.parentElement.tagName)
        ) {
          anchor = anchor.parentElement;
        }

        if (empty && anchor === target && target.parentElement === this.root) {
          target.replaceWith(element);
        } else {
          anchor.after(element);
        }
      } else {
        this.root.appendChild(element);
      }

      let next = element.nextElementSibling;
      if (!next || !/^(P|H\d)$/.test(next.tagName)) {
        const p = document.createElement("p");
        p.appendChild(document.createElement("br"));
        element.after(p);
        next = p;
      }

      this.placeCaret(caretInto ?? next, 0);
    });
  }

  insertTable(rows: number, columns: number) {
    const table = document.createElement("table");
    const body = document.createElement("tbody");
    table.appendChild(body);
    let firstCell: HTMLElement | null = null;

    for (let r = 0; r < rows; r += 1) {
      const tr = document.createElement("tr");
      for (let c = 0; c < columns; c += 1) {
        const td = document.createElement("td");
        const p = document.createElement("p");
        p.appendChild(document.createElement("br"));
        td.appendChild(p);
        tr.appendChild(td);
        firstCell ??= p;
      }
      body.appendChild(tr);
    }

    this.insertBlock(table, firstCell ?? undefined);
  }

  insertHorizontalRule() {
    this.insertBlock(document.createElement("hr"));
  }

  insertPageBreak() {
    const hr = document.createElement("hr");
    hr.setAttribute("data-page-break", "");
    hr.contentEditable = "false";
    this.insertBlock(hr);
  }

  insertDate() {
    this.insertContent(escapeHtml(today()));
  }

  insertSignatureBlock() {
    this.insertContent(
      `<p><br></p><p>______________________________</p><p>Signature</p><p><br></p><p>______________________________</p><p>Printed name</p><p><br></p><p>______________________________</p><p>Date</p>`,
    );
  }

  insertSymbol(symbol: string) {
    this.run(() => this.exec("insertText", symbol));
  }

  async insertImageFiles(files: File[]) {
    for (const file of files) {
      if (!/^image\/(png|jpe?g|gif|webp|bmp)$/.test(file.type)) {
        this.options.onNotice(
          "Pictures need to be PNG, JPEG, GIF, WebP or BMP.",
        );
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        this.options.onNotice(
          "That picture is larger than 10 MB. Choose a smaller one.",
        );
        continue;
      }
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const size = await new Promise<{ width: number }>((resolve) => {
        const probe = new Image();
        probe.onload = () => resolve({ width: probe.naturalWidth });
        probe.onerror = () => resolve({ width: 0 });
        probe.src = src;
      });
      const contentWidthPt =
        (this.root.getBoundingClientRect().width / this.zoom()) * 0.75;
      const widthPt = Math.min(
        contentWidthPt || 468,
        Math.max(24, size.width * 0.75),
      );
      this.insertContent(
        `<img src="${src}" style="width: ${Math.round(widthPt)}pt">`,
      );
    }
  }

  /** The editor's zoom factor (the page may be drawn bigger or smaller). */
  zoom() {
    const zoom = Number.parseFloat(
      getComputedStyle(this.root).getPropertyValue("--composer-zoom"),
    );
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }

  /** Resizes a picture while it is dragged; setImageWidth records it. */
  previewImageWidth(image: HTMLImageElement, widthPt: number) {
    image.style.width = `${Math.max(16, Math.round(widthPt))}pt`;
  }

  setImageWidth(image: HTMLImageElement, widthPt: number) {
    this.run(() => {
      image.style.width = `${Math.max(16, Math.round(widthPt))}pt`;
    });
  }

  removeImage(image: HTMLImageElement) {
    this.run(() => image.remove());
    this.selectImage(null);
  }

  // ── Tables ───────────────────────────────────────────────────────────

  private currentCell(): HTMLTableCellElement | null {
    const range = this.range();
    return range
      ? (this.closest(
          range.startContainer,
          "td, th",
        ) as HTMLTableCellElement | null)
      : null;
  }

  tableAction(action: TableAction) {
    const cell = this.currentCell();
    if (!cell) return;
    const row = cell.parentElement as HTMLTableRowElement;
    const table = cell.closest("table") as HTMLTableElement;
    const columnIndex = cell.cellIndex;
    const emptyCell = (tag: "td" | "th") => {
      const element = document.createElement(tag);
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      element.appendChild(p);
      return element;
    };

    this.run(() => {
      switch (action) {
        case "rowAbove":
        case "rowBelow": {
          const tr = document.createElement("tr");
          const count = Array.from(row.cells).reduce(
            (sum, c) => sum + (c.colSpan || 1),
            0,
          );
          for (let i = 0; i < count; i += 1) tr.appendChild(emptyCell("td"));
          if (action === "rowAbove") row.before(tr);
          else row.after(tr);
          this.placeCaret(
            tr.cells[Math.min(columnIndex, tr.cells.length - 1)].firstChild!,
            0,
          );
          break;
        }
        case "columnLeft":
        case "columnRight": {
          for (const tr of Array.from(table.rows)) {
            const reference =
              tr.cells[Math.min(columnIndex, tr.cells.length - 1)];
            const created = emptyCell(
              reference?.tagName === "TH" ? "th" : "td",
            );
            if (!reference) tr.appendChild(created);
            else if (action === "columnLeft") reference.before(created);
            else reference.after(created);
          }
          for (const col of Array.from(
            table.querySelectorAll("td, th"),
          ) as HTMLElement[])
            col.style.removeProperty("width");
          break;
        }
        case "deleteRow": {
          const next = (row.nextElementSibling ??
            row.previousElementSibling) as HTMLTableRowElement | null;
          row.remove();
          if (!table.rows.length) table.remove();
          else if (next)
            this.placeCaret(next.cells[0].firstChild ?? next.cells[0], 0);
          break;
        }
        case "deleteColumn": {
          for (const tr of Array.from(table.rows)) {
            tr.cells[Math.min(columnIndex, tr.cells.length - 1)]?.remove();
          }
          if (!table.querySelector("td, th")) table.remove();
          for (const col of Array.from(
            table.querySelectorAll("td, th"),
          ) as HTMLElement[])
            col.style.removeProperty("width");
          break;
        }
        case "deleteTable": {
          const p = document.createElement("p");
          p.appendChild(document.createElement("br"));
          table.replaceWith(p);
          this.placeCaret(p, 0);
          break;
        }
        case "toggleHeader": {
          const first = table.rows[0];
          if (!first) break;
          const toHeader = first.cells[0]?.tagName !== "TH";
          for (const c of Array.from(first.cells)) {
            const next = document.createElement(toHeader ? "th" : "td");
            for (const attr of Array.from(c.attributes))
              next.setAttribute(attr.name, attr.value);
            while (c.firstChild) next.appendChild(c.firstChild);
            c.replaceWith(next);
          }
          break;
        }
        case "toggleBorders":
          if (table.getAttribute("data-borders") === "none")
            table.removeAttribute("data-borders");
          else table.setAttribute("data-borders", "none");
          break;
      }
    });
  }

  setCellBackground(color: string | null) {
    const cell = this.currentCell();
    if (!cell) return;
    this.run(() => {
      cell.style.backgroundColor = color ?? "";
      if (!cell.getAttribute("style")) cell.removeAttribute("style");
    });
  }

  // ── State ────────────────────────────────────────────────────────────

  getState(): FormatState {
    const range = this.range();
    const node = range?.startContainer ?? this.root.firstChild ?? this.root;
    let element = (
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
    ) as HTMLElement;

    // A caret right before a node reads that node's style.
    if (range && range.collapsed && node.nodeType === Node.ELEMENT_NODE) {
      const child = node.childNodes[Math.max(0, range.startOffset - 1)];
      if (child?.nodeType === Node.ELEMENT_NODE) element = child as HTMLElement;
      else if (child?.parentElement) element = child.parentElement;
    }

    if (!element || !this.root.contains(element)) element = this.root;

    const style = getComputedStyle(element);
    const block = this.leafBlock(element) ?? this.root;
    const blockStyle = getComputedStyle(block);
    const decorations = new Set<string>();
    let highlight: string | null = null;
    let superscript = false;
    let subscript = false;
    let code = false;

    for (
      let current: HTMLElement | null = element;
      current && current !== this.root;
      current = current.parentElement
    ) {
      const s = getComputedStyle(current);
      for (const part of s.textDecorationLine.split(" ")) decorations.add(part);
      if (!highlight && current !== block) {
        const bg = rgbToHex(s.backgroundColor);
        if (bg !== "transparent" && current.tagName !== "CODE") highlight = bg;
      }
      if (current.tagName === "SUP" || s.verticalAlign === "super")
        superscript = true;
      if (current.tagName === "SUB" || s.verticalAlign === "sub")
        subscript = true;
      if (current.tagName === "CODE") code = true;
      if (current === block) break;
    }

    const tag = block.tagName;
    const blockType: BlockType = block.closest("pre")
      ? "pre"
      : block.closest("blockquote")
        ? "blockquote"
        : /^H[1-6]$/.test(tag)
          ? (tag.toLowerCase() as BlockType)
          : block.getAttribute("data-style") === "title"
            ? "title"
            : block.getAttribute("data-style") === "subtitle"
              ? "subtitle"
              : "p";
    const list = this.closest(element, "ul, ol");
    const table = this.closest(element, "table");
    const align = blockStyle.textAlign;
    const fontSizePt =
      this.pendingFontSize && range?.collapsed
        ? this.pendingFontSize
        : Math.round(Number.parseFloat(style.fontSize) * 0.75 * 2) / 2;
    const lineHeightPx = Number.parseFloat(blockStyle.lineHeight);
    const blockFontPx = Number.parseFloat(blockStyle.fontSize);

    return {
      align:
        align === "center" || align === "right" || align === "justify"
          ? align
          : "left",
      block: blockType,
      bold: Number.parseInt(style.fontWeight, 10) >= 600,
      canRedo: this.canRedo(),
      canUndo: this.canUndo(),
      code,
      color: rgbToHex(style.color),
      fontFamily: matchFont(style.fontFamily)?.family ?? DEFAULT_FONT.family,
      fontSizePt,
      hasSelection: !!range && !range.collapsed,
      highlight,
      inTable: !!table,
      italic: style.fontStyle === "italic" || style.fontStyle === "oblique",
      lineHeight:
        Number.isFinite(lineHeightPx) && blockFontPx
          ? Math.round((lineHeightPx / blockFontPx) * 100) / 100
          : 1.15,
      link: this.currentLink()?.getAttribute("href") ?? null,
      list: list
        ? list.getAttribute("data-type") === "checklist"
          ? "checklist"
          : (list.tagName.toLowerCase() as ListKind)
        : null,
      listStyle: list ? getComputedStyle(list).listStyleType : null,
      spaceAfter: Number.parseFloat(blockStyle.marginBottom) > 0.5,
      spaceBefore: Number.parseFloat(blockStyle.marginTop) > 0.5,
      strike: decorations.has("line-through"),
      subscript,
      superscript,
      tableBorders: table?.getAttribute("data-borders") !== "none",
      tableHeader: table
        ? (table as HTMLTableElement).rows[0]?.cells[0]?.tagName === "TH"
        : false,
      underline: decorations.has("underline"),
    };
  }
}
