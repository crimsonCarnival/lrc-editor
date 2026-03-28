import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Player from './components/Player';
import Editor from './components/Editor';
import Preview from './components/Preview';
import { compileLRC, compileSRT, downloadLRC } from './utils/lrc';
import useHistory from './utils/useHistory';
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





  const playerRef = useRef(null);

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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

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


      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 h-full flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-6 animate-fade-in relative z-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                {t('appName')}
              </h1>
              <p className="text-xs text-zinc-500">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={i18n.resolvedLanguage?.split('-')[0] || 'en'}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-primary/50 transition-all cursor-pointer shadow-lg hover:bg-zinc-700"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="ja">日本語</option>
            </select>

            {canExport && (
              <div className="relative">
                <button
                  id="export-btn"
                  onClick={() => setShowExportPanel(!showExportPanel)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dim hover:from-primary-dim hover:to-primary text-zinc-950 font-semibold text-sm rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-primary/20"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t('export')}
                </button>
                {showExportPanel && (
                  <div className="absolute right-0 top-full mt-2 glass rounded-xl p-4 space-y-3 w-72 z-50 animate-fade-in shadow-2xl">
                    <label className="block mb-2">
                      <span className="text-xs text-zinc-400 font-medium">{t('format')}</span>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="mt-1 w-full bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-primary/50 transition-all"
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
                          className="flex-1 bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all w-0"
                        />
                        <span className="text-sm text-zinc-500 min-w-8">.{exportFormat}</span>
                      </div>
                    </label>
                    {/* Include translations checkbox */}
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
                    <button
                      id="export-confirm-btn"
                      onClick={handleExport}
                      className="w-full py-2.5 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-lg transition-all cursor-pointer"
                    >
                      {t('download')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* 3-Column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
          {/* Left: Player + Editor */}
          <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
            <Player
              mediaTitle={mediaTitle}
              onTitleChange={setMediaTitle}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onMediaChange={handleMediaChange}
              playerRef={playerRef}
            />
            <div className="flex-1 min-h-0 flex flex-col">
              {hasMedia ? (
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
          <div className="lg:col-span-7 min-h-0 flex flex-col">
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
    </div>
  );
}
