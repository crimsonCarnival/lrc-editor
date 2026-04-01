import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_SETTINGS } from './settingsDefaults.js';
import { SettingsContext } from './SettingsContextValue.js';

const STORAGE_KEY = 'lrc-syncer-settings';

function deepMerge(target, source) {
  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return target;
  
  const output = { ...target };
  Object.keys(source).forEach(key => {
    if (source[key] instanceof Array) {
      output[key] = source[key]; // Arrays overwrite
    } else if (typeof source[key] === 'object' && source[key] !== null) {
      output[key] = deepMerge(target[key], source[key]);
    } else {
      output[key] = source[key];
    }
  });
  return output;
}

function upgradeLegacySettings(parsed) {
  // If we already have the nested 'playback' object, it's likely migrated.
  if (parsed.playback && typeof parsed.playback === 'object') {
    return parsed;
  }
  
  // Create a base config using defaults
  const migrated = structuredClone(DEFAULT_SETTINGS);
  
  // Playback
  if (parsed.defaultVolume !== undefined) migrated.playback.volume = parsed.defaultVolume;
  if (parsed.volume !== undefined) migrated.playback.volume = parsed.volume;
  if (parsed.muted !== undefined) migrated.playback.muted = parsed.muted;
  if (parsed.autoRewindOnPause !== undefined) {
    migrated.playback.autoRewindOnPause = { enabled: parsed.autoRewindOnPause > 0, seconds: parsed.autoRewindOnPause };
  }
  if (parsed.minSpeed !== undefined) migrated.playback.speedBounds.min = parsed.minSpeed;
  if (parsed.maxSpeed !== undefined) migrated.playback.speedBounds.max = parsed.maxSpeed;
  if (parsed.showWaveform !== undefined) migrated.playback.showWaveform = parsed.showWaveform;

  // Editor
  if (parsed.autoPauseOnMark !== undefined) migrated.editor.autoPauseOnMark = parsed.autoPauseOnMark;
  if (parsed.nudgeIncrement !== undefined) {
    migrated.editor.nudge.default = parsed.nudgeIncrement;
    migrated.editor.nudge.coarse = parsed.nudgeIncrement;
  }
  if (parsed.autoAdvance !== undefined) migrated.editor.autoAdvance.enabled = parsed.autoAdvance;
  if (parsed.skipBlankLines !== undefined) migrated.editor.autoAdvance.skipBlank = parsed.skipBlankLines;
  if (parsed.showShiftAll !== undefined) migrated.editor.showShiftAll = parsed.showShiftAll;
  if (parsed.editorTimestampPrecision !== undefined) migrated.editor.timestampPrecision = parsed.editorTimestampPrecision;
  if (parsed.activeLineHighlight !== undefined) migrated.editor.display.activeHighlight = parsed.activeLineHighlight;
  if (parsed.scrollBehavior !== undefined) migrated.editor.scroll.mode = parsed.scrollBehavior;
  if (parsed.scrollBlock !== undefined) migrated.editor.scroll.alignment = parsed.scrollBlock;

  // Export
  if (parsed.lineEndings !== undefined) migrated.export.lineEndings = parsed.lineEndings;
  if (parsed.copyFormat !== undefined) migrated.export.copyFormat = parsed.copyFormat;
  if (parsed.downloadFormat !== undefined) migrated.export.downloadFormat = parsed.downloadFormat;
  if (parsed.timestampPrecision !== undefined) migrated.export.timestampPrecision = parsed.timestampPrecision;
  if (parsed.defaultFilenamePattern !== undefined) migrated.export.defaultFilenamePattern = parsed.defaultFilenamePattern;

  // Interface
  if (parsed.theme !== undefined) migrated.interface.theme = parsed.theme;
  if (parsed.defaultLanguage !== undefined) migrated.interface.defaultLanguage = parsed.defaultLanguage;
  if (parsed.fontSize !== undefined) migrated.interface.fontSize = parsed.fontSize;
  if (parsed.spacing !== undefined) migrated.interface.spacing = parsed.spacing;
  if (parsed.previewAlignment !== undefined) migrated.interface.previewAlignment = parsed.previewAlignment;

  // Shortcuts
  if (parsed.shortcutMark) migrated.shortcuts.mark = [parsed.shortcutMark];
  if (parsed.shortcutNudgeLeft) migrated.shortcuts.nudgeLeft = [parsed.shortcutNudgeLeft];
  if (parsed.shortcutNudgeRight) migrated.shortcuts.nudgeRight = [parsed.shortcutNudgeRight];
  if (parsed.shortcutAddLine) migrated.shortcuts.addLine = [parsed.shortcutAddLine];
  if (parsed.shortcutDeleteLine) migrated.shortcuts.deleteLine = [parsed.shortcutDeleteLine];
  if (parsed.shortcutClearTimestamp) migrated.shortcuts.clearTimestamp = [parsed.shortcutClearTimestamp];
  if (parsed.shortcutSwitchMode) migrated.shortcuts.switchMode = [parsed.shortcutSwitchMode];

  // Advanced
  if (parsed.autoSaveEnabled !== undefined) migrated.advanced.autoSave.enabled = parsed.autoSaveEnabled;
  if (parsed.autoSaveInterval !== undefined) migrated.advanced.autoSave.interval = parsed.autoSaveInterval;
  if (parsed.confirmDestructive !== undefined) migrated.advanced.confirmDestructive = parsed.confirmDestructive;

  return migrated;
}

// Migrate stored shortcut defaults that changed across versions.
// Only rewrites values that exactly match the old default — custom bindings are preserved.
const SHORTCUT_RENAMES = [
  { key: 'nudgeLeft',    from: 'ArrowLeft',      to: 'Alt+ArrowLeft' },
  { key: 'nudgeRight',   from: 'ArrowRight',     to: 'Alt+ArrowRight' },
  { key: 'seekBackward', from: 'Alt+ArrowLeft',  to: 'ArrowLeft' },
  { key: 'seekForward',  from: 'Alt+ArrowRight', to: 'ArrowRight' },
];

function migrateShortcutDefaults(settings) {
  let changed = false;
  const shortcuts = { ...settings.shortcuts };
  for (const { key, from, to } of SHORTCUT_RENAMES) {
    if (shortcuts[key]?.[0] === from) {
      shortcuts[key] = [to];
      changed = true;
    }
  }
  return changed ? { ...settings, shortcuts } : settings;
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const migrated = upgradeLegacySettings(parsed);
        return migrateShortcutDefaults(deepMerge(DEFAULT_SETTINGS, migrated));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return structuredClone(DEFAULT_SETTINGS);
  });

  // Debounced localStorage persistence to avoid excessive writes during rapid changes (e.g. volume slider)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.error('Failed to save settings', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [settings]);

  const updateSetting = useCallback((keyPath, value) => {
    setSettings((prev) => {
      const keys = keyPath.split('.');
      const nextSettings = structuredClone(prev);
      let current = nextSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return nextSettings;
    });
  }, []);

  const updateAllSettings = useCallback((newSettings) => {
    setSettings(newSettings);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(structuredClone(DEFAULT_SETTINGS));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateAllSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
