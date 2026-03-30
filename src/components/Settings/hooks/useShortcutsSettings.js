export function useShortcutsSettings(updateSetting) {
  const handleShortcutChange = (key) => (v) => updateSetting(`shortcuts.${key}`, [v]);

  return { handleShortcutChange };
}
