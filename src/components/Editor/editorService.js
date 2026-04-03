/**
 * Pure functions for editor logic — no side effects, no React imports.
 */

/**
 * Detect duplicate/overlapping timestamps within a threshold.
 * Returns a Set of line indices that have a timestamp within ±threshold of another line.
 * @param {Array} lines
 * @param {number} threshold - seconds (default 0.05)
 * @returns {Set<number>}
 */
export function detectDuplicateTimestamps(lines, threshold = 0.05) {
  const overlapping = new Set();
  const timestamped = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timestamp != null) {
      timestamped.push({ index: i, time: lines[i].timestamp });
    }
  }
  for (let a = 0; a < timestamped.length; a++) {
    for (let b = a + 1; b < timestamped.length; b++) {
      if (Math.abs(timestamped[a].time - timestamped[b].time) <= threshold) {
        overlapping.add(timestamped[a].index);
        overlapping.add(timestamped[b].index);
      }
    }
  }
  return overlapping;
}

/**
 * Computes the next active line index after marking, respecting skipBlank.
 */
export function computeNextIndex(lines, fromIndex, skipBlank) {
  let nextIndex = fromIndex + 1;
  if (skipBlank) {
    while (nextIndex < lines.length) {
      const text = lines[nextIndex]?.text?.trim();
      if (text && text !== '♪') break;
      nextIndex++;
    }
  }
  return Math.min(nextIndex, lines.length - 1);
}

/**
 * Applies a timestamp shift delta to all lines whose indices are in the selection set.
 * Also shifts endTime if present.
 */
export function applyBulkShift(lines, selectedIndices, delta) {
  const numericDelta = Number(delta) || 0;
  return lines.map((l, idx) => {
    if (!selectedIndices.has(idx) || l.timestamp == null) return l;
    const newTimestamp = Math.max(0, Number(l.timestamp) + numericDelta);
    if (isNaN(newTimestamp)) return l;
    const result = { ...l, timestamp: newTimestamp };
    if (result.endTime != null) {
      result.endTime = Math.max(0, Number(l.endTime) + numericDelta);
    }
    if (result.extraTimestamps?.length) {
      result.extraTimestamps = result.extraTimestamps.map((t) => Math.max(0, Number(t) + numericDelta));
    }
    return result;
  });
}

/**
 * Evenly distribute timestamps for selected lines between the first and last synced lines.
 * @param {Array} lines
 * @param {Set<number>} selectedIndices
 * @returns {Array}
 */
export function evenlyDistribute(lines, selectedIndices) {
  const sorted = [...selectedIndices].sort((a, b) => a - b);
  if (sorted.length < 2) return lines;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startTime = lines[first]?.timestamp;
  const endTime = lines[last]?.timestamp;
  if (startTime == null || endTime == null) return lines;
  const step = (endTime - startTime) / (sorted.length - 1);
  const updated = [...lines];
  sorted.forEach((idx, i) => {
    updated[idx] = { ...updated[idx], timestamp: startTime + step * i };
  });
  return updated;
}

/**
 * Interpolate unsynced lines between synced ones within the selection.
 * Finds synced "anchor" lines, then linearly distributes timestamps for unsynced lines between each pair.
 * @param {Array} lines
 * @param {Set<number>} selectedIndices
 * @returns {Array}
 */
export function interpolateTimestamps(lines, selectedIndices) {
  const sorted = [...selectedIndices].sort((a, b) => a - b);
  if (sorted.length < 2) return lines;
  // Find anchors (synced lines within selection)
  const anchors = sorted.filter((idx) => lines[idx]?.timestamp != null);
  if (anchors.length < 2) return lines;
  const updated = [...lines];
  for (let a = 0; a < anchors.length - 1; a++) {
    const fromIdx = anchors[a];
    const toIdx = anchors[a + 1];
    const fromTime = updated[fromIdx].timestamp;
    const toTime = updated[toIdx].timestamp;
    // Find unsynced lines between these anchors within the selection
    const between = sorted.filter((idx) => idx > fromIdx && idx < toIdx && updated[idx].timestamp == null);
    if (between.length === 0) continue;
    const totalSlots = between.length + 1;
    const step = (toTime - fromTime) / totalSlots;
    between.forEach((idx, i) => {
      updated[idx] = { ...updated[idx], timestamp: fromTime + step * (i + 1) };
    });
  }
  return updated;
}

