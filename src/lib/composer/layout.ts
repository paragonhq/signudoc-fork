// Measures a laid-out document and splits it into pages.
//
// The browser has already done the hard part (line breaking, justification,
// tables, lists) for the editor. This reads where every word, picture,
// border and list marker landed, then cuts the long column into pages:
// a line or a table row never splits, a page break starts a new page, and
// a block that moves to a new page loses the space above it. The editor
// uses the result to draw page boundaries; the PDF writer draws from it.
//
// All measurements are CSS pixels relative to the document's top-left,
// already divided by any zoom on the page.

import { CHECKBOX_GAP_PT, CHECKBOX_SIZE_PT } from "./doc-styles.ts";
import {
  DEFAULT_FONT,
  fontFaceKey,
  matchFont,
  type ComposerFont,
  type FontFace,
} from "./fonts.ts";

export type Rgba = { a: number; b: number; g: number; r: number };

export type TextStyle = {
  ascentPx: number;
  color: Rgba;
  descentPx: number;
  face: FontFace;
  font: ComposerFont;
  highlight: Rgba | null;
  sizePx: number;
  strike: Rgba | null;
  synthItalic: boolean;
  underline: Rgba | null;
};

export type LayoutItem =
  | {
      kind: "text";
      baseline: number;
      height: number;
      style: TextStyle;
      text: string;
      width: number;
      x: number;
      y: number;
    }
  | {
      kind: "image";
      height: number;
      src: string;
      width: number;
      x: number;
      y: number;
    }
  | {
      kind: "fill";
      color: Rgba;
      height: number;
      width: number;
      x: number;
      y: number;
    }
  | {
      kind: "marker";
      baseline: number;
      height: number;
      marker: string;
      style: TextStyle;
      width: number;
      x: number;
      y: number;
    }
  | {
      checked: boolean;
      kind: "checkbox";
      height: number;
      size: number;
      width: number;
      x: number;
      y: number;
    };

/** A block's background and borders: split across pages when it spans them. */
export type LayoutBox = {
  borders: { bottom?: Border; left?: Border; right?: Border; top?: Border };
  bottom: number;
  fill: Rgba | null;
  left: number;
  right: number;
  top: number;
};

type Border = { color: Rgba; width: number };

type Atom = { bottom: number; items: number[]; key?: Element; top: number };

export type Measured = {
  boxes: LayoutBox[];
  breaks: number[];
  height: number;
  items: LayoutItem[];
  /** Vertical extents that must stay together, with the items they hold. */
  atoms: Atom[];
  width: number;
};

export type PagedItem = LayoutItem & { page: number };
export type PagedBox = {
  borders: LayoutBox["borders"];
  fill: Rgba | null;
  height: number;
  page: number;
  width: number;
  x: number;
  y: number;
};

export type Paginated = {
  boxes: PagedBox[];
  items: PagedItem[];
  pageCount: number;
  /** Where each page after the first begins, in document pixels. */
  pageStarts: number[];
};

const LEAF_BLOCKS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "PRE",
  "TD",
  "TH",
  "BLOCKQUOTE",
]);
const PT_TO_PX = 4 / 3;

export function parseColor(value: string): Rgba | null {
  const match =
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(
      value,
    );

  if (!match) return null;
  let alpha = match[4] === undefined ? 1 : Number.parseFloat(match[4]);
  if (match[4]?.endsWith("%")) alpha /= 100;
  if (alpha <= 0.001) return null;

  return {
    a: alpha,
    b: Number(match[3]) / 255,
    g: Number(match[2]) / 255,
    r: Number(match[1]) / 255,
  };
}

function availableFace(font: ComposerFont, bold: boolean, italic: boolean) {
  const wanted = fontFaceKey(bold, italic);

  if (font.standard || font.faces?.includes(wanted)) {
    return { face: wanted, synthItalic: false };
  }

  const upright = fontFaceKey(bold, false);
  if (italic && font.faces?.includes(upright))
    return { face: upright, synthItalic: true };
  if (bold && font.faces?.includes(fontFaceKey(false, italic))) {
    return { face: fontFaceKey(false, italic), synthItalic: false };
  }

  return { face: "regular" as FontFace, synthItalic: italic };
}

let metricsCanvas: CanvasRenderingContext2D | null = null;
const metricsCache = new Map<string, { ascent: number; descent: number }>();

