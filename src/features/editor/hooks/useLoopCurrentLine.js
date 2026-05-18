import { useEffect, useRef } from 'react';

/**
 * When "Loop Current Line" is enabled, seeks back to the start of the active
 * line whenever playback reaches the line's end mark.
 */
export function useLoopCurrentLine({
  enabled,
  syncMode,
  lines,
  activeLineIndex,
  editorMode,
  playbackPosition,
  playerRef,
}) {
  const lastLoopSeekRef = useRef(0);

  useEffect(() => {
    if (!enabled || !syncMode || !lines[activeLineIndex] || lines[activeLineIndex].timestamp == null)
      return;

    const currentLine = lines[activeLineIndex];
    let endMark = currentLine.endTime;

    if (editorMode !== 'srt' || endMark == null) {
      const nextLine = lines.slice(activeLineIndex + 1).find((l) => l.timestamp != null);
      if (nextLine) endMark = nextLine.timestamp;
    }

    if (endMark != null && playbackPosition >= endMark) {
      const now = Date.now();
      if (now - lastLoopSeekRef.current > 200) {
        lastLoopSeekRef.current = now;
        playerRef.current?.seek(currentLine.timestamp);
      }
    }
  }, [playbackPosition, enabled, syncMode, lines, activeLineIndex, editorMode, playerRef]);
}
