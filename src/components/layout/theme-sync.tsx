"use client";

import { useEffect } from "react";

import { applyThemePreference, readThemePreference } from "@/lib/theme";

/** Follows the OS theme while the preference is "system". */
export function ThemeSync() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemePreference() === "system") applyThemePreference("system");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return null;
}
