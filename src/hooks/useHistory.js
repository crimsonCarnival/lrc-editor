import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for undo/redo history management.
 * Wraps a state value with a history stack (capped at `options.limit`).
 * Supports time-based grouping: rapid updates within `groupingThresholdMs`
 * are collapsed into a single undo entry.
 *
 * Supports an optional companion state that is captured and restored
 * alongside the main value (e.g. editorMode along with lines).
 *
 * @param {*} initial - Initial state value
 * @param {object} options
 * @param {number} [options.limit=50] - Max history entries
 * @param {number} [options.groupingThresholdMs=500] - Grouping window in ms
 * @param {function} [options.getCompanion] - () => currentCompanionValue, called on each push
 * @param {function} [options.onRestoreCompanion] - (value) => void, called after undo/redo
 * @returns {[state, setState, undo, redo, canUndo, canRedo]}
 */
export default function useHistory(initial, options = {}) {
  const limit = options.limit || 50;
  const groupingThresholdMs = options.groupingThresholdMs || 500;

  // Sync refs every render so callbacks always capture the latest closures
  const getCompanionRef = useRef(null);
  const onRestoreCompanionRef = useRef(null);
  getCompanionRef.current = options.getCompanion || null;
  onRestoreCompanionRef.current = options.onRestoreCompanion || null;

  const [state, setStateRaw] = useState(initial);
  const pastRef = useRef([]); // Array of { value, companion }
  const futureRef = useRef([]); // Array of { value, companion }
  const lastUpdateRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Deferred companion restore — set inside setState callback, consumed on next render
  const pendingRestoreRef = useRef(null);

  const setState = useCallback((updater) => {
    setStateRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      
      const now = Date.now();
      if (now - lastUpdateRef.current > groupingThresholdMs) {
        const companion = getCompanionRef.current?.();
        pastRef.current = [...pastRef.current, { value: prev, companion }].slice(-limit);
      }
      
      lastUpdateRef.current = now;
      futureRef.current = [];
      
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(false);
      
      return next;
    });
  }, [limit, groupingThresholdMs]);

  const undo = useCallback(() => {
    setStateRaw((prev) => {
      if (pastRef.current.length === 0) return prev;
      const entry = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      const currentCompanion = getCompanionRef.current?.();
      futureRef.current = [...futureRef.current, { value: prev, companion: currentCompanion }];
      
      lastUpdateRef.current = 0;
      
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(true);

      if (entry.companion !== undefined && onRestoreCompanionRef.current) {
        pendingRestoreRef.current = entry.companion;
      }
      
      return entry.value;
    });
  }, []);

  const redo = useCallback(() => {
    setStateRaw((prev) => {
      if (futureRef.current.length === 0) return prev;
      const entry = futureRef.current[futureRef.current.length - 1];
      futureRef.current = futureRef.current.slice(0, -1);
      const currentCompanion = getCompanionRef.current?.();
      pastRef.current = [...pastRef.current, { value: prev, companion: currentCompanion }];
      
      lastUpdateRef.current = 0;
      
      setCanUndo(true);
      setCanRedo(futureRef.current.length > 0);

      if (entry.companion !== undefined && onRestoreCompanionRef.current) {
        pendingRestoreRef.current = entry.companion;
      }
      
      return entry.value;
    });
  }, []);

  // Process deferred companion restore during render (render-phase state update,
  // safe in React 18 — batched with the state update that triggered this render).
  if (pendingRestoreRef.current !== null) {
    const companion = pendingRestoreRef.current;
    pendingRestoreRef.current = null;
    onRestoreCompanionRef.current?.(companion);
  }

  return [state, setState, undo, redo, canUndo, canRedo];
}