function fontMetrics(cssFont: string, sizePx: number) {
  const key = cssFont;
  let cached = metricsCache.get(key);

  if (!cached) {
    metricsCanvas ??= document.createElement("canvas").getContext("2d");
    if (metricsCanvas) {
      metricsCanvas.font = cssFont;
      const m = metricsCanvas.measureText("Hg");
      cached = {
        ascent: m.fontBoundingBoxAscent || sizePx * 0.9,
        descent: m.fontBoundingBoxDescent || sizePx * 0.22,
      };
    } else {
      cached = { ascent: sizePx * 0.9, descent: sizePx * 0.22 };
    }
    metricsCache.set(key, cached);
  }

  return cached;
}

function leafBlockOf(element: Element, root: Element) {
  let current: Element | null = element;
  while (current && current !== root) {
    if (LEAF_BLOCKS.has(current.tagName)) return current;
    current = current.parentElement;
  }
  return root;
}

function outermostRow(element: Element, root: Element) {
  let row: Element | null = null;
  let current: Element | null = element;
  while (current && current !== root) {
    if (current.tagName === "TR") row = current;
    current = current.parentElement;
  }
  return row;
}

/**
 * Reads the laid-out document. With `words`, every word is measured (for
 * the PDF); without, whole text runs (enough for page boundaries).
 */
