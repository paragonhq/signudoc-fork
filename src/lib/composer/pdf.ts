// Writes a composed document as a PDF, in the browser.
//
// The document is laid out once more, off screen, at the exact page width
// with the same stylesheet and fonts as the editor. layout.ts reads where
// everything landed and splits it into pages; this draws it with pdf-lib:
// real, selectable text in embedded fonts (or the built-in Helvetica,
// Times and Courier), pictures, table borders and shading, list markers,
// checkboxes, underlines, highlights. The result goes through the same
// upload and field placement as any PDF.

import {
  buildFontFaceCss,
  FALLBACK_FONT,
  fontFileUrl,
  type ComposerFont,
  type FontFace,
} from "./fonts.ts";
import { DOC_CSS } from "./doc-styles.ts";
import {
  measureDocument,
  paginate,
  type PagedBox,
  type PagedItem,
  type Rgba,
  type TextStyle,
} from "./layout.ts";
import { pageDimensions, type PageSetup } from "./page.ts";

type PdfLib = typeof import("pdf-lib");
type PDFDocument = import("pdf-lib").PDFDocument;
type PDFFont = import("pdf-lib").PDFFont;
type PDFImage = import("pdf-lib").PDFImage;
type PDFPage = import("pdf-lib").PDFPage;

const PX_TO_PT = 0.75;
const STYLE_ELEMENT_ID = "composer-doc-styles";

/** Puts the document stylesheet and @font-face rules on the page once. */
export function ensureComposerStyles() {
  if (
    typeof document === "undefined" ||
    document.getElementById(STYLE_ELEMENT_ID)
  )
    return;
  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = `${buildFontFaceCss()}\n${DOC_CSS}`;
  document.head.appendChild(style);
}

function decodeDataUrl(src: string) {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(src);
  if (!match) return null;
  const type = match[1].toLowerCase();
  if (match[2]) {
    const binary = atob(match[3]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, type };
  }
  return {
    bytes: new TextEncoder().encode(decodeURIComponent(match[3])),
    type,
  };
}

async function readImage(src: string) {
  if (src.startsWith("data:")) return decodeDataUrl(src);
  if (src.startsWith("blob:")) {
    const response = await fetch(src);
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      type: response.headers.get("content-type") ?? "",
    };
  }
  return null;
}

