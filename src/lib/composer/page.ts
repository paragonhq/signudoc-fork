// Page size and margins for a composed document, in PDF points (1/72 in).

export type PageSizeId = "letter" | "a4" | "legal";
export type PageOrientation = "portrait" | "landscape";

export type PageMargins = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export type PageSetup = {
  margins: PageMargins;
  orientation: PageOrientation;
  size: PageSizeId;
};

export const PAGE_SIZES: Record<
  PageSizeId,
  { height: number; label: string; detail: string; width: number }
> = {
  a4: { detail: "210 × 297 mm", height: 841.89, label: "A4", width: 595.28 },
  legal: { detail: "8.5 × 14 in", height: 1008, label: "Legal", width: 612 },
  letter: { detail: "8.5 × 11 in", height: 792, label: "Letter", width: 612 },
};

export const MARGIN_PRESETS = {
  narrow: { bottom: 36, left: 36, right: 36, top: 36 },
  normal: { bottom: 72, left: 72, right: 72, top: 72 },
  wide: { bottom: 72, left: 144, right: 144, top: 72 },
} as const satisfies Record<string, PageMargins>;

export type MarginPreset = keyof typeof MARGIN_PRESETS;

export const MARGIN_PRESET_LABELS: Record<MarginPreset, string> = {
  narrow: "Narrow · 0.5 in",
  normal: "Normal · 1 in",
  wide: "Wide · 2 in sides",
};

/** Letter in the US and Canada, A4 everywhere else. */
export function defaultPageSize(): PageSizeId {
  if (typeof navigator === "undefined") {
    return "letter";
  }

  const region = (navigator.language.split("-")[1] ?? "").toUpperCase();

  return ["US", "CA", "MX", "PH", "CL", "CO", "VE", "GT", "PR"].includes(
    region,
  ) || region === ""
    ? "letter"
    : "a4";
}

export function defaultPageSetup(): PageSetup {
  return {
    margins: { ...MARGIN_PRESETS.normal },
    orientation: "portrait",
    size: defaultPageSize(),
  };
}

export function pageDimensions(setup: PageSetup) {
  const size = PAGE_SIZES[setup.size];

  return setup.orientation === "landscape"
    ? { height: size.width, width: size.height }
    : { height: size.height, width: size.width };
}

export function matchMarginPreset(margins: PageMargins): MarginPreset | null {
  for (const [name, preset] of Object.entries(MARGIN_PRESETS)) {
    if (
      Math.abs(preset.top - margins.top) < 1 &&
      Math.abs(preset.left - margins.left) < 1 &&
      Math.abs(preset.right - margins.right) < 1 &&
      Math.abs(preset.bottom - margins.bottom) < 1
    ) {
      return name as MarginPreset;
    }
  }

  return null;
}

/** The nearest standard size for a page measured in points. */
export function matchPageSize(
  width: number,
  height: number,
): {
  orientation: PageOrientation;
  size: PageSizeId;
} {
  const orientation: PageOrientation =
    width > height ? "landscape" : "portrait";
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  let best: PageSizeId = "letter";
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [id, size] of Object.entries(PAGE_SIZES)) {
    const distance =
      Math.abs(size.width - short) + Math.abs(size.height - long);

    if (distance < bestDistance) {
      best = id as PageSizeId;
      bestDistance = distance;
    }
  }

  return { orientation, size: best };
}

export function isPageSetup(value: unknown): value is PageSetup {
  if (!value || typeof value !== "object") return false;
  const v = value as PageSetup;

  return (
    (v.size === "letter" || v.size === "a4" || v.size === "legal") &&
    (v.orientation === "portrait" || v.orientation === "landscape") &&
    !!v.margins &&
    ["top", "right", "bottom", "left"].every(
      (side) =>
        typeof v.margins[side as keyof PageMargins] === "number" &&
        v.margins[side as keyof PageMargins] >= 0 &&
        v.margins[side as keyof PageMargins] <= 288,
    )
  );
}
