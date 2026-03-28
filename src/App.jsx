import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Player from './components/Player';
import Editor from './components/Editor';
import Preview from './components/Preview';
import { compileLRC, compileSRT, downloadLRC } from './utils/lrc';
import useHistory from './utils/useHistory';
import KeyboardHelp from './components/KeyboardHelp';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { t, i18n } = useTranslation();
  // Lines state with undo/redo
  const [lines, setLines, undo, redo, canUndo, canRedo] = useHistory([]);

  const [syncMode, setSyncMode] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [exportFilename, setExportFilename] = useState('lyrics');
  const [exportFormat, setExportFormat] = useState('lrc');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [mediaTitle, setMediaTitle] = useState('');
  const [includeTranslations, setIncludeTranslations] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [wasCopied, setWasCopied] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [pendingSession, setPendingSession] = useState(null);





  const playerRef = useRef(null);
  const exportPanelRef = useRef(null);

  // ——— Auto-Save / Session Recovery ———
  useEffect(() => {
    const saved = localStorage.getItem('lrc-syncer-session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lines && parsed.lines.length > 0) {
          setPendingSession(parsed);
        }
      } catch (e) {
        console.error('Failed to parse session data', e);
      }
    }
    setIsRestoring(false);
  }, []);

  useEffect(() => {
    if (isRestoring || !lines.length) return;
    const timeoutId = setTimeout(() => {
      localStorage.setItem('lrc-syncer-session', JSON.stringify({
        lines,
        syncMode,
        activeLineIndex,
        timestamp: Date.now()
      }));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [lines, syncMode, activeLineIndex, isRestoring]);

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
      setLines([]);
      setSyncMode(false);
      setActiveLineIndex(0);
      setPlaybackPosition(0);
      setDuration(0);
      setMediaTitle('');
      setShowExportPanel(false);
    }
  }, [setLines]);

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

  // ——— Close export panel on outside click ———
  useEffect(() => {
    if (!showExportPanel) return;
    const handler = (e) => {
      if (exportPanelRef.current && !exportPanelRef.current.contains(e.target)) {
        setShowExportPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportPanel]);

  const handleTimeUpdate = useCallback((time) => {
    setPlaybackPosition(time);
  }, []);

  const handleDurationChange = useCallback((d) => {
    setDuration(d);
  }, []);

  const handleExport = () => {
    const name = exportFilename.trim() || 'lyrics';
    if (exportFormat === 'srt') {
      const srt = compileSRT(lines, duration);
      downloadLRC(srt, `${name}.srt`);
    } else {
      const lrc = compileLRC(lines, includeTranslations);
      downloadLRC(lrc, `${name}.lrc`);
    }
    setShowExportPanel(false);
  };

  const handleCopy = async () => {
    let content = '';
    if (exportFormat === 'srt') {
      content = compileSRT(lines, duration);
    } else {
      content = compileLRC(lines, includeTranslations);
    }
    try {
      await navigator.clipboard.writeText(content);
      setWasCopied(true);
      setTimeout(() => setWasCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const syncedCount = useMemo(() => lines.filter((l) => l.timestamp != null).length, [lines]);
  const canExport = syncedCount > 0;

  return (
    <div className="h-screen bg-zinc-950 relative overflow-x-hidden">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-accent-purple/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
      </div>


      <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 h-full flex flex-col">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2 mb-4 sm:mb-6 animate-fade-in relative z-50">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 sm:flex-initial">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
              <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight truncate">
                {t('appName')}
              </h1>
              <p className="text-xs text-zinc-500 truncate">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto">
            <select
              value={i18n.resolvedLanguage?.split('-')[0] || 'en'}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-zinc-800/80 border border-zinc-700/60 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer shadow-lg hover:bg-zinc-700"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="ja">日本語</option>
            </select>

            {canExport && (
              <div className="relative flex-1 sm:flex-initial" ref={exportPanelRef}>
                <button
                  id="export-btn"
                  onClick={() => setShowExportPanel(!showExportPanel)}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-primary to-primary-dim hover:from-primary-dim hover:to-primary text-zinc-950 font-semibold text-xs sm:text-sm rounded-lg sm:rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-primary/20"
                >
                  <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline">{t('export')}</span>
                </button>
                {showExportPanel && (
                  <div className="absolute right-0 top-full mt-2 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3 w-64 sm:w-72 z-50 animate-fade-in shadow-2xl bg-zinc-900 border border-zinc-700">
                    <label className="block mb-2">
                      <span className="text-xs text-zinc-400 font-medium">{t('format')}</span>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-primary/50 transition-all"
                      >
                        <option value="lrc">.lrc (Lyrics)</option>
                        <option value="srt">.srt (Subtitles)</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs text-zinc-400 font-medium">{t('filename')}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          id="export-filename-input"
                          type="text"
                          value={exportFilename}
                          onChange={(e) => setExportFilename(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleExport()}
                          placeholder="lyrics"
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all w-0"
                        />
                        <span className="text-sm text-zinc-500 min-w-8">.{exportFormat}</span>
                      </div>
                    </label>

                    {exportFormat === 'lrc' && lines.some(l => l.translation) && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeTranslations}
                          onChange={(e) => setIncludeTranslations(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary/25 accent-primary cursor-pointer"
                        />
                        <span className="text-xs text-zinc-400">{t('includeTranslations')}</span>
                      </label>
                    )}

                    <div className="flex gap-2 w-full mt-2">
                      <button
                        onClick={handleCopy}
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm rounded-lg transition-all cursor-pointer"
                      >
                        {wasCopied ? t('copied') : t('copyToClipboard')}
                      </button>
                      <button
                        id="export-confirm-btn"
                        onClick={handleExport}
                        className="flex-1 py-2.5 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-lg transition-all cursor-pointer"
                      >
                        {t('download')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* 3-Column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 min-h-0 overflow-hidden">
          {/* Left: Player + Editor */}
          <div className="lg:col-span-5 flex flex-col gap-2 sm:gap-3 lg:gap-4 min-h-0">
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
          <div className="hidden lg:flex lg:col-span-7 min-h-0 flex-col">
            <Preview
              lines={lines}
              setLines={setLines}
              playbackPosition={playbackPosition}
              mediaTitle={mediaTitle}
              playerRef={playerRef}
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
