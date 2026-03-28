import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lrc-syncer-settings';

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

  // Advanced
  autoSaveEnabled: true,
  autoSaveInterval: 1000,
  confirmDestructive: false,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings added after initial save
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return { ...DEFAULT_SETTINGS };
  });

  // Persist to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateAllSettings = useCallback((newSettings) => {
    setSettings(newSettings);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateAllSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
