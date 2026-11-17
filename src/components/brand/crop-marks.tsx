import * as React from "react";

/*
 * Retired; see CropMarks below. Was: crop marks: four L-shaped corners (1.5px, 14px) just outside a box, like
 * the corners of a proof sheet on the brand boards. Wrap the thing that is
 * "the document": the thumbnail on the detail page, a drop zone, the page
 * on the signing desk, the auth card. Decorative (aria-hidden).
 *
 *   <CropMarks><DocumentThumbnail … /></CropMarks>
 *   <CropMarks tone="muted" offset={10} className="rounded-xl">…</CropMarks>
 *
 * The marks sit outside the box, so leave ~12px of room around it.
 */

type CropMarksProps = React.ComponentProps<"div"> & {
  /** Gap between the box corner and the mark's corner, px. */
  offset?: number;
  /** Arm length, px. */
  size?: number;
  /** `ink` carbon (default), `muted` grey, `accent`, `bond` on dark grounds. */
  tone?: "bond" | "ink" | "muted" | "accent";
};

/**
 * Calm: crop marks are retired. This renders its
 * children in a plain wrapper (className and props still apply, so layouts
 * that relied on it keep their shape) and draws no marks.
 */
function CropMarks({
  children,
  className,
  offset: _offset,
  size: _size,
  tone: _tone,
  ...props
}: CropMarksProps) {
  void _offset;
  void _size;
  void _tone;

  return (
    <div className={className} data-slot="crop-marks" {...props}>
      {children}
    </div>
  );
}

export { CropMarks, type CropMarksProps };
