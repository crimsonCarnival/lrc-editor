import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for undo/redo history management.
 * Wraps a state value with a history stack (capped at MAX_HISTORY).
 *
 * @param {*} initial - Initial state value
 * @returns {[state, setState, undo, redo, canUndo, canRedo]}
 */
const MAX_HISTORY = 50;

export default function useHistory(initial, options = {}) {
  const limit = options.limit || 50;
  const groupingThresholdMs = options.groupingThresholdMs || 500;

  const [state, setStateRaw] = useState(initial);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const lastUpdateRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const setState = useCallback((updater) => {
    setStateRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      
      const now = Date.now();
      if (now - lastUpdateRef.current > groupingThresholdMs) {
        pastRef.current = [...pastRef.current, prev].slice(-limit);
      }
      
      lastUpdateRef.current = now;
      futureRef.current = [];
      
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(futureRef.current.length > 0);
      
      return next;
    });
  }, [limit, groupingThresholdMs]);

  const undo = useCallback(() => {
    setStateRaw((prev) => {
      if (pastRef.current.length === 0) return prev;
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, prev];
      
      lastUpdateRef.current = 0; // Reset threshold timer
      
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(futureRef.current.length > 0);
      
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setStateRaw((prev) => {
      if (futureRef.current.length === 0) return prev;
      const next = futureRef.current[futureRef.current.length - 1];
      futureRef.current = futureRef.current.slice(0, -1);
      pastRef.current = [...pastRef.current, prev];
      
      lastUpdateRef.current = 0; // Reset threshold timer
      
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(futureRef.current.length > 0);
      
      return next;
    });
  }, []);



  return [state, setState, undo, redo, canUndo, canRedo];
}
