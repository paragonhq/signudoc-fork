/*
 * Deterministic "randomness" for decorative brand pieces (sign lines,
 * microtext). The same seed draws the same picture on the server and in
 * the browser, so nothing here can cause a hydration mismatch. Never use
 * Math.random() while rendering.
 */

/** FNV-1a: a stable 32-bit hash of a string. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** mulberry32: a tiny seeded generator returning floats in [0, 1). */
export function seededRandom(seed: number | string): () => number {
  let state = typeof seed === "string" ? hashString(seed) : seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;

    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one item with a seeded generator. */
export function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}
