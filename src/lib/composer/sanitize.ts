// Turns any HTML (pasted from Word, Google Docs, Pages, a web page, or made
// by an importer) into the small, safe dialect the composer edits:
//
//   blocks   p, h1–h6, ul, ol, li, blockquote, pre, table, hr, br
//   inline   strong, em, u, s, sub, sup, a, code, span, img
//   styles   colour, highlight, font, size, alignment, indent, spacing
//
// Nothing that runs, loads or links out survives: no script, no style
// sheets, no event attributes, no iframes, no javascript: links. Browser
// only (uses DOMParser).

import { DEFAULT_FONT, matchFont } from "./fonts.ts";

const DROP = new Set([
  "applet",
  "audio",
  "base",
  "button",
  "canvas",
  "embed",
  "form",
  "frame",
  "frameset",
  "head",
  "iframe",
  "link",
  "map",
  "math",
  "meta",
  "noscript",
  "object",
  "option",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
  "title",
  "video",
  "xml",
]);

const BLOCKS = new Set([
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "ol",
  "p",
  "pre",
  "table",
  "ul",
]);

const RENAME: Record<string, string> = {
  article: "p",
  aside: "p",
  b: "strong",
  center: "p",
  del: "s",
  dd: "p",
  div: "p",
  dt: "p",
  figcaption: "p",
  footer: "p",
  header: "p",
  i: "em",
  ins: "u",
  kbd: "code",
  main: "p",
  mark: "span",
  section: "p",
  samp: "code",
  strike: "s",
  tt: "code",
  var: "em",
};

const KEEP = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const BLOCK_STYLE_PROPS = [
  "text-align",
  "line-height",
  "margin-left",
  "margin-top",
  "margin-bottom",
  "text-indent",
] as const;

const INLINE_STYLE_PROPS = [
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "vertical-align",
] as const;

const CELL_STYLE_PROPS = [
  "background-color",
  "text-align",
  "vertical-align",
  "width",
] as const;

export type SanitizeOptions = {
  /** Keep colours and fonts (false for "paste without formatting"). */
  keepFormatting?: boolean;
};

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text to paragraphs, keeping blank lines and tabs. */
export function textToHtml(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  return lines
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>"))
    .join("");
}

function safeUrl(raw: string | null, kind: "link" | "image") {
  if (!raw) {
    return null;
  }

  const value = raw.trim();

  if (kind === "image") {
    // Only pictures carried inside the document. Linked ones can't be
    // loaded here (the page's security policy) or put in the PDF.
    return /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(value)
      ? value
      : null;
  }

  if (/^(https?:|mailto:|tel:)/i.test(value)) {
    return value;
  }

  if (/^www\./i.test(value)) {
    return `https://${value}`;
  }

  return null;
}

function parseLengthToPt(value: string, basePt = 11): number | null {
  const match = /^(-?[\d.]+)(px|pt|em|rem|in|cm|mm|%)?$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const n = Number.parseFloat(match[1]);

  if (!Number.isFinite(n)) {
    return null;
  }

  switch (match[2] ?? "px") {
    case "pt":
      return n;
    case "px":
      return n * 0.75;
    case "em":
    case "rem":
      return n * basePt;
    case "in":
      return n * 72;
    case "cm":
      return (n * 72) / 2.54;
    case "mm":
      return (n * 72) / 25.4;
    case "%":
      return (n / 100) * basePt;
    default:
      return null;
  }
}

const NAMED_SIZES: Record<string, number> = {
  large: 13.5,
  larger: 14,
  medium: 12,
  small: 10,
  smaller: 9,
  "x-large": 18,
  "x-small": 7.5,
  "xx-large": 24,
  "xx-small": 7,
  "xxx-large": 36,
};

const FONT_TAG_SIZES = [0, 7.5, 10, 12, 13.5, 18, 24, 36];

function round(n: number) {
  return Math.round(n * 2) / 2;
}

function isNeutralColor(value: string) {
  const v = value.replace(/\s+/g, "").toLowerCase();

  return (
    v === "" ||
    v === "inherit" ||
    v === "initial" ||
    v === "transparent" ||
    v === "windowtext" ||
    v === "currentcolor" ||
    v === "rgba(0,0,0,0)"
  );
}