/**
 * Copy timestamps from one selection of lines to another set of lines (for repeated choruses).
 * Copies timestamps from the first N selected lines (that have timestamps) to the last N selected lines.
 * @param {Array} lines
 * @param {Set<number>} selectedIndices
 * @returns {{ lines: Array, copied: number }}
 */
export function copyTimestamps(lines, selectedIndices) {
  const sorted = [...selectedIndices].sort((a, b) => a - b);
  if (sorted.length < 2) return { lines, copied: 0 };
  // Split into source (synced) and target (unsynced)
  const synced = sorted.filter((idx) => lines[idx]?.timestamp != null);
  const unsynced = sorted.filter((idx) => lines[idx]?.timestamp == null);
  if (synced.length === 0 || unsynced.length === 0) return { lines, copied: 0 };
  const updated = [...lines];
  const count = Math.min(synced.length, unsynced.length);
  for (let i = 0; i < count; i++) {
    const src = synced[i];
    const dst = unsynced[i];
    updated[dst] = {
      ...updated[dst],
      timestamp: updated[src].timestamp,
      ...(updated[src].endTime != null ? { endTime: updated[src].endTime } : {}),
    };
  }
  return { lines: updated, copied: count };
}

/**
 * Applies a global offset shift (delta) to all lines with timestamps.
 */
export function applyGlobalOffset(lines, delta) {
  const numericDelta = Number(delta);
  if (isNaN(numericDelta) || numericDelta === 0) return lines;
  return lines.map((l) => ({
    ...l,
    timestamp: l.timestamp != null ? Math.max(0, l.timestamp + numericDelta) : null,
    endTime: l.endTime != null ? Math.max(0, l.endTime + numericDelta) : l.endTime,
    extraTimestamps: l.extraTimestamps?.map((t) => Math.max(0, t + numericDelta)),
  }));
}

/**
 * Clears all timestamps (and optionally endTimes for SRT mode, or word times for words mode).
 */
export function clearAllTimestamps(lines, isSrt, isWords) {
  return lines.map((l) => ({
    ...l,
    timestamp: null,
    ...(isSrt && { endTime: null }),
    ...(isWords && l.words && { words: l.words.map((w) => ({ ...w, time: null })) }),
  }));
}

/**
 * Clears the timestamp for a single line.
 */
export function clearLineTimestamp(lines, index, isSrt, isWords) {
  return lines.map((l, i) =>
    i === index
      ? {
          ...l,
          timestamp: null,
          ...(isSrt && { endTime: null }),
          extraTimestamps: undefined,
          ...(isWords && l.words && { words: l.words.map((w) => ({ ...w, time: null })) }),
        }
      : l,
  );
}

/**
 * Stamps blank lines between fromIndex+1 and the next non-blank line with the given time.
 * Returns a new array with blanks stamped.
 */
function stampBlanks(lines, fromIndex, time, isSrt) {
  const updated = [...lines];
  let nextIndex = fromIndex + 1;
  while (nextIndex < updated.length) {
    const text = updated[nextIndex]?.text?.trim();
    if (text && text !== '♪') break;
    nextIndex++;
  }
  for (let i = fromIndex + 1; i < nextIndex; i++) {
    updated[i] = isSrt
      ? { ...updated[i], timestamp: time, endTime: time }
      : { ...updated[i], timestamp: time };
  }
  return { lines: updated, nextBlankEnd: nextIndex };
}

/**
 * Pure function that computes the next lines state and side-effects from a mark action.
 *
 * @param {object} params
 * @param {Array} params.lines - current lines array
 * @param {number} params.activeLineIndex
 * @param {number} params.time - current playback time
 * @param {string} params.editorMode - 'lrc' | 'srt' | 'words'
 * @param {number} params.activeWordIndex - current word index being stamped (words mode)
 * @param {number|null} params.awaitingEndMark - line index awaiting end mark, or null
 * @param {object|null} params.focusedTimestamp - { lineIndex, type } or null
 * @param {object} params.settings - editor settings subtree
 *
 * @returns {{ nextLines: Array, nextActiveLineIndex: number|null, nextAwaitingEndMark: object|null, nextActiveWordIndex?: number }}
 *   nextActiveLineIndex is null if unchanged, nextAwaitingEndMark is null to clear or an object to set.
 *   nextActiveWordIndex is only present in 'words' mode.
 */
