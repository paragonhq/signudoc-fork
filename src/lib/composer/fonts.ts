// The typefaces the document composer offers, shared by the editor (which
// draws them with @font-face) and the PDF writer (which embeds the very same
// files). Because both read one file, a line breaks in the PDF exactly where
// it broke on screen.
//
// Three are the classic office faces. They need no download: the PDF uses
// its built-in Helvetica, Times and Courier, which have the same character
// widths as Arial, Times New Roman and Courier New.
//
// The rest are popular Google Fonts, self-hosted from public/fonts/composer
// (SIL Open Font License / Apache 2.0, see LICENSES.txt there). Each file
// was cut down to Latin, Greek and Cyrillic, and its kerning and ligatures
// removed, so every character has one fixed width in the browser and in the
// PDF alike.

export type FontFace = "regular" | "italic" | "bold" | "bolditalic";

export type FontCategory =
  "standard" | "sans" | "serif" | "display" | "mono" | "handwriting";

export type StandardPdfFont = "Helvetica" | "Times" | "Courier";

export type ComposerFont = {
  /** The CSS family name, also what a pasted `font-family` is matched on. */
  family: string;
  category: FontCategory;
  /** Full CSS stack used in the editor. */
  stack: string;
  /** For the office faces: which built-in PDF font draws it. */
  standard?: StandardPdfFont;
  /** For self-hosted faces: the file slug under /fonts/composer. */
  slug?: string;
  /** Faces that have their own file. A missing one is synthesised. */
  faces?: readonly FontFace[];
};

const ALL_FACES = ["regular", "italic", "bold", "bolditalic"] as const;
const UPRIGHT_FACES = ["regular", "bold"] as const;

function hosted(
  family: string,
  slug: string,
  category: FontCategory,
  fallback: string,
  faces: readonly FontFace[] = ALL_FACES,
): ComposerFont {
  return {
    category,
    faces,
    family,
    slug,
    stack: `"${family}", ${fallback}`,
  };
}

export const COMPOSER_FONTS: readonly ComposerFont[] = [
  {
    category: "standard",
    family: "Arial",
    stack: 'Arial, "Liberation Sans", Helvetica, sans-serif',
    standard: "Helvetica",
  },
  {
    category: "standard",
    family: "Times New Roman",
    stack: '"Times New Roman", "Liberation Serif", Times, serif',
    standard: "Times",
  },
  {
    category: "standard",
    family: "Courier New",
    stack: '"Courier New", "Liberation Mono", Courier, monospace',
    standard: "Courier",
  },
  hosted("Roboto", "roboto", "sans", "sans-serif"),
  hosted("Open Sans", "open-sans", "sans", "sans-serif"),
  hosted("Lato", "lato", "sans", "sans-serif"),
  hosted("Montserrat", "montserrat", "sans", "sans-serif"),
  hosted("Inter", "inter", "sans", "sans-serif"),
  hosted("Poppins", "poppins", "sans", "sans-serif"),
  hosted("Nunito", "nunito", "sans", "sans-serif"),
  hosted("Raleway", "raleway", "sans", "sans-serif"),
  hosted("Work Sans", "work-sans", "sans", "sans-serif"),
  hosted("Merriweather", "merriweather", "serif", "serif"),
  hosted("Lora", "lora", "serif", "serif"),
  hosted("PT Serif", "pt-serif", "serif", "serif"),
  hosted("Libre Baskerville", "libre-baskerville", "serif", "serif", [
    "regular",
    "italic",
    "bold",
  ]),
  hosted("EB Garamond", "eb-garamond", "serif", "serif"),
  hosted("Roboto Slab", "roboto-slab", "serif", "serif", UPRIGHT_FACES),
  hosted("Playfair Display", "playfair-display", "display", "serif"),
  hosted("Roboto Mono", "roboto-mono", "mono", "monospace"),
  hosted(
    "Dancing Script",
    "dancing-script",
    "handwriting",
    "cursive",
    UPRIGHT_FACES,
  ),
  hosted("Caveat", "caveat", "handwriting", "cursive", UPRIGHT_FACES),
];