function isDefaultTextColor(value: string) {
  const v = value.replace(/\s+/g, "").toLowerCase();

  return v === "#000" || v === "#000000" || v === "black" || v === "rgb(0,0,0)";
}

function isWhite(value: string) {
  const v = value.replace(/\s+/g, "").toLowerCase();

  return (
    v === "#fff" || v === "#ffffff" || v === "white" || v === "rgb(255,255,255)"
  );
}

function cleanColor(value: string) {
  // Only plain colour syntax: no url(), var() or expressions.
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|[a-z]+)$/i.test(
    value.trim(),
  )
    ? value.trim()
    : null;
}

/**
 * The allowed declarations from an inline style, normalised: sizes in pt,
 * fonts mapped to the composer's, weights to 400/700.
 */
function filterStyle(
  element: HTMLElement,
  props: readonly string[],
  keepFormatting: boolean,
) {
  const style = element.style;
  const out: string[] = [];
  const formatting = new Set([
    "color",
    "background-color",
    "font-family",
    "font-size",
  ]);

  for (const prop of props) {
    let value = style.getPropertyValue(prop).trim();

    if (!value) {
      continue;
    }

    if (!keepFormatting && formatting.has(prop)) {
      continue;
    }

    switch (prop) {
      case "color": {
        const color = cleanColor(value);

        if (!color || isNeutralColor(color) || isDefaultTextColor(color)) {
          continue;
        }

        value = color;
        break;
      }
      case "background-color": {
        const color = cleanColor(value);

        if (!color || isNeutralColor(color) || isWhite(color)) {
          continue;
        }

        value = color;
        break;
      }
      case "font-family": {
        const font = matchFont(value);

        if (!font || font === DEFAULT_FONT) {
          continue;
        }

        value = `"${font.family}"`;
        break;
      }
      case "font-size": {
        const pt = NAMED_SIZES[value] ?? parseLengthToPt(value);

        if (!pt || pt < 4 || pt > 400) {
          continue;
        }

        value = `${round(pt)}pt`;
        break;
      }
      case "font-weight": {
        const weight =
          value === "bold" || value === "bolder"
            ? 700
            : value === "normal" || value === "lighter"
              ? 400
              : Number.parseInt(value, 10);

        if (!Number.isFinite(weight)) {
          continue;
        }

        value = weight >= 600 ? "700" : "400";
        break;
      }
      case "font-style":
        if (value !== "italic" && value !== "oblique" && value !== "normal") {
          continue;
        }

        value = value === "normal" ? "normal" : "italic";
        break;
      case "text-decoration":
      case "text-decoration-line": {
        const parts = value
          .split(/\s+/)
          .filter((part) => part === "underline" || part === "line-through");

        if (parts.length === 0) {
          if (/\bnone\b/.test(value)) {
            out.push("text-decoration-line: none");
          }

          continue;
        }

        out.push(`text-decoration-line: ${parts.join(" ")}`);
        continue;
      }
      case "vertical-align":
        if (element.tagName === "TD" || element.tagName === "TH") {
          if (!/^(top|middle|bottom)$/.test(value)) {
            continue;
          }
        } else if (value !== "super" && value !== "sub") {
          continue;
        }

        break;
      case "text-align":
        if (!/^(left|right|center|justify|start|end)$/.test(value)) {
          continue;
        }

        if (value === "start" || value === "left") {
          continue;
        }

        value = value === "end" ? "right" : value;
        break;
      case "line-height": {
        const n = Number.parseFloat(value);

        if (/^[\d.]+$/.test(value) && n >= 0.8 && n <= 4) {
          value = String(Math.round(n * 100) / 100);
          break;
        }

        if (/%$/.test(value) && n >= 80 && n <= 400) {
          value = String(Math.round(n) / 100);
          break;
        }

        continue;
      }
      case "margin-left":
      case "text-indent": {
        const pt = parseLengthToPt(value);

        if (pt === null || Math.abs(pt) < 1 || Math.abs(pt) > 400) {
          continue;
        }

        value = `${round(pt)}pt`;
        break;
      }
      case "margin-top":
      case "margin-bottom": {
        const pt = parseLengthToPt(value);

        if (pt === null || pt < 0 || pt > 144) {
          continue;
        }

        value = `${round(pt)}pt`;
        break;
      }
      case "width": {
        const pt = parseLengthToPt(value, 0);

        if (/%$/.test(value)) {
          const n = Number.parseFloat(value);

          if (n > 0 && n <= 100) {
            value = `${Math.round(n)}%`;
            break;
          }

          continue;
        }

        if (!pt || pt < 4 || pt > 2000) {
          continue;
        }

        value = `${round(pt)}pt`;
        break;
      }
    }

    out.push(`${prop}: ${value}`);
  }

  return out.join("; ");
}

