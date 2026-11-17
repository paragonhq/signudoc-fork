"use client";

import { useEffect, useState } from "react";

import { Rosette } from "@/components/brand/marks";

import { FinishSeal } from "./finish-seal";

/** Set by the seal moment so the done page does not play it twice. */
export const SEAL_PLAYED_KEY = "signudoc:seal-played";

function sealJustPlayed() {
  try {
    const at = Number(window.sessionStorage.getItem(SEAL_PLAYED_KEY));

    window.sessionStorage.removeItem(SEAL_PLAYED_KEY);

    return Number.isFinite(at) && Date.now() - at < 15_000;
  } catch {
    return false;
  }
}

/**
 * The done page's seal. Coming straight from the seal moment it is simply
 * there, in the same place; arriving any other way (back from a signing
 * provider, a reload) it settles in once.
 */
export function DoneSeal({ signedOn }: { signedOn: string }) {
  const [mode, setMode] = useState<"pending" | "settle" | "still">("pending");

  useEffect(() => {
    // Read once on arrival: browser storage is only there after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(sealJustPlayed() ? "still" : "settle");
  }, []);

  return (
    <div className="relative flex size-40 items-center justify-center sm:size-44">
      <Rosette className="pointer-events-none absolute size-[22rem] max-w-[100vw] text-(--accent) opacity-[0.07]" />
      {mode === "pending" ? null : (
        <FinishSeal
          className="size-40 sm:size-44"
          date={signedOn}
          delay={0.1}
          settle={mode === "settle"}
        />
      )}
    </div>
  );
}
