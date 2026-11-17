"use client";

import * as React from "react";

/**
 * The dot in a StatusFlag. When the status it stands for changes while it
 * is on screen (Waiting → Completed), it takes one breath and a faint ring
 * widens off it (.status-dot in globals.css). The first render never
 * animates, so a page of statuses loads still.
 */
function StatusDot({ signature }: { signature: string }) {
  const [previous, setPrevious] = React.useState(signature);
  const [changes, setChanges] = React.useState(0);

  if (signature !== previous) {
    setPrevious(signature);
    setChanges((count) => count + 1);
  }

  return (
    <span
      aria-hidden="true"
      className="status-dot size-1.5 shrink-0 rounded-full bg-(--dot)"
      data-breathe={changes > 0 ? "" : undefined}
      data-slot="status-flag-glyph"
      // A new key restarts the breath on every change.
      key={changes}
    />
  );
}

export { StatusDot };