export function measureDocument(
  root: HTMLElement,
  options: { scale?: number; words: boolean },
): Measured {
  const scale = options.scale ?? 1;
  const origin = root.getBoundingClientRect();
  const items: LayoutItem[] = [];
  const atoms: Atom[] = [];
  const rowAtoms = new Map<Element, Atom>();
  const boxes: LayoutBox[] = [];
  const breaks: number[] = [];
  const styleCache = new Map<Element, TextStyle>();
  const range = document.createRange();

  const rel = (rect: DOMRect) => ({
    bottom: (rect.bottom - origin.top) / scale,
    height: rect.height / scale,
    left: (rect.left - origin.left) / scale,
    right: (rect.right - origin.left) / scale,
    top: (rect.top - origin.top) / scale,
    width: rect.width / scale,
  });

  const place = (item: LayoutItem, host: Element) => {
    const index = items.push(item) - 1;
    const row = outermostRow(host, root);
    const top = item.y;
    const bottom = item.y + item.height;

    if (row) {
      let atom = rowAtoms.get(row);
      if (!atom) {
        const r = rel(row.getBoundingClientRect());
        atom = { bottom: r.bottom, items: [], key: row, top: r.top };
        rowAtoms.set(row, atom);
        atoms.push(atom);
      }
      atom.items.push(index);
      return;
    }

    atoms.push({ bottom, items: [index], top });
  };

  const styleOf = (element: Element): TextStyle => {
    const cached = styleCache.get(element);
    if (cached) return cached;

    const cs = getComputedStyle(element);
    const font = matchFont(cs.fontFamily) ?? DEFAULT_FONT;
    const bold = Number.parseInt(cs.fontWeight, 10) >= 600;
    const italic = cs.fontStyle !== "normal";
    const sizePx = Number.parseFloat(cs.fontSize);
    const { face, synthItalic } = availableFace(font, bold, italic);
    const metrics = fontMetrics(
      `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
      sizePx,
    );
    const block = leafBlockOf(element, root);
    let underline: Rgba | null = null;
    let strike: Rgba | null = null;
    let highlight: Rgba | null = null;

    for (
      let current: Element | null = element;
      current;
      current = current.parentElement
    ) {
      const s = current === element ? cs : getComputedStyle(current);
      const lines = s.textDecorationLine;
      const decorationColor =
        parseColor(s.textDecorationColor) ?? parseColor(s.color);
      if (!underline && lines.includes("underline"))
        underline = decorationColor;
      if (!strike && lines.includes("line-through")) strike = decorationColor;
      if (current === block || current === root) break;
      if (!highlight && s.display.startsWith("inline"))
        highlight = parseColor(s.backgroundColor);
    }

    const style: TextStyle = {
      ascentPx: metrics.ascent,
      color: parseColor(cs.color) ?? { a: 1, b: 0, g: 0, r: 0 },
      descentPx: metrics.descent,
      face,
      font,
      highlight,
      sizePx,
      strike,
      synthItalic,
      underline,
    };
    styleCache.set(element, style);

    return style;
  };

  const addText = (
    text: string,
    rect: DOMRect,
    style: TextStyle,
    host: Element,
  ) => {
    const r = rel(rect);
    if (r.width <= 0 && r.height <= 0) return;
    // The baseline: the text box is the font's ascent + descent, centred
    // the same way the browser centres it.
    const contentHeight = style.ascentPx + style.descentPx;
    const baseline = r.top + (r.height - contentHeight) / 2 + style.ascentPx;
    place(
      {
        baseline,
        height: r.height,
        kind: "text",
        style,
        text,
        width: r.width,
        x: r.left,
        y: r.top,
      },
      host,
    );
  };

  // ── Text ──
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (
    let node = walker.nextNode() as Text | null;
    node;
    node = walker.nextNode() as Text | null
  ) {
    const host = node.parentElement;
    if (!host || !node.data) continue;
    if (host.closest("hr")) continue;

    if (!options.words) {
      const row = outermostRow(host, root);
      if (row) {
        if (!rowAtoms.has(row)) {
          const r = rel(row.getBoundingClientRect());
          const atom = { bottom: r.bottom, items: [], key: row, top: r.top };
          rowAtoms.set(row, atom);
          atoms.push(atom);
        }
        continue;
      }
      range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) {
        const r = rel(rect);
        if (r.height > 0)
          atoms.push({ bottom: r.bottom, items: [], top: r.top });
      }
      continue;
    }

    const style = styleOf(host);
    const tokens = node.data.matchAll(/[^\s ]+[ \t ]*|[ \t ]+|\n/g);

    for (const token of tokens) {
      const start = token.index ?? 0;
      const raw = token[0];
      if (raw === "\n") continue;
      const word = raw.replace(/[\s ]+$/, "");
      range.setStart(node, start);
      range.setEnd(node, start + raw.length);
      const rects = Array.from(range.getClientRects()).filter(
        (rect) => rect.height > 0,
      );

      if (rects.length === 0) continue;

      if (rects.length === 1 || !word) {
        // Whitespace still carries underline and highlight across words.
        addText(word, rects[0], style, host);
        continue;
      }

      // A word broken across lines (a long link): place it by character.
      let segment = "";
      let segmentRect: DOMRect | null = null;
      for (let i = 0; i < word.length; i += 1) {
        range.setStart(node, start + i);
        range.setEnd(node, start + i + 1);
        const rect = range.getBoundingClientRect();
        if (segmentRect && Math.abs(rect.top - segmentRect.top) < 1) {
          segment += word[i];
          segmentRect = new DOMRect(
            segmentRect.left,
            segmentRect.top,
            rect.right - segmentRect.left,
            Math.max(segmentRect.height, rect.height),
          );
        } else {
          if (segmentRect && segment)
            addText(segment, segmentRect, style, host);
          segment = word[i];
          segmentRect = rect;
        }
      }
      if (segmentRect && segment) addText(segment, segmentRect, style, host);
    }
  }

  // ── Elements: pictures, rules, breaks, backgrounds, borders, markers ──
  for (const element of Array.from(root.querySelectorAll("*"))) {
    const tag = element.tagName;

    if (tag === "HR") {
      const r = rel(element.getBoundingClientRect());
      if (element.hasAttribute("data-page-break")) {
        breaks.push(r.top);
        continue;
      }
      const cs = getComputedStyle(element);
      const width = Number.parseFloat(cs.borderTopWidth);
      const color = parseColor(cs.borderTopColor);
      if (width > 0 && color && cs.borderTopStyle !== "none") {
        place(
          {
            color,
            height: width,
            kind: "fill",
            width: r.width,
            x: r.left,
            y: r.top,
          },
          element,
        );
      }
      continue;
    }

    if (tag === "IMG") {
      const image = element as HTMLImageElement;
      const r = rel(image.getBoundingClientRect());
      if (r.width > 0 && r.height > 0 && image.src) {
        place(
          {
            height: r.height,
            kind: "image",
            src: image.currentSrc || image.src,
            width: r.width,
            x: r.left,
            y: r.top,
          },
          element,
        );
      }
      continue;
    }

    const cs = getComputedStyle(element);
    if (cs.display.startsWith("inline") || cs.display === "none") {
      continue;
    }

    if (options.words) {
      const fill = parseColor(cs.backgroundColor);
      const borders: LayoutBox["borders"] = {};
      for (const side of ["top", "right", "bottom", "left"] as const) {
        const style = cs.getPropertyValue(`border-${side}-style`);
        const width = Number.parseFloat(
          cs.getPropertyValue(`border-${side}-width`),
        );
        const color = parseColor(cs.getPropertyValue(`border-${side}-color`));
        if (width > 0 && color && style !== "none" && style !== "hidden") {
          borders[side] = { color, width };
        }
      }

      if (fill || Object.keys(borders).length) {
        const r = rel(element.getBoundingClientRect());
        boxes.push({
          borders,
          bottom: r.bottom,
          fill,
          left: r.left,
          right: r.right,
          top: r.top,
        });
      }
    }

    if (tag === "LI" && options.words) {
      addListMarker(element as HTMLLIElement, cs, styleOf, rel, place, items);
    }
  }

  const rootRect = rel(root.getBoundingClientRect());

  return {
    atoms,
    boxes,
    breaks,
    height: Math.max(rootRect.height, root.scrollHeight),
    items,
    width: rootRect.width,
  };
}

function toRoman(n: number) {
  const numerals: Array<[number, string]> = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let out = "";
  for (const [value, numeral] of numerals) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

function toAlpha(n: number) {
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

export function listMarkerText(type: string, index: number) {
  switch (type) {
    case "decimal":
      return `${index}.`;
    case "decimal-leading-zero":
      return `${String(index).padStart(2, "0")}.`;
    case "lower-alpha":
    case "lower-latin":
      return `${toAlpha(index)}.`;
    case "upper-alpha":
    case "upper-latin":
      return `${toAlpha(index).toUpperCase()}.`;
    case "lower-roman":
      return `${toRoman(index)}.`;
    case "upper-roman":
      return `${toRoman(index).toUpperCase()}.`;
    case "disc":
      return "•";
    case "circle":
      return "◦";
    case "square":
      return "▪";
    default:
      return "";
  }
}

function addListMarker(
  li: HTMLLIElement,
  cs: CSSStyleDeclaration,
  styleOf: (element: Element) => TextStyle,
  rel: (rect: DOMRect) => {
    left: number;
    top: number;
    height: number;
    width: number;
    bottom: number;
    right: number;
  },
  place: (item: LayoutItem, host: Element) => void,
  items: LayoutItem[],
) {
  const list = li.parentElement;
  if (!list) return;
  const r = rel(li.getBoundingClientRect());
  const style = styleOf(li);

  if (list.getAttribute("data-type") === "checklist") {
    const size = CHECKBOX_SIZE_PT * PT_TO_PX;
    const y = r.top + 0.575 * style.sizePx - size / 2;
    place(
      {
        checked: li.getAttribute("data-checked") === "true",
        height: size,
        kind: "checkbox",
        size,
        width: size,
        x: r.left - CHECKBOX_GAP_PT * PT_TO_PX,
        y,
      },
      li,
    );
    return;
  }

  const type = cs.listStyleType;
  if (!type || type === "none") return;

  let index = 1;
  if (list.tagName === "OL") {
    const start = Number.parseInt(list.getAttribute("start") ?? "1", 10);
    index = Number.isFinite(start) ? start : 1;
    for (
      let sibling = li.previousElementSibling;
      sibling;
      sibling = sibling.previousElementSibling
    ) {
      if (sibling.tagName === "LI") index += 1;
    }
  }

  const marker = listMarkerText(type, index);
  if (!marker) return;

  // The first line of the item sets the marker's baseline.
  const firstText = items.find(
    (item) =>
      item.kind === "text" &&
      item.text &&
      item.y >= r.top - 1 &&
      item.y < r.bottom,
  ) as Extract<LayoutItem, { kind: "text" }> | undefined;
  const baseline =
    firstText && Math.abs(firstText.y - r.top) < style.sizePx * 2
      ? firstText.baseline
      : r.top +
        (style.sizePx * 1.15 - (style.ascentPx + style.descentPx)) / 2 +
        style.ascentPx;
  const markerStyle =
    firstText && Math.abs(firstText.y - r.top) < style.sizePx * 2
      ? { ...firstText.style, highlight: null, strike: null, underline: null }
      : style;

  place(
    {
      baseline,
      height: markerStyle.sizePx,
      kind: "marker",
      marker,
      style: markerStyle,
      width: 0,
      x: r.left,
      y: baseline - markerStyle.ascentPx,
    },
    li,
  );
}

/**
 * Splits the measured column into pages `pageHeight` tall (CSS px).
 */
export function paginate(measured: Measured, pageHeight: number): Paginated {
  type Band = {
    bottom: number;
    break?: boolean;
    items: number[];
    offset: number;
    page: number;
    top: number;
  };
  const EPS = 0.5;
  const sorted = [...measured.atoms].sort((a, b) => a.top - b.top);
  const bands: Band[] = [];

  // Atoms that overlap vertically (words on one line, a row's cells) are
  // one band. Page breaks are bands of their own.
  const breakQueue = [...measured.breaks].sort((a, b) => a - b);

  for (const atom of sorted) {
    while (breakQueue.length && breakQueue[0] <= atom.top) {
      const y = breakQueue.shift()!;
      bands.push({
        bottom: y,
        break: true,
        items: [],
        offset: 0,
        page: 0,
        top: y,
      });
    }

    const last = bands[bands.length - 1];
    if (last && !last.break && atom.top < last.bottom - EPS) {
      last.bottom = Math.max(last.bottom, atom.bottom);
      last.items.push(...atom.items);
    } else {
      bands.push({
        bottom: atom.bottom,
        items: [...atom.items],
        offset: 0,
        page: 0,
        top: atom.top,
      });
    }
  }

  for (const y of breakQueue) {
    bands.push({
      bottom: y,
      break: true,
      items: [],
      offset: 0,
      page: 0,
      top: y,
    });
  }

  let page = 0;
  let offset = 0;
  let snap = false;
  let pageHasContent = false;
  const pageStarts: number[] = [];

  for (const band of bands) {
    if (band.break) {
      if (pageHasContent || page === 0) {
        page += 1;
        pageStarts.push(band.top);
        pageHasContent = false;
      }
      snap = true;
      band.offset = offset;
      band.page = page;
      continue;
    }

    const height = band.bottom - band.top;
    let y = band.top + offset;

    if (snap) {
      offset = page * pageHeight - band.top;
      y = page * pageHeight;
      snap = false;
    }

    const fits = y + height <= (page + 1) * pageHeight + EPS;
    const atTop = y - page * pageHeight < EPS;

    if (!fits && !atTop) {
      page += 1;
      pageStarts.push(band.top);
      offset = page * pageHeight - band.top;
    }

    band.offset = offset;
    band.page = page;
    pageHasContent = true;
  }

  const contentBands = bands.filter((band) => !band.break);
  const itemBand = new Map<number, Band>();
  for (const band of contentBands)
    for (const index of band.items) itemBand.set(index, band);

  const items: PagedItem[] = [];
  measured.items.forEach((item, index) => {
    const band = itemBand.get(index);
    const offsetY = band?.offset ?? 0;
    const flowY = item.y + offsetY;
    const itemPage = band?.page ?? Math.max(0, Math.floor(flowY / pageHeight));
    const shift = offsetY - itemPage * pageHeight;
    const moved = { ...item, page: itemPage, y: item.y + shift } as PagedItem;
    if (moved.kind === "text" || moved.kind === "marker")
      moved.baseline =
        item.kind === "text" || item.kind === "marker"
          ? item.baseline + shift
          : 0;
    items.push(moved);
  });

  // Where a y position lands: the offset of the band it belongs to.
  const offsetAt = (y: number, edge: "top" | "bottom") => {
    if (!contentBands.length) return { offset: 0 };
    if (edge === "top") {
      const band =
        contentBands.find((b) => b.bottom > y + EPS) ??
        contentBands[contentBands.length - 1];
      return { offset: band.offset };
    }
    let found = contentBands[0];
    for (const band of contentBands) {
      if (band.top < y - EPS) found = band;
      else break;
    }
    return { offset: found.offset };
  };

  const boxes: PagedBox[] = [];
  for (const box of measured.boxes) {
    const flowTop = box.top + offsetAt(box.top, "top").offset;
    const flowBottom = box.bottom + offsetAt(box.bottom, "bottom").offset;
    if (flowBottom <= flowTop) continue;
    const firstPage = Math.max(0, Math.floor((flowTop + EPS) / pageHeight));
    const lastPage = Math.max(
      firstPage,
      Math.floor((flowBottom - EPS) / pageHeight),
    );

    for (let p = firstPage; p <= lastPage; p += 1) {
      const top = Math.max(flowTop, p * pageHeight) - p * pageHeight;
      const bottom =
        Math.min(flowBottom, (p + 1) * pageHeight) - p * pageHeight;
      boxes.push({
        borders: {
          bottom: p === lastPage ? box.borders.bottom : undefined,
          left: box.borders.left,
          right: box.borders.right,
          top: p === firstPage ? box.borders.top : undefined,
        },
        fill: box.fill,
        height: bottom - top,
        page: p,
        width: box.right - box.left,
        x: box.left,
        y: top,
      });
    }
  }

  const lastPage = Math.max(
    page,
    ...items.map((item) => item.page),
    ...boxes.map((box) => box.page),
  );

  return { boxes, items, pageCount: lastPage + 1, pageStarts };
}
