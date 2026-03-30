import { useState, useRef, useCallback, useEffect } from 'react';
import Player from './components/Player';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Settings from './components/Settings';
import useHistory from './utils/useHistory';
import KeyboardHelp from './components/KeyboardHelp';
import { useTranslation } from 'react-i18next';
import { SettingsProvider } from './contexts/SettingsContext';
import { useSettings } from './contexts/useSettings';
import { inferEndTimes, parseLrcSrtFile } from './utils/lrc';

function AppInner() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      if (settings.interface.theme === 'light') {
        root.classList.remove('dark');
      } else if (settings.interface.theme === 'system') {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      } else {
        root.classList.add('dark');
      }
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);

    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [settings.interface.theme]);

  // Lines state with undo/redo
  const [lines, setLines, undo, redo, canUndo, canRedo] = useHistory([], {
    limit: settings.advanced?.history?.limit || 50,
    groupingThresholdMs: settings.advanced?.history?.groupingThresholdMs || 500
  });

  const [syncMode, setSyncMode] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaTitle, setMediaTitle] = useState('');
  const [hasMedia, setHasMedia] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingSession, setPendingSession] = useState(() => {
    try {
      const saved = localStorage.getItem('lrc-syncer-session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lines && parsed.lines.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse session data', e);
    }
    return null;
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [editorMode, setEditorModeRaw] = useState('lrc'); // 'lrc' | 'srt'
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const maxDragDepth = useRef(0);

  const playerRef = useRef(null);
  const langMenuRef = useRef(null);

  const handleManualSave = useCallback(() => {
    localStorage.setItem('lrc-syncer-session', JSON.stringify({
      lines,
      syncMode,
      activeLineIndex,
      timestamp: Date.now()
    }));
  }, [lines, syncMode, activeLineIndex]);

  // Mode switching with end-time inference
  const setEditorMode = useCallback((mode) => {
    if (mode === 'srt' && editorMode !== 'srt') {
      // LRC → SRT: infer missing end times
      setLines(prev => inferEndTimes(prev, duration, settings.editor?.srt));
    }
    setEditorModeRaw(mode);
  }, [editorMode, duration, setLines, settings.editor?.srt]);

  useEffect(() => {
    if (pendingSession !== null || !lines.length || !settings.advanced.autoSave.enabled) return;
    const timeoutId = setTimeout(() => {
      localStorage.setItem('lrc-syncer-session', JSON.stringify({
        lines,
        syncMode,
        activeLineIndex,
        timestamp: Date.now()
      }));
    }, settings.advanced.autoSave.interval);
    return () => clearTimeout(timeoutId);
  }, [lines, syncMode, activeLineIndex, pendingSession, settings.advanced.autoSave.enabled, settings.advanced.autoSave.interval]);

  const handleRestoreSession = () => {
    if (pendingSession) {
      setLines(pendingSession.lines);
      if (pendingSession.syncMode) setSyncMode(pendingSession.syncMode);
      if (pendingSession.activeLineIndex != null) setActiveLineIndex(pendingSession.activeLineIndex);
    }
    setPendingSession(null);
  };

  const handleDiscardSession = () => {
    localStorage.removeItem('lrc-syncer-session');
    setPendingSession(null);
  };

  // ——— Clear all data when media is removed ———
  const handleMediaChange = useCallback((loaded) => {
    setHasMedia(loaded);
    if (!loaded) {
      if (settings.advanced.confirmDestructive) {
        // No confirm needed when media is simply removed — data is auto-saved
      }
      setLines([]);
      setSyncMode(false);
      setActiveLineIndex(0);
      setPlaybackPosition(0);
      setDuration(0);
      setMediaTitle('');
    }
  }, [setLines, settings.advanced.confirmDestructive]);

  // ——— Global Undo/Redo keyboard shortcut ———
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === '?') {
        setShowKeyboardHelp((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);



  // ——— Close language menu on outside click ———
  useEffect(() => {
    if (!showLangMenu) return;
    const handler = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLangMenu]);

  const handleTimeUpdate = useCallback((time) => {
    setPlaybackPosition(time);
  }, []);

  const handleDurationChange = useCallback((d) => {
    setDuration(d);
  }, []);

  // Loop Current Line logic
  useEffect(() => {
    if (!settings.playback?.loopCurrentLine || !syncMode || !lines[activeLineIndex] || lines[activeLineIndex].timestamp == null) return;
    
    const currentLine = lines[activeLineIndex];
    let endMark = currentLine.endTime;

    if (editorMode !== 'srt' || endMark == null) {
      const nextLine = lines.slice(activeLineIndex + 1).find(l => l.timestamp != null);
      if (nextLine) endMark = nextLine.timestamp;
    }

    if (endMark != null && playbackPosition >= endMark) {
      playerRef.current?.seek(currentLine.timestamp);
    }
  }, [playbackPosition, settings.playback?.loopCurrentLine, syncMode, lines, activeLineIndex, editorMode]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    maxDragDepth.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    maxDragDepth.current -= 1;
    if (maxDragDepth.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    maxDragDepth.current = 0;
    setIsDraggingFile(false);
    
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    if (file.type.startsWith('audio/')) {
      if (playerRef.current?.loadLocalAudio) {
        playerRef.current.loadLocalAudio(file);
      }
      return;
    }

    const extension = file.name.split('.').pop().toLowerCase();
    
    if (['lrc', 'srt', 'txt'].includes(extension)) {
      try {
        const text = await file.text();
        const parsedLines = parseLrcSrtFile(text, file.name);
        
        if (lines.length > 0 && settings.advanced.confirmDestructive) {
          if (!window.confirm(t('confirmRemoveAll') || 'Replace existing lyrics?')) {
            return;
          }
        }
        
        setLines(parsedLines);
        setEditorModeRaw(extension === 'srt' ? 'srt' : 'lrc');
      } catch (err) {
        console.error('Failed to parse dropped lyrics file', err);
      }
    }
  }, [lines.length, setLines, settings.advanced.confirmDestructive, t]);

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div className="min-h-screen lg:h-screen bg-zinc-950 relative overflow-x-hidden flex flex-col">
      {/* Background gradient blobs and noise texture */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-accent-purple/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
      </div>

      {isDraggingFile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none transition-all">
          <div className="flex flex-col items-center gap-4 text-primary animate-bounce">
            <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2 className="text-3xl font-bold tracking-tight text-center px-4">{t('dropAudio') || 'Drop your audio or lyrics file here'}</h2>
          </div>
        </div>
      )}


      <header className="relative z-50 flex flex-row items-center justify-between gap-2 w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5 animate-fade-in">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight truncate">
                {t('appName')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-8 sm:h-9 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 rounded-lg sm:rounded-xl shadow-lg transition-all cursor-pointer text-zinc-200 focus:outline-none flex-shrink-0"
                title={t('settingsLanguageDesc') || 'Language'}
              >
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold uppercase">{i18n.resolvedLanguage?.split('-')[0] || 'en'}</span>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 top-full mt-2 w-28 bg-zinc-900 border border-zinc-700/80 rounded-lg sm:rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in flex flex-col items-stretch">
                  {[
                    { code: 'en', label: 'EN' },
                    { code: 'es', label: 'ES' }
                  ].map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      className={`px-3 py-2 text-xs font-semibold text-center transition-colors flex items-center justify-center cursor-pointer outline-none ${
                        (i18n.resolvedLanguage?.split('-')[0] === lang.code)
                          ? 'bg-zinc-800/60 text-primary'
                          : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(true)}
              className="px-2 sm:px-3 h-8 sm:h-9 flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all cursor-pointer shadow-lg flex-shrink-0"
              title={t('settingsTitle')}
            >
              <svg className="w-4 sm:w-4.5 h-4 sm:h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline text-xs font-semibold">{t('settingsTitle')}</span>
            </button>

            {/* Help button */}
            <button
              onClick={() => setShowKeyboardHelp(prev => !prev)}
              className="px-2 sm:px-3 h-8 sm:h-9 flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all cursor-pointer shadow-lg flex-shrink-0"
              title={t('keyboardShortcuts') || 'Shortcuts'}
            >
              <kbd className="text-xs font-mono font-bold">?</kbd>
              <span className="hidden sm:inline text-xs font-semibold">{t('keyboardShortcuts') || 'Help'}</span>
            </button>


          </div>
        </header>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 min-h-0 px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 flex flex-col">
        {/* 3-Column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 min-h-0 lg:overflow-hidden max-lg:overflow-visible">
          {/* Left: Player + Editor */}
          <div className="lg:col-span-5 flex flex-col gap-2 sm:gap-3 lg:gap-4 min-h-0 max-lg:h-[85vh]">
            <Player
              mediaTitle={mediaTitle}
              onTitleChange={setMediaTitle}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onMediaChange={handleMediaChange}
              playerRef={playerRef}
            />
            <div className="flex-1 min-h-0 flex flex-col">
              {(hasMedia || lines.length > 0) ? (
                <Editor
                  lines={lines}
                  setLines={setLines}
                  syncMode={syncMode}
                  setSyncMode={setSyncMode}
                  activeLineIndex={activeLineIndex}
                  setActiveLineIndex={setActiveLineIndex}
                  playbackPosition={playbackPosition}
                  playerRef={playerRef}
                  undo={undo}
                  redo={redo}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  editorMode={editorMode}
                  setEditorMode={setEditorMode}
                  duration={duration}
                />
              ) : (
                <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center h-full animate-fade-in">
                  <svg className="w-10 h-10 text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                  <p className="text-sm text-zinc-500 text-center whitespace-pre-line">{t('noMediaText')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex lg:col-span-7 min-h-0 flex-col max-lg:h-[85vh] max-lg:mt-4">
            <Preview
              lines={lines}
              setLines={setLines}
              playbackPosition={playbackPosition}
              mediaTitle={mediaTitle}
              playerRef={playerRef}
              duration={duration}
              editorMode={editorMode}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-3 pt-3 border-t border-zinc-800/50 text-center shrink-0">
          <p className="text-xs text-zinc-600">
            {t('footerText')}
          </p>
        </footer>
      </div>
      <KeyboardHelp isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} onManualSave={handleManualSave} />

      {/* Session Restore Modal */}
      {pendingSession && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDiscardSession} />
          <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-100">{t('sessionRestoreTitle')}</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-2 leading-relaxed">{t('sessionRestoreMessage')}</p>
            <p className="text-xs text-zinc-500 mb-5">
              {pendingSession.lines?.length || 0} {t('sessionRestoreLines')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDiscardSession}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                {t('sessionDiscard')}
              </button>
              <button
                onClick={handleRestoreSession}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl transition-all cursor-pointer"
              >
                {t('sessionRestore')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppInner />
    </SettingsProvider>
  );
}
