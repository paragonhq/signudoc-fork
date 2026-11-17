/*
 * The material every signature object is made of: a fill, a 1px hairline
 * a shade off the fill, an inner shadow, and a 1px inner top highlight.
 * Colours come from tokens, so dark mode follows the `dark` class on
 * <html> with no extra work.
 */

/**
 * Shared custom properties on an object's root: the highlight, the inner
 * shade and the contact shadow, light and dark. Also touch-correct: no tap
 * highlight, no double-tap zoom delay, no text selection on art.
 */
export const OBJECT_ROOT = [
  "[--obj-hi:rgb(255_255_255/0.8)] [--obj-shade:rgb(var(--fg-rgb)/0.07)] [--obj-contact:rgb(var(--fg-rgb)/0.2)]",
  "dark:[--obj-hi:rgb(255_255_255/0.07)] dark:[--obj-shade:rgb(0_0_0/0.45)] dark:[--obj-contact:rgb(0_0_0/0.6)]",
  // Materials. In dark mode envelopes are lifted off the page and paper
  // stays paper-light (as real page pictures are), with dark ink on it.
  "[--obj-bond:var(--page)] [--obj-white:var(--paper)] dark:[--obj-bond:color-mix(in_srgb,var(--fg)_14%,var(--paper))] dark:[--obj-white:color-mix(in_srgb,var(--fg)_9%,var(--paper))]",
  "[--paper-fill:var(--paper)] [--paper-line:rgb(var(--fg-rgb)/0.09)] [--paper-line-strong:rgb(var(--fg-rgb)/0.24)] [--paper-stroke:rgb(var(--fg-rgb)/0.1)] [--paper-shade:rgb(var(--fg-rgb)/0.05)]",
  "dark:[--paper-fill:color-mix(in_srgb,var(--fg)_88%,var(--paper))] dark:[--paper-line:rgb(0_0_0/0.13)] dark:[--paper-line-strong:rgb(0_0_0/0.34)] dark:[--paper-stroke:rgb(0_0_0/0.4)] dark:[--paper-shade:rgb(0_0_0/0.1)]",
  "touch-manipulation select-none [-webkit-tap-highlight-color:transparent]",
].join(" ");

/** The inset edge of a sheet of paper, as box-shadows (HTML layers). */
export const PAPER_EDGE =
  "inset 0 0 0 1px var(--paper-stroke), inset 0 1px 0 var(--obj-hi), inset 0 0 6px 1px var(--paper-shade)";

/** A soft contact shadow under a sheet resting on a surface. */
export const PAPER_CONTACT =
  "0 0.5px 1px rgb(var(--fg-rgb) / 0.08), 0 2px 5px -2px rgb(var(--fg-rgb) / 0.12)";

/** The same sheet lifted: a wider, softer shadow (faded in by opacity). */
export const PAPER_LIFT =
  "0 2px 4px -1px rgb(var(--fg-rgb) / 0.08), 0 10px 22px -8px rgb(var(--fg-rgb) / 0.22)";

/**
 * An SVG inner shadow plus a 1px top highlight for one layer. Apply with
 * `filter={`url(#${id})`}` on the layer's path.
 */
export function InnerShadowFilter({
  blur = 3,
  dy = 1,
  highlight = true,
  id,
}: {
  blur?: number;
  dy?: number;
  /** The 1px lit top edge (off for inside faces, which face away). */
  highlight?: boolean;
  id: string;
}) {
  return (
    <filter
      colorInterpolationFilters="sRGB"
      height="140%"
      id={id}
      width="140%"
      x="-20%"
      y="-20%"
    >
      <feFlood result="shadeFlood" style={{ floodColor: "var(--obj-shade)" }} />
      <feComposite
        in="shadeFlood"
        in2="SourceAlpha"
        operator="out"
        result="shadeOutside"
      />
      <feGaussianBlur
        in="shadeOutside"
        result="shadeBlur"
        stdDeviation={blur}
      />
      <feOffset dy={dy} in="shadeBlur" result="shadeOffset" />
      <feComposite
        in="shadeOffset"
        in2="SourceAlpha"
        operator="in"
        result="shade"
      />
      <feFlood result="hiFlood" style={{ floodColor: "var(--obj-hi)" }} />
      <feComposite
        in="hiFlood"
        in2="SourceAlpha"
        operator="out"
        result="hiOutside"
      />
      <feOffset dy={1} in="hiOutside" result="hiOffset" />
      <feComposite in="hiOffset" in2="SourceAlpha" operator="in" result="hi" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="shade" />
        {highlight ? <feMergeNode in="hi" /> : null}
      </feMerge>
    </filter>
  );
}