export function applyMark({ lines, activeLineIndex, time, editorMode, activeWordIndex = 0, awaitingEndMark, focusedTimestamp, settings }) {
  if (activeLineIndex >= lines.length) {
    return { nextLines: lines, nextActiveLineIndex: null, nextAwaitingEndMark: undefined };
  }

  const skipBlank = settings.autoAdvance?.skipBlank;
  const autoAdvance = settings.autoAdvance?.enabled;
  const isSrt = editorMode === 'srt';

  // Focused timestamp takes priority
  if (focusedTimestamp) {
    const updated = [...lines];
    const line = updated[focusedTimestamp.lineIndex];
    if (line) {
      updated[focusedTimestamp.lineIndex] = {
        ...line,
        ...(focusedTimestamp.type === 'start'
          ? { timestamp: time }
          : { endTime: Math.max(line.timestamp ?? 0, time) }),
      };
    }
    return { nextLines: updated, nextActiveLineIndex: null, nextAwaitingEndMark: undefined };
  }

  const isWords = editorMode === 'words';

  if (isWords) {
    const updated = [...lines];
    const line = updated[activeLineIndex];
    const words = line.words || [];

    // First press on this line: stamp the line-level timestamp
    if (line.timestamp == null) {
      updated[activeLineIndex] = { ...line, timestamp: time };
      // If no words to stamp, immediately advance
      if (!words.length) {
        const nextIdx = autoAdvance ? computeNextIndex(lines, activeLineIndex, skipBlank) : null;
        return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
      }
      return { nextLines: updated, nextActiveLineIndex: null, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
    }

    // Subsequent presses: stamp words one by one
    const clampedIdx = Math.min(activeWordIndex, words.length - 1);
    if (clampedIdx >= 0) {
      const newWords = [...words];
      newWords[clampedIdx] = { ...newWords[clampedIdx], time };
      updated[activeLineIndex] = { ...line, words: newWords };
      const nextWordIdx = clampedIdx + 1;
      if (nextWordIdx >= words.length) {
        // All words stamped — advance line
        const nextIdx = autoAdvance ? computeNextIndex(lines, activeLineIndex, skipBlank) : null;
        return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
      }
      return { nextLines: updated, nextActiveLineIndex: null, nextAwaitingEndMark: null, nextActiveWordIndex: nextWordIdx };
    }

    // Safety: advance if out of bounds
    const nextIdx = autoAdvance ? computeNextIndex(lines, activeLineIndex, skipBlank) : null;
    return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null, nextActiveWordIndex: 0 };
  }

  if (isSrt) {
    if (settings.srt?.snapToNextLine) {
      let updated = [...lines];

      // Close previous line's endTime
      let lastSyncedIndex = activeLineIndex - 1;
      while (lastSyncedIndex >= 0 && updated[lastSyncedIndex].timestamp == null) {
        lastSyncedIndex--;
      }
      if (lastSyncedIndex >= 0 && updated[lastSyncedIndex].endTime == null) {
        updated[lastSyncedIndex] = {
          ...updated[lastSyncedIndex],
          endTime: Math.max(
            updated[lastSyncedIndex].timestamp ?? 0,
            time - (settings.srt?.minSubtitleGap || 0),
          ),
        };
      }

      updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };

      if (skipBlank) {
        const result = stampBlanks(updated, activeLineIndex, time, true);
        updated = result.lines;
      }

      const nextIdx = autoAdvance
        ? computeNextIndex(lines, activeLineIndex, skipBlank)
        : null;

      return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null };
    }

    // SRT non-snap mode
    if (awaitingEndMark === activeLineIndex) {
      let updated = [...lines];
      updated[activeLineIndex] = {
        ...updated[activeLineIndex],
        endTime: Math.max(updated[activeLineIndex].timestamp ?? 0, time),
      };

      if (skipBlank) {
        const result = stampBlanks(updated, activeLineIndex, time, true);
        updated = result.lines;
      }

      const nextIdx = autoAdvance
        ? computeNextIndex(lines, activeLineIndex, skipBlank)
        : null;

      return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null };
    }

    // SRT first mark on line (set start time)
    const updated = [...lines];
    updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };
    return {
      nextLines: updated,
      nextActiveLineIndex: null,
      nextAwaitingEndMark: { lineIndex: activeLineIndex, mode: editorMode },
    };
  }

  // LRC mode
  let updated = [...lines];
  updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };

  if (skipBlank) {
    const result = stampBlanks(updated, activeLineIndex, time, false);
    updated = result.lines;
  }

  const nextIdx = autoAdvance
    ? computeNextIndex(lines, activeLineIndex, skipBlank)
    : null;

  return { nextLines: updated, nextActiveLineIndex: nextIdx, nextAwaitingEndMark: null };
}
