"use client";

import { useCallback, useRef, useState } from "react";

import { type PrepareField } from "./model";

const HISTORY_LIMIT = 100;
/** Edits with the same key this close together undo as one step. */
const COALESCE_WINDOW_MS = 900;

type CommitOptions = {
  /**
   * Edits that share a key and arrive in quick succession (typing a label,
   * scrubbing a width) become one undo step.
   */
  coalesce?: string;
};

/**
 * The field list with an undo/redo stack. Every user edit goes through
 * `commit`, which records the list it replaced; `replaceFromServer` swaps
 * in what the server saved without touching the history. Undo and redo set
 * the list like any other edit, so autosave sends them on as usual.
 */
export function useFieldHistory(initialFields: PrepareField[]) {
  const [fields, setFieldsState] = useState(initialFields);
  const fieldsRef = useRef(fields);
  const pastRef = useRef<PrepareField[][]>([]);
  const futureRef = useRef<PrepareField[][]>([]);
  const lastCommitRef = useRef<{ at: number; key: string } | null>(null);
  const [historySize, setHistorySize] = useState({ future: 0, past: 0 });

  const apply = useCallback((next: PrepareField[]) => {
    fieldsRef.current = next;
    setFieldsState(next);
    setHistorySize({
      future: futureRef.current.length,
      past: pastRef.current.length,
    });
  }, []);

  const commit = useCallback(
    (
      update: (current: readonly PrepareField[]) => PrepareField[],
      options: CommitOptions = {},
    ) => {
      const previous = fieldsRef.current;
      const next = update(previous);

      if (next === previous) {
        return;
      }

      const now = Date.now();
      const last = lastCommitRef.current;
      const coalesces =
        options.coalesce !== undefined &&
        last !== null &&
        last.key === options.coalesce &&
        now - last.at < COALESCE_WINDOW_MS;

      if (!coalesces) {
        pastRef.current = [...pastRef.current, previous].slice(-HISTORY_LIMIT);
      }

      futureRef.current = [];
      lastCommitRef.current = options.coalesce
        ? { at: now, key: options.coalesce }
        : null;
      apply(next);
    },
    [apply],
  );

  const undo = useCallback(() => {
    const previous = pastRef.current.at(-1);

    if (!previous) {
      return false;
    }

    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, fieldsRef.current];
    lastCommitRef.current = null;
    apply(previous);

    return true;
  }, [apply]);

  const redo = useCallback(() => {
    const next = futureRef.current.at(-1);

    if (!next) {
      return false;
    }

    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, fieldsRef.current];
    lastCommitRef.current = null;
    apply(next);

    return true;
  }, [apply]);

  const replaceFromServer = useCallback((next: PrepareField[]) => {
    fieldsRef.current = next;
    setFieldsState(next);
  }, []);

  return {
    canRedo: historySize.future > 0,
    canUndo: historySize.past > 0,
    commit,
    fields,
    fieldsRef,
    redo,
    replaceFromServer,
    undo,
  };
}
