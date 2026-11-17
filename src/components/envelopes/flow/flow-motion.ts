"use client";

import { useEffect, useState } from "react";

/*
 * Which step of the send flow the person just came from, so the next step
 * can arrive from the right direction (forward → from the right, back →
 * from the left) and the progress pill can travel instead of jumping.
 *
 * Module state, written only in the browser after a step mounts. A full
 * page load starts fresh (no previous step, no entrance), so the server
 * render and hydration always agree; only in-app navigation animates.
 */
let lastFlowStep: number | null = null;

export function useFlowEntrance(step: number) {
  const [previous] = useState<number | null>(() =>
    lastFlowStep !== null && lastFlowStep !== step ? lastFlowStep : null,
  );

  useEffect(() => {
    lastFlowStep = step;
  }, [step]);

  return {
    /** 1 forward, -1 back, 0 no entrance (first load, same step). */
    direction: previous === null ? 0 : previous < step ? 1 : -1,
    previous,
  };
}
