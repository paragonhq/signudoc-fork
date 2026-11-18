// Reads a Word document (.docx) into composer HTML. Written here rather
// than pulled in: a .docx is a ZIP of XML (see zip.ts), and the parts that
// matter for a document someone signs are few.
//
// Kept: paragraphs and the heading/title styles, bold, italic, underline,
// strikethrough, super/subscript, text colour, highlight and shading, font
// and size, alignment, indents, spacing, bulleted and numbered lists
// (nested), tables (merged cells, shading, borderless layout tables),
// pictures, links, line and page breaks, page size and margins.
//
// Not kept: headers and footers, footnotes, comments, text boxes and
// shapes, tracked deletions (insertions are kept as plain text), columns,
// and EMF/WMF pictures.

import { DEFAULT_FONT, DEFAULT_FONT_SIZE_PT, matchFont } from "./fonts.ts";
import { matchPageSize, type PageSetup } from "./page.ts";
import { escapeHtml } from "./sanitize.ts";
import { readZip, readZipText, type ZipEntries } from "./zip.ts";

export type ImportedDocument = {
  html: string;
  page?: PageSetup;
  /** Things that could not be brought across, said once each. */
  notes: string[];
  title?: string;
};

type RunProps = {
  bold?: boolean;
  caps?: boolean;
  color?: string;
  font?: string;
  highlight?: string;
  italic?: boolean;
  sizePt?: number;
  strike?: boolean;
  underline?: boolean;
  vertAlign?: "sub" | "super";
};

type ParaProps = {
  align?: "center" | "justify" | "right";
  firstLinePt?: number;
  ilvl?: number;
  indentPt?: number;
  lineHeight?: number;
  lineExactPt?: number;
  numId?: string;
  pageBreakBefore?: boolean;
  spaceAfterPt?: number;
  spaceBeforePt?: number;
  styleId?: string;
};

type Style = {
  basedOn?: string;
  name: string;
  pPr?: Element;
  rPr?: Element;
  type: string;
};

type ListLevel = { format: string; start: number };

type Context = {
  defaultsP: ParaProps;
  defaultsR: RunProps;
  entries: ZipEntries;
  images: Map<string, Promise<string | null>>;
  notes: Set<string>;
  numbering: Map<string, Map<number, ListLevel>>;
  rels: Map<string, { mode?: string; target: string; type: string }>;
  styles: Map<string, Style>;
  theme: { major?: string; minor?: string };
};

const HIGHLIGHTS: Record<string, string> = {
  black: "#000000",
  blue: "#0000ff",
  cyan: "#00ffff",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGray: "#808080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  green: "#00ff00",
  lightGray: "#c0c0c0",
  magenta: "#ff00ff",
  red: "#ff0000",
  white: "#ffffff",
  yellow: "#ffff00",
};

const PAGE_BREAK = "\u0000PAGE\u0000";

function kids(element: Element | null | undefined, name: string) {
  if (!element) return [];

  return Array.from(element.children).filter(
    (child) => child.localName === name,
  );
}

function kid(element: Element | null | undefined, name: string) {
  return kids(element, name)[0] ?? null;
}

function attr(element: Element | null | undefined, name: string) {
  if (!element) return null;

  return (
    element.getAttribute(`w:${name}`) ?? element.getAttribute(name) ?? null
  );
}

function onOff(element: Element | null) {
  if (!element) return undefined;
  const value = attr(element, "val");

  return value === null || !/^(0|false|off|none)$/i.test(value);
}

function twipsToPt(value: string | null) {
  if (value === null) return undefined;
  const n = Number.parseInt(value, 10);

  return Number.isFinite(n) ? n / 20 : undefined;
}

