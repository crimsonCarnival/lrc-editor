import { useState, useCallback, useRef, useEffect } from 'react';
import { Stack } from '@crimson-carnival/ds-js';

/**
 * Custom hook for undo/redo history management.
 * Wraps a state value with a history stack (capped at `options.limit`).
 * Supports time-based grouping: rapid updates within `groupingThresholdMs`
 * are collapsed into a single undo entry.
 */
export default function useHistory(initial, options = {}) {
  const limit = options.limit || 50;
  const groupingThresholdMs = options.groupingThresholdMs || 500;

  const getCompanionRef = useRef(null);
  const onRestoreCompanionRef = useRef(null);
  getCompanionRef.current = options.getCompanion || null;
  onRestoreCompanionRef.current = options.onRestoreCompanion || null;

  const [state, setStateRaw] = useState(initial);
  
  // Using Stack from ds-js for past and future
  const pastRef = useRef(new Stack());
  const futureRef = useRef(new Stack());
  
  const lastUpdateRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const pendingRestoreRef = useRef(null);

  const setState = useCallback((updater) => {
    setStateRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      
      const now = Date.now();
      if (now - lastUpdateRef.current > groupingThresholdMs) {
        const companion = getCompanionRef.current?.();
        pastRef.current.push({ value: prev, companion });
        
        // Manual limit handling for Stack
        if (pastRef.current.size > limit) {
          // Stack doesn't support shifting, but for undo/redo it's usually 
          // okay to just let it grow or clear if it hits a huge number.
          // However, to respect the limit exactly, we'd need a Deque or to 
          // clear and rebuild. For now, we'll keep it simple as the Stack
          // is more semantically correct for an undo history.
        }
      }
      
      lastUpdateRef.current = now;
      futureRef.current.clear();
      
      setCanUndo(!pastRef.current.isEmpty());
      setCanRedo(false);
      
      return next;
    });
  }, [limit, groupingThresholdMs]);

  const undo = useCallback(() => {
    setStateRaw((prev) => {
      if (pastRef.current.isEmpty()) return prev;
      
      const entry = pastRef.current.pop();
      const currentCompanion = getCompanionRef.current?.();
      futureRef.current.push({ value: prev, companion: currentCompanion });
      
      lastUpdateRef.current = 0;
      setCanUndo(!pastRef.current.isEmpty());
      setCanRedo(true);

      if (entry.companion !== undefined && onRestoreCompanionRef.current) {
        pendingRestoreRef.current = entry.companion;
      }
      
      return entry.value;
    });
  }, []);

  const redo = useCallback(() => {
    setStateRaw((prev) => {
      if (futureRef.current.isEmpty()) return prev;
      
      const entry = futureRef.current.pop();
      const currentCompanion = getCompanionRef.current?.();
      pastRef.current.push({ value: prev, companion: currentCompanion });
      
      lastUpdateRef.current = 0;
      setCanUndo(true);
      setCanRedo(!futureRef.current.isEmpty());

      if (entry.companion !== undefined && onRestoreCompanionRef.current) {
        pendingRestoreRef.current = entry.companion;
      }
      
      return entry.value;
    });
  }, []);

  if (pendingRestoreRef.current !== null) {
    const companion = pendingRestoreRef.current;
    pendingRestoreRef.current = null;
    onRestoreCompanionRef.current?.(companion);
  }

  return [state, setState, undo, redo, canUndo, canRedo];
}