function unwrap(element: Element) {
  const parent = element.parentNode;

  if (!parent) {
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function rename(element: Element, tag: string) {
  const doc = element.ownerDocument;
  const next = doc.createElement(tag);

  for (const attr of Array.from(element.attributes)) {
    next.setAttribute(attr.name, attr.value);
  }

  while (element.firstChild) {
    next.appendChild(element.firstChild);
  }

  element.replaceWith(next);

  return next;
}

function cleanElement(
  element: HTMLElement,
  keepFormatting: boolean,
): HTMLElement | null {
  let tag = element.tagName.toLowerCase();

  // Word's namespaced tags (o:p, w:sdt, v:shape …).
  if (tag.includes(":")) {
    if (tag === "v:imagedata") {
      element.remove();
      return null;
    }

    unwrap(element);
    return null;
  }

  if (DROP.has(tag)) {
    element.remove();
    return null;
  }

  // Google Docs wraps a whole paste in <b style="font-weight:normal">.
  if (
    tag === "b" &&
    (element.id.startsWith("docs-internal-guid") ||
      /font-weight\s*:\s*(normal|400)/i.test(
        element.getAttribute("style") ?? "",
      ))
  ) {
    unwrap(element);
    return null;
  }

  if (tag === "font") {
    const span = rename(element, "span") as HTMLElement;
    const face = element.getAttribute("face");
    const color = element.getAttribute("color");
    const size = Number.parseInt(element.getAttribute("size") ?? "", 10);

    if (face) span.style.fontFamily = face;
    if (color) span.style.color = color;
    if (size >= 1 && size <= 7)
      span.style.fontSize = `${FONT_TAG_SIZES[size]}pt`;

    element = span;
    tag = "span";
  }

  if (RENAME[tag]) {
    element = rename(element, RENAME[tag]) as HTMLElement;
    tag = RENAME[tag];
  }

  if (tag === "input") {
    // A checkbox from a pasted checklist becomes the list's own state.
    const li = element.closest("li");

    if (li && (element as HTMLInputElement).type === "checkbox") {
      li.setAttribute(
        "data-checked",
        element.hasAttribute("checked") ? "true" : "false",
      );
      li.parentElement?.setAttribute("data-type", "checklist");
    }

    element.remove();
    return null;
  }

  if (!KEEP.has(tag)) {
    unwrap(element);
    return null;
  }

  // Attributes: rebuild from an allow-list.
  const style =
    tag === "td" || tag === "th"
      ? filterStyle(element, CELL_STYLE_PROPS, keepFormatting)
      : tag === "img"
        ? filterStyle(element, ["width"], true)
        : BLOCKS.has(tag)
          ? [
              filterStyle(element, BLOCK_STYLE_PROPS, keepFormatting),
              tag === "li" || tag === "p" || /^h\d$/.test(tag)
                ? filterStyle(element, INLINE_STYLE_PROPS, keepFormatting)
                : "",
            ]
              .filter(Boolean)
              .join("; ")
          : filterStyle(element, INLINE_STYLE_PROPS, keepFormatting);
  const kept: Record<string, string> = {};

  if (tag === "a") {
    const href = safeUrl(element.getAttribute("href"), "link");

    if (!href) {
      unwrap(element);
      return null;
    }

    kept.href = href;
  }

  if (tag === "img") {
    const src = safeUrl(element.getAttribute("src"), "image");

    if (!src) {
      element.remove();
      return null;
    }

    kept.src = src;
    const alt = element.getAttribute("alt");
    if (alt) kept.alt = alt.slice(0, 300);
    const width = Number.parseFloat(element.getAttribute("width") ?? "");
    if (!style && width > 0) kept.style = `width: ${round(width * 0.75)}pt`;
    const align = element.getAttribute("data-align");
    if (align === "center" || align === "right") kept["data-align"] = align;
  }

  if (tag === "ol") {
    const start = Number.parseInt(element.getAttribute("start") ?? "", 10);
    if (start > 1 && start < 100000) kept.start = String(start);
    const type = element.getAttribute("type");
    if (type && /^[1aAiI]$/.test(type)) kept.type = type;
  }

  if (tag === "ul" && element.getAttribute("data-type") === "checklist") {
    kept["data-type"] = "checklist";
  }

  if (tag === "li") {
    const checked = element.getAttribute("data-checked");
    if (checked === "true" || checked === "false")
      kept["data-checked"] = checked;
  }

  if (tag === "td" || tag === "th") {
    for (const name of ["colspan", "rowspan"]) {
      const n = Number.parseInt(element.getAttribute(name) ?? "", 10);
      if (n > 1 && n < 50) kept[name] = String(n);
    }
  }

  if (tag === "table" && element.getAttribute("data-borders") === "none") {
    kept["data-borders"] = "none";
  }

  if (tag === "hr" && element.hasAttribute("data-page-break")) {
    kept["data-page-break"] = "";
  }

  if (tag === "p") {
    const blockStyle = element.getAttribute("data-style");
    if (blockStyle === "title" || blockStyle === "subtitle") {
      kept["data-style"] = blockStyle;
    }
  }

  // Lists in Word HTML often carry list styles we can't keep.
  if (tag === "ul" || tag === "ol") {
    const listStyle = element.style.listStyleType;
    if (
      /^(disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman|lower-latin|upper-latin)$/.test(
        listStyle,
      )
    ) {
      kept.style = `list-style-type: ${listStyle.replace("latin", "alpha")}`;
    }
  }

  for (const attr of Array.from(element.attributes)) {
    element.removeAttribute(attr.name);
  }

  if (style && tag !== "ul" && tag !== "ol") {
    element.setAttribute("style", style);
  }

  for (const [name, value] of Object.entries(kept)) {
    element.setAttribute(name, value);
  }

  // A span that styles nothing is noise.
  if (tag === "span" && !element.getAttribute("style")) {
    unwrap(element);
    return null;
  }

  // Inline styles that say "bold"/"italic"/"super" become their tags, so
  // the toolbar recognises them.
  if (tag === "span") {
    const s = element.style;

    if (s.verticalAlign === "super" || s.verticalAlign === "sub") {
      const wrapper = element.ownerDocument.createElement(
        s.verticalAlign === "super" ? "sup" : "sub",
      );
      s.removeProperty("vertical-align");
      element.replaceWith(wrapper);
      wrapper.appendChild(element);

      if (!element.getAttribute("style")) {
        unwrap(element);
      }

      return wrapper;
    }
  }

  return element;
}

function walk(node: Node, keepFormatting: boolean) {
  let child = node.firstChild;

  while (child) {
    if (child.nodeType === Node.COMMENT_NODE) {
      const next: ChildNode | null = child.nextSibling;
      child.remove();
      child = next;
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child = child.nextSibling;
      continue;
    }

    const previous = child.previousSibling;
    const kept = cleanElement(child as HTMLElement, keepFormatting);

    if (kept) {
      walk(kept, keepFormatting);
      child = kept.nextSibling;
    } else {
      // Unwrapped (its children now stand in its place and are visited
      // next) or removed (the walk carries on with what followed it).
      child = previous ? previous.nextSibling : node.firstChild;
    }
  }
}

/**
 * Puts loose inline content into paragraphs, gives empty blocks a <br> so
 * the caret can enter them, and drops blocks nested where the editor
 * can't edit them (a paragraph inside a span, say).
 */
function normalizeStructure(root: HTMLElement) {
  const doc = root.ownerDocument;
  let paragraph: HTMLElement | null = null;

  for (const child of Array.from(root.childNodes)) {
    const isBlock =
      child.nodeType === Node.ELEMENT_NODE &&
      (BLOCKS.has((child as Element).tagName.toLowerCase()) ||
        (child as Element).tagName === "HR");

    if (isBlock) {
      paragraph = null;
      continue;
    }

    if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) {
      if (!paragraph) {
        child.remove();
        continue;
      }
    }

    if (
      child.nodeType === Node.ELEMENT_NODE &&
      (child as Element).tagName === "BR"
    ) {
      if (!paragraph) {
        child.remove();
        paragraph = null;
        continue;
      }
    }

    if (!paragraph) {
      paragraph = doc.createElement("p");
      root.insertBefore(paragraph, child);
    }

    paragraph.appendChild(child);
  }

  // Tables: every row in a tbody, every cell holding a paragraph.
  for (const table of Array.from(root.querySelectorAll("table"))) {
    for (const row of Array.from(table.children)) {
      if (row.tagName === "TR") {
        let body = table.querySelector(":scope > tbody");
        if (!body) {
          body = doc.createElement("tbody");
          table.appendChild(body);
        }
        body.appendChild(row);
      }
    }

    for (const cell of Array.from(table.querySelectorAll("td, th"))) {
      if (
        !cell.firstElementChild ||
        !BLOCKS.has(cell.firstElementChild.tagName.toLowerCase())
      ) {
        const p = doc.createElement("p");
        while (cell.firstChild) p.appendChild(cell.firstChild);
        cell.appendChild(p);
      }
    }
  }

  // Lists: stray text directly in ul/ol goes into an li.
  for (const list of Array.from(root.querySelectorAll("ul, ol"))) {
    for (const child of Array.from(list.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = (child as Element).tagName;
        if (tag === "LI" || tag === "UL" || tag === "OL") continue;
      } else if (!child.textContent?.trim()) {
        child.remove();
        continue;
      }

      const li = doc.createElement("li");
      list.insertBefore(li, child);
      li.appendChild(child);
    }
  }

  // Paragraphs inside paragraphs (div > div from the web) flatten out.
  for (const inner of Array.from(
    root.querySelectorAll("p p, h1 p, h2 p, h3 p, h4 p, h5 p, h6 p"),
  )) {
    const outer = inner.parentElement!;
    if (
      outer.tagName === "LI" ||
      outer.tagName === "TD" ||
      outer.tagName === "TH"
    )
      continue;
    unwrap(inner);
    outer.appendChild(doc.createElement("br"));
  }

  for (const block of Array.from(
    root.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, td, th"),
  )) {
    if (
      !block.textContent &&
      !block.querySelector("img, br, hr, ul, ol, table, p")
    ) {
      block.appendChild(doc.createElement("br"));
    }
  }

  // Trailing <br> at the end of a block is a Word/Docs artefact, unless
  // it is the block's only content.
  for (const br of Array.from(root.querySelectorAll("p > br:last-child"))) {
    const p = br.parentElement!;
    if (p.childNodes.length > 1 && br.previousSibling?.nodeName !== "BR") {
      br.remove();
    }
  }
}

/** Cleans HTML into the composer's dialect. Browser only. */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}) {
  const keepFormatting = options.keepFormatting ?? true;
  // Word puts the real content between these markers.
  const fragmentMatch =
    /<!--StartFragment-->([\s\S]*?)<!--EndFragment-->/i.exec(html);
  const source = fragmentMatch ? fragmentMatch[1] : html;
  const parsed = new DOMParser().parseFromString(
    `<!doctype html><body>${source}</body>`,
    "text/html",
  );
  const body = parsed.body;

  walk(body, keepFormatting);
  normalizeStructure(body);

  return body.innerHTML.trim();
}

/** Plain text from HTML, one line per block. */
export function htmlToPlainText(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");

  for (const block of Array.from(
    parsed.body.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, li, tr, pre, blockquote",
    ),
  )) {
    block.append("\n");
  }

  for (const br of Array.from(parsed.body.querySelectorAll("br"))) {
    br.replaceWith("\n");
  }

  return (parsed.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}