function readRunProps(rPr: Element | null, into: RunProps, ctx: Context) {
  if (!rPr) return into;
  const bold = onOff(kid(rPr, "b"));
  const italic = onOff(kid(rPr, "i"));
  const strike = onOff(kid(rPr, "strike")) || onOff(kid(rPr, "dstrike"));
  const caps = onOff(kid(rPr, "caps"));
  const u = kid(rPr, "u");
  const color = attr(kid(rPr, "color"), "val");
  const highlight = attr(kid(rPr, "highlight"), "val");
  const shading = attr(kid(rPr, "shd"), "fill");
  const size = attr(kid(rPr, "sz"), "val");
  const fonts = kid(rPr, "rFonts");
  const vert = attr(kid(rPr, "vertAlign"), "val");

  if (bold !== undefined) into.bold = bold;
  if (italic !== undefined) into.italic = italic;
  if (strike !== undefined) into.strike = strike;
  if (caps !== undefined) into.caps = caps;
  if (u) into.underline = (attr(u, "val") ?? "single") !== "none";
  if (color) into.color = color === "auto" ? undefined : `#${color}`;
  if (highlight) into.highlight = HIGHLIGHTS[highlight];
  else if (shading && shading !== "auto" && /^[0-9a-f]{6}$/i.test(shading)) {
    into.highlight = `#${shading}`;
  }
  if (size) into.sizePt = Number.parseInt(size, 10) / 2;
  if (fonts) {
    const theme = attr(fonts, "asciiTheme");
    const name =
      attr(fonts, "ascii") ??
      attr(fonts, "hAnsi") ??
      (theme
        ? theme.startsWith("major")
          ? ctx.theme.major
          : ctx.theme.minor
        : null);
    if (name) into.font = name;
  }
  if (vert === "superscript") into.vertAlign = "super";
  else if (vert === "subscript") into.vertAlign = "sub";
  else if (vert === "baseline") into.vertAlign = undefined;

  return into;
}

function readParaProps(pPr: Element | null, into: ParaProps) {
  if (!pPr) return into;
  const style = attr(kid(pPr, "pStyle"), "val");
  const jc = attr(kid(pPr, "jc"), "val");
  const ind = kid(pPr, "ind");
  const spacing = kid(pPr, "spacing");
  const numPr = kid(pPr, "numPr");

  if (style) into.styleId = style;
  if (jc) {
    into.align =
      jc === "center"
        ? "center"
        : jc === "right" || jc === "end"
          ? "right"
          : jc === "both" || jc === "distribute"
            ? "justify"
            : undefined;
  }
  if (ind) {
    const left = twipsToPt(attr(ind, "left") ?? attr(ind, "start"));
    const first = twipsToPt(attr(ind, "firstLine"));
    const hanging = twipsToPt(attr(ind, "hanging"));
    if (left !== undefined) into.indentPt = left;
    if (first !== undefined) into.firstLinePt = first;
    if (hanging !== undefined) into.firstLinePt = -hanging;
  }
  if (spacing) {
    const before = twipsToPt(attr(spacing, "before"));
    const after = twipsToPt(attr(spacing, "after"));
    const line = attr(spacing, "line");
    const rule = attr(spacing, "lineRule") ?? "auto";
    if (before !== undefined) into.spaceBeforePt = before;
    if (after !== undefined) into.spaceAfterPt = after;
    if (line) {
      const n = Number.parseInt(line, 10);
      if (rule === "auto") {
        into.lineHeight = n / 240;
        into.lineExactPt = undefined;
      } else {
        into.lineExactPt = n / 20;
        into.lineHeight = undefined;
      }
    }
  }
  if (numPr) {
    const numId = attr(kid(numPr, "numId"), "val");
    const ilvl = attr(kid(numPr, "ilvl"), "val");
    if (numId !== null) into.numId = numId;
    if (ilvl !== null) into.ilvl = Number.parseInt(ilvl, 10) || 0;
  }
  if (onOff(kid(pPr, "pageBreakBefore"))) into.pageBreakBefore = true;

  return into;
}

function styleChain(ctx: Context, id: string | undefined) {
  const chain: Style[] = [];
  const seen = new Set<string>();
  let current = id;

  while (current && !seen.has(current)) {
    seen.add(current);
    const style = ctx.styles.get(current);
    if (!style) break;
    chain.unshift(style);
    current = style.basedOn;
  }

  return chain;
}

function resolveParagraph(ctx: Context, pPr: Element | null) {
  const direct = readParaProps(pPr, {});
  const props: ParaProps = { ...ctx.defaultsP };
  const runs: RunProps = { ...ctx.defaultsR };

  for (const style of styleChain(ctx, direct.styleId ?? "Normal")) {
    readParaProps(style.pPr ?? null, props);
    readRunProps(style.rPr ?? null, runs, ctx);
  }

  Object.assign(props, direct);
  // A paragraph's own run marks (pPr/rPr) style only its pilcrow.
  return { props, runs };
}

