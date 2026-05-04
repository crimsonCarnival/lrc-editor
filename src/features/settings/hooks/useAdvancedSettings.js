export function useAdvancedSettings(updateSetting) {
  const handleAutoSaveToggle = (v) => updateSetting('advanced.autoSave.enabled', v);

  const handleAutoSaveTimeIntervalChange = (e) =>
    updateSetting('advanced.autoSave.timeInterval', parseInt(e.target.value, 10));

  const handleConfirmDestructiveChange = (v) =>
    updateSetting('advanced.confirmDestructive', v);

  const handleTimezoneChange = (e) =>
    updateSetting('advanced.timezone', e.target.value);

  return {
    handleAutoSaveToggle,
    handleAutoSaveTimeIntervalChange,
    handleConfirmDestructiveChange,
    handleTimezoneChange,
  };
}
