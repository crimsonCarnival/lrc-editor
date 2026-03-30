export function useAdvancedSettings(updateSetting) {
  const handleAutoSaveToggle = (v) => updateSetting('advanced.autoSave.enabled', v);

  const handleAutoSaveIntervalChange = (e) =>
    updateSetting('advanced.autoSave.interval', parseInt(e.target.value, 10));

  const handleConfirmDestructiveChange = (v) =>
    updateSetting('advanced.confirmDestructive', v);

  return {
    handleAutoSaveToggle,
    handleAutoSaveIntervalChange,
    handleConfirmDestructiveChange,
  };
}