function headingTag(ctx: Context, styleId: string | undefined) {
  for (const style of styleChain(ctx, styleId).reverse()) {
    const name = style.name.toLowerCase();
    const heading = /^heading\s*(\d)$/.exec(name);
    if (heading) return `h${Math.min(6, Number(heading[1]))}`;
    if (name === "title") return "title";
    if (name === "subtitle") return "subtitle";
  }

  const id = (styleId ?? "").toLowerCase();
  const heading = /^heading(\d)$/.exec(id);
  if (heading) return `h${Math.min(6, Number(heading[1]))}`;
  if (id === "title" || id === "subtitle") return id;

  return null;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary);
}

const IMAGE_TYPES: Record<string, string> = {
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function imageFor(ctx: Context, relId: string) {
  let pending = ctx.images.get(relId);

  if (!pending) {
    pending = (async () => {
      const rel = ctx.rels.get(relId);
      if (!rel || rel.mode === "External") return null;
      const path = rel.target.startsWith("/")
        ? rel.target.slice(1)
        : `word/${rel.target}`.replace(/\/[^/]+\/\.\.\//g, "/");
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      const type = IMAGE_TYPES[ext];
      const read = ctx.entries.get(path);
      if (!type || !read) {
        ctx.notes.add(
          "Some pictures use a format that can't be shown and were left out.",
        );
        return null;
      }
      return `data:${type};base64,${bytesToBase64(await read())}`;
    })();
    ctx.images.set(relId, pending);
  }

  return pending;
}

function runStyle(props: RunProps, base: RunProps, heading: boolean) {
  const styles: string[] = [];
  const font = props.font ? matchFont(props.font) : null;
  const baseFont = base.font ? matchFont(base.font) : null;

  if (font && font !== DEFAULT_FONT && (!heading || font !== baseFont)) {
    styles.push(`font-family: '${font.family}'`);
  }

  if (
    props.sizePt &&
    (heading
      ? props.sizePt !== base.sizePt
      : props.sizePt !== DEFAULT_FONT_SIZE_PT)
  ) {
    styles.push(`font-size: ${props.sizePt}pt`);
  }

  if (props.color && !/^#0{6}$/.test(props.color)) {
    styles.push(`color: ${props.color}`);
  }

  if (props.highlight && props.highlight !== "#ffffff") {
    styles.push(`background-color: ${props.highlight}`);
  }

  return styles.join("; ");
}

function wrapRun(
  text: string,
  props: RunProps,
  base: RunProps,
  heading: boolean,
) {
  let html = text;
  const style = runStyle(props, base, heading);

  if (props.vertAlign === "super") html = `<sup>${html}</sup>`;
  if (props.vertAlign === "sub") html = `<sub>${html}</sub>`;
  if (props.strike) html = `<s>${html}</s>`;
  if (props.underline && !(heading && base.underline)) html = `<u>${html}</u>`;
  if (props.italic && !(heading && base.italic)) html = `<em>${html}</em>`;
  if (props.bold && !heading) html = `<strong>${html}</strong>`;
  if (heading && props.bold === false && base.bold) {
    html = `<span style="font-weight: 400">${html}</span>`;
  }
  if (style) html = `<span style="${style}">${html}</span>`;

  return html;
}

async function convertRun(
  run: Element,
  ctx: Context,
  base: RunProps,
  heading: boolean,
): Promise<string> {
  const props = { ...base };
  const runStyleId = attr(kid(kid(run, "rPr"), "rStyle"), "val");

  for (const style of styleChain(ctx, runStyleId ?? undefined)) {
    readRunProps(style.rPr ?? null, props, ctx);
  }

  readRunProps(kid(run, "rPr"), props, ctx);

  let out = "";
  let text = "";
  const flush = () => {
    if (text) {
      out += wrapRun(
        escapeHtml(props.caps ? text.toUpperCase() : text),
        props,
        base,
        heading,
      );
      text = "";
    }
  };

  for (const child of Array.from(run.children)) {
    switch (child.localName) {
      case "t":
        text += child.textContent ?? "";
        break;
      case "tab":
        text += "\t";
        break;
      case "noBreakHyphen":
        text += "-";
        break;
      case "br":
      case "cr":
        flush();
        out += attr(child, "type") === "page" ? PAGE_BREAK : "<br>";
        break;
      case "lastRenderedPageBreak":
        break;
      case "drawing":
      case "pict":
      case "AlternateContent":
      case "object": {
        flush();
        const blip =
          child.getElementsByTagName("a:blip")[0] ??
          child.getElementsByTagName("v:imagedata")[0];
        const relId =
          blip?.getAttribute("r:embed") ?? blip?.getAttribute("r:id") ?? null;

        if (relId) {
          const src = await imageFor(ctx, relId);
          if (src) {
            const extent = child.getElementsByTagName("wp:extent")[0];
            const cx = Number.parseInt(extent?.getAttribute("cx") ?? "", 10);
            const width = cx > 0 ? Math.round(cx / 12700) : null;
            out += `<img src="${src}"${width ? ` style="width: ${width}pt"` : ""}>`;
          }
        } else if (child.getElementsByTagName("w:txbxContent").length) {
          ctx.notes.add("Text boxes were left out.");
        }
        break;
      }
    }
  }

  flush();

  return out;
}

async function convertInline(
  container: Element,
  ctx: Context,
  base: RunProps,
  heading: boolean,
): Promise<string> {
  let out = "";

  for (const child of Array.from(container.children)) {
    switch (child.localName) {
      case "r":
        out += await convertRun(child, ctx, base, heading);
        break;
      case "hyperlink": {
        const relId = child.getAttribute("r:id");
        const target = relId ? ctx.rels.get(relId)?.target : undefined;
        const inner = await convertInline(child, ctx, base, heading);
        out +=
          target && /^(https?:|mailto:|tel:)/i.test(target)
            ? `<a href="${escapeHtml(target)}">${inner}</a>`
            : inner;
        break;
      }
      case "del":
      case "moveFrom":
      case "pPr":
      case "commentRangeStart":
      case "commentRangeEnd":
      case "bookmarkStart":
      case "bookmarkEnd":
      case "proofErr":
        break;
      case "sdt":
        out += await convertInline(
          kid(child, "sdtContent") ?? child,
          ctx,
          base,
          heading,
        );
        break;
      default:
        // ins, smartTag, fldSimple, customXml, moveTo …: their runs count.
        out += await convertInline(child, ctx, base, heading);
    }
  }

  return out;
}

function paragraphStyle(props: ParaProps, inList: boolean) {
  const styles: string[] = [];

  if (props.align) styles.push(`text-align: ${props.align}`);
  if (!inList && props.indentPt && props.indentPt > 0) {
    styles.push(`margin-left: ${props.indentPt}pt`);
  }
  if (!inList && props.firstLinePt)
    styles.push(`text-indent: ${props.firstLinePt}pt`);
  if (props.spaceBeforePt) styles.push(`margin-top: ${props.spaceBeforePt}pt`);
  if (props.spaceAfterPt && !inList)
    styles.push(`margin-bottom: ${props.spaceAfterPt}pt`);
  if (props.lineHeight && Math.abs(props.lineHeight - 1.15) > 0.04) {
    styles.push(`line-height: ${Math.round(props.lineHeight * 100) / 100}`);
  }

  return styles.join("; ");
}

type Block =
  | { kind: "html"; html: string }
  | {
      kind: "list";
      html: string;
      level: number;
      ordered: boolean;
      listStyle?: string;
      start: number;
      key: string;
    };

function listInfo(ctx: Context, numId: string, level: number) {
  const levels = ctx.numbering.get(numId);
  const info = levels?.get(level) ??
    levels?.get(0) ?? { format: "bullet", start: 1 };
  const ordered = info.format !== "bullet" && info.format !== "none";
  const listStyle: Record<string, string> = {
    decimal: "decimal",
    lowerLetter: "lower-alpha",
    lowerRoman: "lower-roman",
    upperLetter: "upper-alpha",
    upperRoman: "upper-roman",
  };

  return { listStyle: listStyle[info.format], ordered, start: info.start };
}

async function convertParagraph(p: Element, ctx: Context): Promise<Block[]> {
  const { props, runs } = resolveParagraph(ctx, kid(p, "pPr"));
  const tag = headingTag(ctx, props.styleId);
  const heading = tag !== null;
  const inner = await convertInline(p, ctx, runs, heading);
  const inList = !!props.numId && props.numId !== "0";
  const style = paragraphStyle(props, inList);
  const blocks: Block[] = [];

  if (props.pageBreakBefore) {
    blocks.push({ kind: "html", html: "<hr data-page-break>" });
  }

  const pieces = inner.split(PAGE_BREAK);

  pieces.forEach((piece, index) => {
    if (index > 0) {
      blocks.push({ kind: "html", html: "<hr data-page-break>" });
    }

    // A paragraph that only holds a page break leaves no empty line.
    if (!piece && pieces.length > 1) return;

    const content = piece || "<br>";

    if (inList) {
      const level = props.ilvl ?? 0;
      const info = listInfo(ctx, props.numId!, level);
      blocks.push({
        html: `<li${style ? ` style="${style}"` : ""}>${content}`,
        key: props.numId!,
        kind: "list",
        level,
        ...info,
      });
      return;
    }

    const open =
      tag === "title"
        ? `<p data-style="title"${style ? ` style="${style}"` : ""}>`
        : tag === "subtitle"
          ? `<p data-style="subtitle"${style ? ` style="${style}"` : ""}>`
          : `<${tag ?? "p"}${style ? ` style="${style}"` : ""}>`;
    const close = tag && tag.startsWith("h") ? `</${tag}>` : "</p>";

    blocks.push({ kind: "html", html: `${open}${content}${close}` });
  });

  return blocks;
}

function vMergeOf(tc: Element) {
  const vMerge = kid(kid(tc, "tcPr"), "vMerge");

  return vMerge ? (attr(vMerge, "val") ?? "continue") : null;
}

function gridSpanOf(tc: Element) {
  return (
    Number.parseInt(attr(kid(kid(tc, "tcPr"), "gridSpan"), "val") ?? "1", 10) ||
    1
  );
}

/** Rowspan of each cell that starts a vertical merge, keyed "row_column". */
function countRowspans(rows: Element[]) {
  const spans = new Map<string, number>();
  const open: Array<string | undefined> = [];

  rows.forEach((row, rowIndex) => {
    let column = 0;

    for (const tc of kids(row, "tc")) {
      const span = gridSpanOf(tc);
      const merge = vMergeOf(tc);

      if (merge === "continue") {
        const key = open[column];
        if (key) spans.set(key, (spans.get(key) ?? 1) + 1);
      } else {
        const key = `${rowIndex}_${column}`;
        open[column] = merge === "restart" ? key : undefined;
        if (merge === "restart") spans.set(key, 1);
      }

      column += span;
    }
  });

  return spans;
}

async function convertTable(table: Element, ctx: Context): Promise<string> {
  const tblPr = kid(table, "tblPr");
  const styleId = attr(kid(tblPr, "tblStyle"), "val") ?? "";
  const borders = kid(tblPr, "tblBorders");
  const hasBorders =
    /grid/i.test(styleId) ||
    (!!borders &&
      Array.from(borders.children).some(
        (side) => !/^(none|nil)$/.test(attr(side, "val") ?? "none"),
      ));
  const rows = kids(table, "tr");
  const rowspans = countRowspans(rows);
  let html = "";

  for (const [rowIndex, row] of rows.entries()) {
    const header = onOff(kid(kid(row, "trPr"), "tblHeader")) === true;
    let column = 0;
    html += "<tr>";

    for (const tc of kids(row, "tc")) {
      const span = gridSpanOf(tc);
      const merge = vMergeOf(tc);

      if (merge === "continue") {
        column += span;
        continue;
      }

      const tcPr = kid(tc, "tcPr");
      const fill = attr(kid(tcPr, "shd"), "fill");
      const width = kid(tcPr, "tcW");
      const widthPt =
        attr(width, "type") === "dxa" ? twipsToPt(attr(width, "w")) : undefined;
      const vAlign = attr(kid(tcPr, "vAlign"), "val");
      const styles: string[] = [];

      if (
        fill &&
        /^[0-9a-f]{6}$/i.test(fill) &&
        fill.toLowerCase() !== "ffffff"
      ) {
        styles.push(`background-color: #${fill}`);
      }
      if (widthPt) styles.push(`width: ${Math.round(widthPt)}pt`);
      if (vAlign === "center" || vAlign === "bottom") {
        styles.push(
          `vertical-align: ${vAlign === "center" ? "middle" : "bottom"}`,
        );
      }

      const rowspan = rowspans.get(`${rowIndex}_${column}`) ?? 1;
      const content = (await convertBody(tc, ctx)) || "<p><br></p>";
      const cellTag = header ? "th" : "td";

      html += `<${cellTag}${span > 1 ? ` colspan="${span}"` : ""}${rowspan > 1 ? ` rowspan="${rowspan}"` : ""}${styles.length ? ` style="${styles.join("; ")}"` : ""}>${content}</${cellTag}>`;
      column += span;
    }

    html += "</tr>";
  }

  return `<table${hasBorders ? "" : ' data-borders="none"'}><tbody>${html}</tbody></table>`;
}

/**
 * Turns the flat run of list paragraphs Word stores into nested lists.
 * Every list on the stack keeps its last item open, so a deeper level
 * nests inside it.
 */
function buildLists(blocks: Block[]) {
  let out = "";
  const stack: Array<{ key: string; tag: "ol" | "ul" }> = [];
  // Word keeps counting a numbered list across paragraphs in between.
  const counters = new Map<string, number>();
  const closeTo = (depth: number) => {
    while (stack.length > depth) {
      out += `</li></${stack.pop()!.tag}>`;
    }
  };

  for (const block of blocks) {
    if (block.kind === "html") {
      closeTo(0);
      out += block.html;
      continue;
    }

    const tag = block.ordered ? "ol" : "ul";
    const depth = Math.min(block.level, 8) + 1;

    closeTo(depth);

    if (stack.length === depth) {
      const top = stack[depth - 1];

      if (top.tag !== tag || top.key !== block.key) {
        closeTo(depth - 1);
      } else {
        out += "</li>";
      }
    }

    while (stack.length < depth - 1) {
      out += "<ul><li>";
      stack.push({ key: block.key, tag: "ul" });
    }

    const counterKey = `${block.key}:${depth}`;

    if (stack.length < depth) {
      const start = block.start + (counters.get(counterKey) ?? 0);
      const attrs = block.ordered
        ? `${start > 1 ? ` start="${start}"` : ""}${block.listStyle ? ` style="list-style-type: ${block.listStyle}"` : ""}`
        : "";
      out += `<${tag}${attrs}>`;
      stack.push({ key: block.key, tag });
    }

    counters.set(counterKey, (counters.get(counterKey) ?? 0) + 1);
    for (const key of counters.keys()) {
      const [listKey, level] = key.split(":");
      if (listKey === block.key && Number(level) > depth) counters.delete(key);
    }

    out += block.html;
  }

  closeTo(0);

  return out;
}

async function convertBody(container: Element, ctx: Context): Promise<string> {
  const blocks: Block[] = [];

  for (const child of Array.from(container.children)) {
    switch (child.localName) {
      case "p":
        blocks.push(...(await convertParagraph(child, ctx)));
        break;
      case "tbl":
        blocks.push({ kind: "html", html: await convertTable(child, ctx) });
        break;
      case "sdt": {
        const content = kid(child, "sdtContent");
        if (content)
          blocks.push({ kind: "html", html: await convertBody(content, ctx) });
        break;
      }
      case "customXml":
        blocks.push({ kind: "html", html: await convertBody(child, ctx) });
        break;
    }
  }

  return buildLists(blocks);
}

function parseXml(text: string | null) {
  if (!text) return null;
  const doc = new DOMParser().parseFromString(text, "application/xml");

  return doc.getElementsByTagName("parsererror").length ? null : doc;
}

export async function docxToHtml(
  buffer: ArrayBuffer,
): Promise<ImportedDocument> {
  const entries = readZip(buffer);
  const documentXml = parseXml(await readZipText(entries, "word/document.xml"));

  if (!documentXml) {
    throw new Error("This doesn't look like a Word document (.docx).");
  }

  const stylesXml = parseXml(await readZipText(entries, "word/styles.xml"));
  const numberingXml = parseXml(
    await readZipText(entries, "word/numbering.xml"),
  );
  const relsXml = parseXml(
    await readZipText(entries, "word/_rels/document.xml.rels"),
  );
  const themeXml = parseXml(
    await readZipText(entries, "word/theme/theme1.xml"),
  );
  const coreXml = parseXml(await readZipText(entries, "docProps/core.xml"));

  const ctx: Context = {
    defaultsP: {},
    defaultsR: {},
    entries,
    images: new Map(),
    notes: new Set(),
    numbering: new Map(),
    rels: new Map(),
    styles: new Map(),
    theme: {},
  };

  if (themeXml) {
    const major = themeXml.getElementsByTagName("a:majorFont")[0];
    const minor = themeXml.getElementsByTagName("a:minorFont")[0];
    ctx.theme.major =
      major?.getElementsByTagName("a:latin")[0]?.getAttribute("typeface") ??
      undefined;
    ctx.theme.minor =
      minor?.getElementsByTagName("a:latin")[0]?.getAttribute("typeface") ??
      undefined;
  }

  if (relsXml) {
    for (const rel of Array.from(
      relsXml.getElementsByTagName("Relationship"),
    )) {
      ctx.rels.set(rel.getAttribute("Id") ?? "", {
        mode: rel.getAttribute("TargetMode") ?? undefined,
        target: rel.getAttribute("Target") ?? "",
        type: rel.getAttribute("Type") ?? "",
      });
    }
  }

  if (stylesXml) {
    const root = stylesXml.documentElement;
    const defaults = kid(root, "docDefaults");
    readRunProps(kid(kid(defaults, "rPrDefault"), "rPr"), ctx.defaultsR, ctx);
    readParaProps(kid(kid(defaults, "pPrDefault"), "pPr"), ctx.defaultsP);

    for (const style of kids(root, "style")) {
      const id = attr(style, "styleId");
      if (!id) continue;
      ctx.styles.set(id, {
        basedOn: attr(kid(style, "basedOn"), "val") ?? undefined,
        name: attr(kid(style, "name"), "val") ?? id,
        pPr: kid(style, "pPr") ?? undefined,
        rPr: kid(style, "rPr") ?? undefined,
        type: attr(style, "type") ?? "paragraph",
      });
    }
  }

  if (numberingXml) {
    const root = numberingXml.documentElement;
    const abstracts = new Map<string, Map<number, ListLevel>>();

    for (const abstract of kids(root, "abstractNum")) {
      const levels = new Map<number, ListLevel>();
      for (const lvl of kids(abstract, "lvl")) {
        levels.set(Number.parseInt(attr(lvl, "ilvl") ?? "0", 10), {
          format: attr(kid(lvl, "numFmt"), "val") ?? "bullet",
          start:
            Number.parseInt(attr(kid(lvl, "start"), "val") ?? "1", 10) || 1,
        });
      }
      abstracts.set(attr(abstract, "abstractNumId") ?? "", levels);
    }

    for (const num of kids(root, "num")) {
      const abstractId = attr(kid(num, "abstractNumId"), "val") ?? "";
      const levels = abstracts.get(abstractId);
      if (levels) ctx.numbering.set(attr(num, "numId") ?? "", levels);
    }
  }

  const body = kid(documentXml.documentElement, "body");
  const html = body ? await convertBody(body, ctx) : "";
  let page: PageSetup | undefined;
  const sectPr = kid(body, "sectPr");

  if (sectPr) {
    const size = kid(sectPr, "pgSz");
    const margins = kid(sectPr, "pgMar");
    const width = twipsToPt(attr(size, "w"));
    const height = twipsToPt(attr(size, "h"));

    if (width && height) {
      const matched = matchPageSize(width, height);
      const clamp = (value: number | undefined, fallback: number) =>
        Math.max(0, Math.min(288, value ?? fallback));

      page = {
        ...matched,
        margins: {
          bottom: clamp(twipsToPt(attr(margins, "bottom")), 72),
          left: clamp(twipsToPt(attr(margins, "left")), 72),
          right: clamp(twipsToPt(attr(margins, "right")), 72),
          top: clamp(twipsToPt(attr(margins, "top")), 72),
        },
      };
    }

    if (
      kids(sectPr, "headerReference").length ||
      kids(sectPr, "footerReference").length
    ) {
      ctx.notes.add("Headers and footers were left out.");
    }
  }

  if (
    entries.has("word/footnotes.xml") &&
    documentXml.getElementsByTagName("w:footnoteReference").length
  ) {
    ctx.notes.add("Footnotes were left out.");
  }

  const title =
    coreXml?.getElementsByTagName("dc:title")[0]?.textContent?.trim() ||
    undefined;

  return { html, notes: [...ctx.notes], page, title };
}