/** Re-encodes a picture the PDF can't take as is (GIF, WebP, BMP, huge). */
async function reencode(
  src: string,
): Promise<{ bytes: Uint8Array; type: "png" | "jpeg" } | null> {
  const image = new Image();
  image.src = src;
  await image.decode();
  const maxSide = 2400;
  const scale = Math.min(
    1,
    maxSide / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  return blob
    ? { bytes: new Uint8Array(await blob.arrayBuffer()), type: "png" }
    : null;
}

class FontBook {
  private cache = new Map<
    string,
    Promise<{ font: PDFFont; chars: Set<number> }>
  >();

  constructor(
    private pdf: PDFDocument,
    private lib: PdfLib,
  ) {}

  get(font: ComposerFont, face: FontFace) {
    const key = `${font.family}:${face}`;
    let entry = this.cache.get(key);

    if (!entry) {
      entry = (async () => {
        let embedded: PDFFont;

        if (font.standard) {
          const names = {
            Courier: {
              bold: "CourierBold",
              bolditalic: "CourierBoldOblique",
              italic: "CourierOblique",
              regular: "Courier",
            },
            Helvetica: {
              bold: "HelveticaBold",
              bolditalic: "HelveticaBoldOblique",
              italic: "HelveticaOblique",
              regular: "Helvetica",
            },
            Times: {
              bold: "TimesRomanBold",
              bolditalic: "TimesRomanBoldItalic",
              italic: "TimesRomanItalic",
              regular: "TimesRoman",
            },
          } as const;
          embedded = await this.pdf.embedFont(
            this.lib.StandardFonts[names[font.standard][face]],
          );
        } else {
          const response = await fetch(fontFileUrl(font, face));
          if (!response.ok)
            throw new Error(`Font ${font.family} ${face} is missing.`);
          embedded = await this.pdf.embedFont(
            new Uint8Array(await response.arrayBuffer()),
            { subset: false },
          );
        }

        return { chars: new Set(embedded.getCharacterSet()), font: embedded };
      })();
      this.cache.set(key, entry);
    }

    return entry;
  }
}

function toRgb(lib: PdfLib, color: Rgba) {
  return lib.rgb(color.r, color.g, color.b);
}

/** Splits text into runs the main font can draw and runs it can't. */
function splitRuns(text: string, chars: Set<number>) {
  const runs: Array<{ supported: boolean; text: string }> = [];

  for (const char of text) {
    const supported = chars.has(char.codePointAt(0)!);
    const last = runs[runs.length - 1];
    if (last && last.supported === supported) last.text += char;
    else runs.push({ supported, text: char });
  }

  return runs;
}

type DrawContext = {
  fonts: FontBook;
  images: Map<string, Promise<PDFImage | null>>;
  lib: PdfLib;
  marginLeft: number;
  marginTop: number;
  page: PDFPage;
  pageHeight: number;
  pdf: PDFDocument;
};

const X = (ctx: DrawContext, px: number) => ctx.marginLeft + px * PX_TO_PT;
const Y = (ctx: DrawContext, px: number) =>
  ctx.pageHeight - ctx.marginTop - px * PX_TO_PT;

async function drawString(
  ctx: DrawContext,
  text: string,
  xPx: number,
  baselinePx: number,
  style: TextStyle,
) {
  const size = style.sizePx * PX_TO_PT;
  const main = await ctx.fonts.get(style.font, style.face);
  let x = X(ctx, xPx);
  const y = Y(ctx, baselinePx);
  const skew = style.synthItalic ? ctx.lib.degrees(12) : undefined;
  const color = toRgb(ctx.lib, style.color);
  const opacity = style.color.a;

  for (const run of splitRuns(text, main.chars)) {
    let font = main.font;
    let value = run.text;

    if (!run.supported) {
      const fallback = await ctx.fonts.get(
        FALLBACK_FONT,
        style.face === "regular" || style.face === "bold"
          ? style.face
          : style.face === "bolditalic"
            ? "bolditalic"
            : "italic",
      );
      font = fallback.font;
      value = [...run.text]
        .map((char) => (fallback.chars.has(char.codePointAt(0)!) ? char : "?"))
        .join("");
    }

    ctx.page.drawText(value, { color, font, opacity, size, x, xSkew: skew, y });
    x += font.widthOfTextAtSize(value, size);
  }
}

async function drawItem(ctx: DrawContext, item: PagedItem) {
  const { lib, page } = ctx;

  switch (item.kind) {
    case "fill":
      page.drawRectangle({
        color: toRgb(lib, item.color),
        height: item.height * PX_TO_PT,
        opacity: item.color.a,
        width: item.width * PX_TO_PT,
        x: X(ctx, item.x),
        y: Y(ctx, item.y + item.height),
      });
      return;

    case "image": {
      let pending = ctx.images.get(item.src);
      if (!pending) {
        pending = (async () => {
          try {
            const read = await readImage(item.src);
            if (read && read.bytes.length < 4 * 1024 * 1024) {
              if (/png/.test(read.type))
                return await ctx.pdf.embedPng(read.bytes);
              if (/jpe?g/.test(read.type))
                return await ctx.pdf.embedJpg(read.bytes);
            }
            const converted = await reencode(item.src);
            return converted ? await ctx.pdf.embedPng(converted.bytes) : null;
          } catch (error) {
            console.error("A picture could not be added to the PDF.", error);
            return null;
          }
        })();
        ctx.images.set(item.src, pending);
      }
      const image = await pending;
      if (image) {
        page.drawImage(image, {
          height: item.height * PX_TO_PT,
          width: item.width * PX_TO_PT,
          x: X(ctx, item.x),
          y: Y(ctx, item.y + item.height),
        });
      }
      return;
    }

    case "checkbox": {
      const size = item.size * PX_TO_PT;
      const x = X(ctx, item.x);
      const y = Y(ctx, item.y + item.size);
      const dark = lib.rgb(0x1f / 255, 0x1f / 255, 0x1f / 255);
      page.drawRectangle({
        borderColor: item.checked
          ? dark
          : lib.rgb(0x5f / 255, 0x63 / 255, 0x68 / 255),
        borderWidth: 1,
        color: item.checked ? dark : lib.rgb(1, 1, 1),
        height: size,
        width: size,
        x,
        y,
      });
      if (item.checked) {
        const white = lib.rgb(1, 1, 1);
        page.drawLine({
          color: white,
          end: { x: x + size * 0.42, y: y + size * 0.25 },
          lineCap: lib.LineCapStyle.Round,
          start: { x: x + size * 0.2, y: y + size * 0.5 },
          thickness: size * 0.14,
        });
        page.drawLine({
          color: white,
          end: { x: x + size * 0.8, y: y + size * 0.75 },
          lineCap: lib.LineCapStyle.Round,
          start: { x: x + size * 0.42, y: y + size * 0.25 },
          thickness: size * 0.14,
        });
      }
      return;
    }

    case "marker": {
      const style = item.style;
      const color = toRgb(lib, style.color);
      const sizePt = style.sizePx * PX_TO_PT;
      const gapPx = style.sizePx * 0.28;
      if (item.marker === "•" || item.marker === "◦" || item.marker === "▪") {
        const radius = sizePt * 0.17;
        const cx = X(ctx, item.x - gapPx) - radius * 1.6;
        const cy = Y(ctx, item.baseline) + sizePt * 0.32;
        if (item.marker === "▪") {
          page.drawRectangle({
            color,
            height: radius * 1.8,
            width: radius * 1.8,
            x: cx - radius * 0.9,
            y: cy - radius * 0.9,
          });
        } else {
          page.drawEllipse({
            borderColor: color,
            borderWidth: item.marker === "◦" ? Math.max(0.6, sizePt * 0.06) : 0,
            color: item.marker === "•" ? color : undefined,
            x: cx,
            xScale: radius,
            y: cy,
            yScale: radius,
          });
        }
        return;
      }
      const { font } = await ctx.fonts.get(style.font, style.face);
      const width = font.widthOfTextAtSize(item.marker, sizePt);
      page.drawText(item.marker, {
        color,
        font,
        size: sizePt,
        x: X(ctx, item.x - gapPx) - width,
        y: Y(ctx, item.baseline),
      });
      return;
    }

    case "text": {
      const style = item.style;
      const sizePt = style.sizePx * PX_TO_PT;

      if (style.highlight) {
        page.drawRectangle({
          color: toRgb(lib, style.highlight),
          height: item.height * PX_TO_PT,
          opacity: style.highlight.a,
          width: item.width * PX_TO_PT,
          x: X(ctx, item.x),
          y: Y(ctx, item.y + item.height),
        });
      }

      if (item.text) {
        await drawString(ctx, item.text, item.x, item.baseline, style);
      }

      const thickness = Math.max(0.5, sizePt * 0.055);
      if (style.underline) {
        const y = Y(ctx, item.baseline) - sizePt * 0.12;
        page.drawLine({
          color: toRgb(lib, style.underline),
          end: { x: X(ctx, item.x + item.width), y },
          start: { x: X(ctx, item.x), y },
          thickness,
        });
      }
      if (style.strike) {
        const y = Y(ctx, item.baseline) + sizePt * 0.27;
        page.drawLine({
          color: toRgb(lib, style.strike),
          end: { x: X(ctx, item.x + item.width), y },
          start: { x: X(ctx, item.x), y },
          thickness,
        });
      }
      return;
    }
  }
}

function drawBox(ctx: DrawContext, box: PagedBox, part: "fill" | "borders") {
  const { lib, page } = ctx;
  const left = X(ctx, box.x);
  const right = X(ctx, box.x + box.width);
  const top = Y(ctx, box.y);
  const bottom = Y(ctx, box.y + box.height);

  if (part === "fill") {
    if (box.fill) {
      page.drawRectangle({
        color: toRgb(lib, box.fill),
        height: top - bottom,
        opacity: box.fill.a,
        width: right - left,
        x: left,
        y: bottom,
      });
    }
    return;
  }

  const sides = box.borders;
  const line = (
    side: { color: Rgba; width: number },
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) =>
    page.drawLine({
      color: toRgb(lib, side.color),
      end,
      opacity: side.color.a,
      start,
      thickness: side.width * PX_TO_PT,
    });

  if (sides.top)
    line(
      sides.top,
      { x: left, y: top - (sides.top.width * PX_TO_PT) / 2 },
      { x: right, y: top - (sides.top.width * PX_TO_PT) / 2 },
    );
  if (sides.bottom)
    line(
      sides.bottom,
      { x: left, y: bottom + (sides.bottom.width * PX_TO_PT) / 2 },
      { x: right, y: bottom + (sides.bottom.width * PX_TO_PT) / 2 },
    );
  if (sides.left)
    line(
      sides.left,
      { x: left + (sides.left.width * PX_TO_PT) / 2, y: top },
      { x: left + (sides.left.width * PX_TO_PT) / 2, y: bottom },
    );
  if (sides.right)
    line(
      sides.right,
      { x: right - (sides.right.width * PX_TO_PT) / 2, y: top },
      { x: right - (sides.right.width * PX_TO_PT) / 2, y: bottom },
    );
}

/** Lays the document out off screen, waiting for its fonts and pictures. */
async function layOut(html: string, setup: PageSetup) {
  ensureComposerStyles();
  const { width } = pageDimensions(setup);
  const contentWidthPt = width - setup.margins.left - setup.margins.right;
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${contentWidthPt / PX_TO_PT}px;visibility:hidden;pointer-events:none;contain:layout style;`;
  const root = document.createElement("div");
  root.className = "composer-doc";
  root.innerHTML = html;
  host.appendChild(root);
  document.body.appendChild(host);

  // Load every face the document uses before measuring.
  const faces = new Set<string>();
  for (const element of [
    root,
    ...Array.from(root.querySelectorAll<HTMLElement>("*")),
  ]) {
    const cs = getComputedStyle(element);
    faces.add(`${cs.fontStyle} ${cs.fontWeight} 16px ${cs.fontFamily}`);
  }
  await Promise.all(
    [...faces].map((face) => document.fonts.load(face).catch(() => [])),
  );
  await document.fonts.ready;
  await Promise.all(
    Array.from(root.querySelectorAll("img")).map((image) =>
      image.decode().catch(() => undefined),
    ),
  );

  return { host, root };
}

export type RenderedDocument = { bytes: Uint8Array; pageCount: number };

export async function renderDocumentPdf(input: {
  html: string;
  page: PageSetup;
  title: string;
}): Promise<RenderedDocument> {
  const [lib, fontkitModule] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);
  const fontkit =
    (fontkitModule as { default?: unknown }).default ?? fontkitModule;
  const { height, width } = pageDimensions(input.page);
  const contentHeightPx =
    (height - input.page.margins.top - input.page.margins.bottom) / PX_TO_PT;
  const { host, root } = await layOut(input.html, input.page);

  try {
    const measured = measureDocument(root, { words: true });
    const paged = paginate(measured, contentHeightPx);
    const pdf = await lib.PDFDocument.create();
    pdf.registerFontkit(
      fontkit as Parameters<PDFDocument["registerFontkit"]>[0],
    );
    pdf.setTitle(input.title || "Untitled document", {
      showInWindowTitleBar: true,
    });
    pdf.setCreator("SignuDoc");
    pdf.setProducer("SignuDoc document composer");
    pdf.setCreationDate(new Date());
    pdf.setModificationDate(new Date());

    const fonts = new FontBook(pdf, lib);
    const images = new Map<string, Promise<PDFImage | null>>();

    for (let index = 0; index < paged.pageCount; index += 1) {
      const page = pdf.addPage([width, height]);
      const ctx: DrawContext = {
        fonts,
        images,
        lib,
        marginLeft: input.page.margins.left,
        marginTop: input.page.margins.top,
        page,
        pageHeight: height,
        pdf,
      };
      const boxes = paged.boxes.filter((box) => box.page === index);
      const items = paged.items.filter((item) => item.page === index);
      const order: Record<PagedItem["kind"], number> = {
        checkbox: 4,
        fill: 1,
        image: 2,
        marker: 4,
        text: 3,
      };

      for (const box of boxes) drawBox(ctx, box, "fill");
      for (const item of [...items].sort(
        (a, b) => order[a.kind] - order[b.kind],
      )) {
        await drawItem(ctx, item);
      }
      for (const box of boxes) drawBox(ctx, box, "borders");
    }

    const bytes = await pdf.save({ useObjectStreams: false });

    return { bytes, pageCount: paged.pageCount };
  } finally {
    host.remove();
  }
}

/** Page boundaries for the editor, measured on the live page. */
export function measurePageStarts(
  root: HTMLElement,
  setup: PageSetup,
  scale: number,
) {
  const { height } = pageDimensions(setup);
  const contentHeightPx =
    (height - setup.margins.top - setup.margins.bottom) / PX_TO_PT;
  const measured = measureDocument(root, { scale, words: false });
  const paged = paginate(measured, contentHeightPx);

  return {
    pageCount: Math.max(1, paged.pageStarts.length + 1),
    pageStarts: paged.pageStarts,
  };
}
