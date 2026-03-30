/**
 * Pure functions for editor logic — no side effects, no React imports.
 */

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
    return result;
  });
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
  }));
}

/**
 * Clears all timestamps (and optionally endTimes for SRT mode).
 */
export function clearAllTimestamps(lines, isSrt) {
  return lines.map((l) => ({
    ...l,
    timestamp: null,
    ...(isSrt && { endTime: null }),
  }));
}

/**
 * Clears the timestamp for a single line.
 */
export function clearLineTimestamp(lines, index, isSrt) {
  return lines.map((l, i) =>
    i === index
      ? { ...l, timestamp: null, ...(isSrt && { endTime: null }) }
      : l,
  );
}
