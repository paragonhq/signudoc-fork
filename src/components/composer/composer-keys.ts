// Shortcut labels in the platform's own words: ⌘B on a Mac, Ctrl+B elsewhere.

const apple =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform);

export const mod = apple ? "⌘" : "Ctrl+";

export function shortcut(key: string, shift = false) {
  return apple
    ? `${shift ? "⇧" : ""}⌘${key}`
    : `Ctrl+${shift ? "Shift+" : ""}${key}`;
}

export function altShortcut(key: string) {
  return apple ? `⌥⌘${key}` : `Ctrl+Alt+${key}`;
}