export const DEFAULT_FONT = COMPOSER_FONTS[0];
export const DEFAULT_FONT_SIZE_PT = 11;

/** The font used when a character is missing from the chosen one. */
export const FALLBACK_FONT = COMPOSER_FONTS.find(
  (font) => font.family === "Roboto",
)!;

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  display: "Display",
  handwriting: "Handwriting",
  mono: "Monospace",
  sans: "Sans serif",
  serif: "Serif",
  standard: "Standard",
};

export const FONT_SIZES_PT = [
  8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96,
] as const;

const byLowerName = new Map(
  COMPOSER_FONTS.map((font) => [font.family.toLowerCase(), font]),
);

// Faces people paste in from Word, Google Docs, Pages and the web, mapped
// to the closest one offered here.
const ALIASES: Record<string, string> = {
  "-apple-system": "Arial",
  "arial black": "Arial",
  "book antiqua": "EB Garamond",
  calibri: "Arial",
  cambria: "Times New Roman",
  candara: "Arial",
  consolas: "Courier New",
  constantia: "Times New Roman",
  corbel: "Arial",
  courier: "Courier New",
  "dejavu sans mono": "Roboto Mono",
  garamond: "EB Garamond",
  georgia: "Merriweather",
  "google sans": "Roboto",
  helvetica: "Arial",
  "helvetica neue": "Arial",
  "liberation mono": "Courier New",
  "liberation sans": "Arial",
  "liberation serif": "Times New Roman",
  menlo: "Roboto Mono",
  monaco: "Roboto Mono",
  monospace: "Courier New",
  palatino: "EB Garamond",
  "palatino linotype": "EB Garamond",
  "sans-serif": "Arial",
  "segoe ui": "Arial",
  serif: "Times New Roman",
  "sf mono": "Roboto Mono",
  "source sans pro": "Open Sans",
  "source serif pro": "PT Serif",
  "system-ui": "Arial",
  tahoma: "Arial",
  times: "Times New Roman",
  "trebuchet ms": "Arial",
  verdana: "Open Sans",
  cursive: "Dancing Script",
};

/**
 * The offered font closest to a CSS `font-family` value, or null when
 * nothing in the stack is recognised (the text then keeps the default).
 */
export function matchFont(cssFamily: string | null | undefined) {
  if (!cssFamily) {
    return null;
  }

  for (const raw of cssFamily.split(",")) {
    const name = raw
      .trim()
      .replace(/^["']|["']$/g, "")
      .toLowerCase();

    if (!name) {
      continue;
    }

    const direct = byLowerName.get(name);

    if (direct) {
      return direct;
    }

    const alias = ALIASES[name];

    if (alias) {
      return byLowerName.get(alias.toLowerCase()) ?? null;
    }
  }

  return null;
}

export function fontFaceKey(bold: boolean, italic: boolean): FontFace {
  return bold
    ? italic
      ? "bolditalic"
      : "bold"
    : italic
      ? "italic"
      : "regular";
}

export function fontFileUrl(font: ComposerFont, face: FontFace) {
  return `/fonts/composer/${font.slug}-${face}.ttf`;
}

/** @font-face rules for every self-hosted face, for the editor's page. */
export function buildFontFaceCss() {
  const rules: string[] = [];

  for (const font of COMPOSER_FONTS) {
    if (!font.slug || !font.faces) {
      continue;
    }

    for (const face of font.faces) {
      rules.push(
        `@font-face{font-family:"${font.family}";src:url("${fontFileUrl(font, face)}") format("truetype");font-weight:${
          face.startsWith("bold") ? 700 : 400
        };font-style:${face.endsWith("italic") ? "italic" : "normal"};font-display:swap}`,
      );
    }
  }

  return rules.join("\n");
}
