import { useRef, useCallback, useEffect } from 'react';

export function useLineGestures({ lineIndex, isSynced, settings, handleToggleLine, shiftTime, showNudge }) {
  const touchStartRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    // Long-press → select (500ms)
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      handleToggleLine(lineIndex);
      touchStartRef.current = null; // cancel swipe
    }, 500);
  }, [handleToggleLine, lineIndex]);

  const handleTouchEnd = useCallback((e) => {
    clearTimeout(longPressTimerRef.current);
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Only register horizontal swipe: |dx| > 40px, |dy| < 30px, < 500ms
    if (Math.abs(dx) > 40 && Math.abs(dy) < 30 && elapsed < 500 && isSynced) {
      const nudge = settings.editor?.nudge?.default || 0.1;
      const delta = dx > 0 ? nudge : -nudge;
      shiftTime(lineIndex, delta);
      showNudge(delta);
    }
  }, [isSynced, settings.editor?.nudge?.default, shiftTime, showNudge, lineIndex]);

  const handleTouchMove = useCallback(() => {
    // Cancel long-press if finger moved
    clearTimeout(longPressTimerRef.current);
  }, []);

  // Cleanup: only clear longPressTimerRef (nudgeTimerRef and wordClickTimerRef stay in EditorLineItem)
  useEffect(() => () => {
    clearTimeout(longPressTimerRef.current);
  }, []);

  return { handleTouchStart, handleTouchEnd, handleTouchMove };
}
