export const DEFAULT_SETTINGS = {
  // Playback
  minSpeed: 0.25,
  maxSpeed: 3,
  showEQ: true,
  showWaveform: true,

  // Editor
  nudgeIncrement: 0.1,
  autoAdvance: true,
  skipBlankLines: false,
  showShiftAll: true,
  editorTimestampPrecision: 'hundredths', // 'hundredths' | 'thousandths'

  // Export
  copyFormat: 'lrc',
  downloadFormat: 'lrc',
  timestampPrecision: 'hundredths', // 'hundredths' | 'thousandths'
  defaultFilenamePattern: 'fixed', // 'fixed' | 'media'

  // Interface
  defaultLanguage: 'en',
  scrollBehavior: 'smooth', // 'smooth' | 'instant'
  scrollBlock: 'center', // 'center' | 'nearest'
  previewAlignment: 'left', // 'left' | 'center' | 'right'
  fontSize: 'normal', // 'small' | 'normal' | 'large' | 'xlarge'
  spacing: 'normal', // 'compact' | 'normal' | 'relaxed'

  // Shortcuts
  shortcutMark: 'Space',
  shortcutNudgeLeft: 'ArrowLeft',
  shortcutNudgeRight: 'ArrowRight',
  shortcutAddLine: 'Ctrl+Enter',
  shortcutDeleteLine: 'Delete',
  shortcutClearTimestamp: 'Backspace',
  shortcutSwitchMode: 'Ctrl+M',

  // Advanced
  autoSaveEnabled: false,
  autoSaveInterval: 1000,
  confirmDestructive: true,
};
