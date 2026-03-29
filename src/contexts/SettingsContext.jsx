import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_SETTINGS } from './settingsDefaults.js';
import { SettingsContext } from './SettingsContextValue.js';

const STORAGE_KEY = 'lrc-syncer-settings';

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
