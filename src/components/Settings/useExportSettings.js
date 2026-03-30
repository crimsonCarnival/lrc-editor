export function useExportSettings(updateSetting) {
  const handleLineEndingsChange = (e) => updateSetting('export.lineEndings', e.target.value);

  const handleCopyFormatChange = (e) => updateSetting('export.copyFormat', e.target.value);

  const handleDownloadFormatChange = (e) =>
    updateSetting('export.downloadFormat', e.target.value);

  const handleTimestampPrecisionChange = (e) =>
    updateSetting('export.timestampPrecision', e.target.value);

  const handleFilenamePatternChange = (e) =>
    updateSetting('export.defaultFilenamePattern', e.target.value);

  return {
    handleLineEndingsChange,
    handleCopyFormatChange,
    handleDownloadFormatChange,
    handleTimestampPrecisionChange,
    handleFilenamePatternChange,
  };
}
