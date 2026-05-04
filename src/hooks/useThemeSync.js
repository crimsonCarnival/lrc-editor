import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../contexts/useSettings';

export function useThemeSync() {
  const { settings, updateSetting } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Sync Settings -> DOM
  // This effect solely controls the DOM classes based on the current setting.
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateDOM = () => {
      const activeTheme = settings.interface?.theme || 'dark';
      root.classList.remove('dark', 'theme-dracula', 'theme-alucard', 'theme-alucardlight');

      if (activeTheme === 'light') {
        // no classes needed
      } else if (activeTheme === 'dracula') {
        root.classList.add('dark', 'theme-dracula');
      } else if (activeTheme === 'alucard') {
        root.classList.add('dark', 'theme-alucard');
      } else if (activeTheme === 'alucardlight') {
        root.classList.add('theme-alucardlight'); // light — no dark class
      } else if (activeTheme === 'system') {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        }
      } else {
        root.classList.add('dark');
      }
    };

    updateDOM();
    mediaQuery.addEventListener('change', updateDOM);
    return () => mediaQuery.removeEventListener('change', updateDOM);
  }, [settings.interface?.theme]); // Removed searchParams dependency to decouple DOM from URL directly

  // 2. Sync Settings -> URL
  // When the theme setting changes internally, update the URL silently
  useEffect(() => {
    setSearchParams(prev => {
      const activeTheme = settings.interface?.theme;
      if (!activeTheme) return prev;
      
      const newParams = new URLSearchParams(prev);
      if (newParams.get('theme') !== activeTheme) {
        newParams.set('theme', activeTheme);
        return newParams;
      }
      return prev;
    }, { replace: true });
  }, [settings.interface?.theme, setSearchParams]);

  // 3. Sync URL -> Settings (Mount Only)
  // Support deep-linking by checking the URL only once when the app loads
  useEffect(() => {
    const themeParam = searchParams.get('theme');
    if (themeParam && settings.interface?.theme !== themeParam) {
      updateSetting('interface.theme', themeParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
