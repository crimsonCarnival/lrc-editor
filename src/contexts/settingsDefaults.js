export const DEFAULT_SETTINGS = {
  playback: {
    volume: 1,
    muted: false,
    autoRewindOnPause: { enabled: false, seconds: 2 },
    speedBounds: { min: 0.25, max: 3 },
    showWaveform: true,
    waveformSnap: false,
    loopCurrentLine: false,
    speedPresets: [0.5, 0.75, 1, 1.25, 1.5, 2]
  },
  editor: {
    autoPauseOnMark: false,
    nudge: { fine: 0.01, coarse: 0.1, default: 0.1 },
    autoAdvance: { enabled: true, skipBlank: false, mode: 'next' },
    showShiftAll: true,
    timestampPrecision: 'hundredths',
    srt: {
      defaultSubtitleDuration: 5,
      minSubtitleGap: 0,
      snapToNextLine: false
    },
    history: {
      limit: 50,
      groupingThresholdMs: 1000
    },
    display: {
      activeHighlight: 'glow',
      showNextLine: true,
      dualLine: false
    },
    scroll: {
      mode: 'smooth',
      alignment: 'center'
    }
  },
  export: {
    lineEndings: 'lf',
    copyFormat: 'lrc',
    downloadFormat: 'lrc',
    timestampPrecision: 'hundredths',
    defaultFilenamePattern: 'fixed',
    includeMetadata: true,
    stripEmptyLines: false,
    normalizeTimestamps: false
  },
  interface: {
    theme: 'dark',
    defaultLanguage: 'en',
    fontSize: 'normal',
    spacing: 'normal',
    previewAlignment: 'left'
  },
  shortcuts: {
    mark: ['Space'],
    nudgeLeft: ['ArrowLeft'],
    nudgeRight: ['ArrowRight'],
    nudgeLeftFine: ['Shift+ArrowLeft'],
    nudgeRightFine: ['Shift+ArrowRight'],
    addLine: ['Ctrl+Enter'],
    deleteLine: ['Delete'],
    clearTimestamp: ['Backspace'],
    switchMode: ['Ctrl+m']
  },
  advanced: {
    autoSave: { enabled: false, interval: 3000 },
    confirmDestructive: true
  }
};
