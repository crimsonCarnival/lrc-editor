/**
 * Checks if a keyboard event matches a shortcut key definition.
 * Supports modifiers: Ctrl/Cmd/Meta, Alt, Shift and special keys like Space.
 *
 * @param {KeyboardEvent} e
 * @param {string} targetKey – e.g. "Space", "Ctrl+Z", "Shift+ArrowLeft"
 * @returns {boolean}
 */
export function matchKey(e, targetKey) {
  if (!targetKey) return false;
  const parts = targetKey.split('+');
  const key = parts.pop();
  const needsCtrl = parts.includes('Ctrl') || parts.includes('Cmd') || parts.includes('Meta');
  const needsAlt = parts.includes('Alt');
  const needsShift = parts.includes('Shift');
  const hasCtrl = e.ctrlKey || e.metaKey;
  if (needsCtrl !== hasCtrl || needsAlt !== e.altKey || needsShift !== e.shiftKey) return false;
  if (key === 'Space') return e.code === 'Space';
  if (e.key.length === 1) return e.key.toUpperCase() === key.toUpperCase();
  return e.key === key;
}
