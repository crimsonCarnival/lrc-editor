import { lazy, Suspense, useEffect, useCallback } from 'react';
import Player from './components/Player';
import { SettingsProvider } from './contexts/SettingsContext';

const Editor = lazy(() => import('./components/Editor'));
const Preview = lazy(() => import('./components/Preview'));
import { useAppState } from './hooks/useAppState';
import { useSettings } from './contexts/useSettings';
import { matchKey } from './utils/keyboard';
import { Kbd } from './components/shared/Kbd';
import { Button } from './components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from './components/ui/toggle-group';
import { Music2, UploadCloud, Globe, Settings as SettingsIcon, Share2, Pencil, Eye, Play, Lock, LockOpen } from 'lucide-react';
import { useScrollLock } from './hooks/useScrollLock';
import { useNetworkStatus } from './hooks/useNetworkStatus';

const Settings = lazy(() => import('./components/Settings'));
const KeyboardHelp = lazy(() => import('./components/shared/KeyboardHelp'));

function AppInner() {
  const {
    t,
    i18n,
    lines,
    setLines,
    undo,
    redo,
    canUndo,
    canRedo,
    syncMode,
    setSyncMode,
    activeLineIndex,
    setActiveLineIndex,
    playbackPosition,
    duration,
    mediaTitle,
    setMediaTitle,
    showKeyboardHelp,
    setShowKeyboardHelp,
    showSettings,
    setShowSettings,
    pendingSession,
    editorMode,
    setEditorMode,
    isDraggingFile,
    playerRef,
    handleManualSave,
    triggerImportSave,
    handleRestoreSession,
    handleDiscardSession,
    handleMediaChange,
    handleTimeUpdate,
    handleDurationChange,
    handleYtUrlChange,
    restoredYtUrl,
    restoredPosition,
    restoredSpeed,
    confirmModal,
    isAutosaving,
    exportToUrl,
    isSharedSession,
    sharedReadOnly,
    setSharedReadOnly,
    shareModal,
    setShareModal,
  } = useAppState();

  useScrollLock(!!pendingSession);
  useNetworkStatus();

  const { settings, updateSetting } = useSettings();
  const focusMode = settings.interface?.focusMode || 'default';

  const setFocusMode = useCallback((mode) => {
    updateSetting('interface.focusMode', mode);
  }, [updateSetting]);

  // Cycle: default → sync → preview → playback → default
  const cycleFocusMode = useCallback(() => {
    const modes = ['default', 'sync', 'preview', 'playback'];
    const idx = modes.indexOf(focusMode);
    setFocusMode(modes[(idx + 1) % modes.length]);
  }, [focusMode, setFocusMode]);

  // Focus mode keyboard shortcuts (Ctrl+1/2/3, Ctrl+0 = default)
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (matchKey(e, settings.shortcuts?.focusSync?.[0] || 'Ctrl+1')) {
        e.preventDefault();
        setFocusMode(focusMode === 'sync' ? 'default' : 'sync');
      } else if (matchKey(e, settings.shortcuts?.focusPreview?.[0] || 'Ctrl+2')) {
        e.preventDefault();
        setFocusMode(focusMode === 'preview' ? 'default' : 'preview');
      } else if (matchKey(e, settings.shortcuts?.focusPlayback?.[0] || 'Ctrl+3')) {
        e.preventDefault();
        setFocusMode(focusMode === 'playback' ? 'default' : 'playback');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.shortcuts, focusMode, setFocusMode]);

  // Grid column classes per focus mode
  const editorColClass = {
    default: 'lg:col-span-7',
    sync: 'lg:col-span-8',
    preview: 'lg:col-span-6',
    playback: 'hidden',
  }[focusMode];

  const previewColClass = {
    default: 'lg:col-span-5',
    sync: 'lg:col-span-4',
    preview: 'lg:col-span-6',
    playback: 'lg:col-span-12',
  }[focusMode];

  const showEditor = focusMode !== 'playback';
  const showPreview = true; // always visible

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
        <div className="fixed inset-0 z-overlay flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none transition-all">
          <div className="flex flex-col items-center gap-4 text-primary animate-bounce">
            <UploadCloud className="w-20 h-20" />
            <h2 className="text-3xl font-bold tracking-tight text-center px-4">{t('player.dropAudio') || 'Drop your audio or lyrics file here'}</h2>
          </div>
        </div>
      )}


      <header className="relative z-sticky flex flex-row items-center justify-between gap-2 w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5 animate-fade-in">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
            <Music2 className="w-4 sm:w-5 h-4 sm:h-5 text-white" strokeWidth={2} />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight truncate">
              {t('app.name')}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Focus Mode Toggle */}
          <ToggleGroup
            type="single"
            value={focusMode}
            onValueChange={(val) => val && setFocusMode(val)}
            className="flex bg-zinc-800/80 rounded-lg border border-zinc-700/60 overflow-hidden h-auto p-0 gap-0"
          >
            <ToggleGroupItem
              value="sync"
              className="px-2 py-1.5 text-[10px] font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto gap-1"
              title={`${t('app.focusMode.sync')} (Ctrl+1)`}
            >
              <Pencil className="w-3 h-3" />
              <span className="hidden xl:inline">{t('app.focusMode.sync')}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="preview"
              className="px-2 py-1.5 text-[10px] font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto gap-1"
              title={`${t('app.focusMode.preview')} (Ctrl+2)`}
            >
              <Eye className="w-3 h-3" />
              <span className="hidden xl:inline">{t('app.focusMode.preview')}</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="playback"
              className="px-2 py-1.5 text-[10px] font-bold rounded-none border-0 data-[state=on]:bg-primary data-[state=on]:text-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-transparent h-auto gap-1"
              title={`${t('app.focusMode.playback')} (Ctrl+3)`}
            >
              <Play className="w-3 h-3" />
              <span className="hidden xl:inline">{t('app.focusMode.playback')}</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-8 sm:h-9 bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700/60 rounded-lg sm:rounded-xl text-zinc-200 flex-shrink-0"
                title={t('settings.interface.languageDesc') || 'Language'}
              >
                <Globe className="w-4 h-4 text-zinc-400" strokeWidth={2} />
                <span className="text-xs font-semibold uppercase">{i18n.resolvedLanguage?.split('-')[0] || 'en'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-28 bg-zinc-900 border-zinc-700/80" align="end">
              {[
                { code: 'en', label: 'EN' },
                { code: 'es', label: 'ES' }
              ].map(lang => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={`text-xs font-semibold text-center justify-center cursor-pointer ${(i18n.resolvedLanguage?.split('-')[0] === lang.code)
                      ? 'bg-zinc-800/60 text-primary focus:bg-zinc-800 focus:text-primary'
                      : 'text-zinc-300 focus:bg-zinc-800/80 focus:text-zinc-100'
                    }`}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings button */}
          <Button
            variant="outline"
            onClick={() => setShowSettings(true)}
            className="px-2 sm:px-3 h-8 sm:h-9 bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg sm:rounded-xl flex-shrink-0"
            title={t('settings.title')}
          >
            <SettingsIcon className="w-4 sm:w-[18px] h-4 sm:h-[18px]" strokeWidth={1.8} />
            <span className="hidden sm:inline text-xs font-semibold">{t('settings.title')}</span>
          </Button>

          {/* Help button */}
          <Button
            variant="outline"
            onClick={() => setShowKeyboardHelp(prev => !prev)}
            className="px-2 sm:px-3 h-8 sm:h-9 bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg sm:rounded-xl flex-shrink-0"
            title={t('shortcuts.title') || 'Shortcuts'}
          >
            <Kbd>?</Kbd>
            <span className="hidden sm:inline text-xs font-semibold">{t('shortcuts.title') || 'Help'}</span>
          </Button>


        </div>
      </header>

      <div className="relative z-raised max-w-7xl mx-auto w-full flex-1 min-h-0 px-2 sm:px-4 lg:px-6 pb-36 lg:pb-4 flex flex-col">
        {/* Main content grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 min-h-0 lg:overflow-hidden max-lg:overflow-visible transition-all duration-300">
          {/* Left: Editor */}
          {showEditor && (
            <div className={`${editorColClass} relative flex flex-col gap-2 sm:gap-3 lg:gap-4 min-h-0 max-lg:h-[85vh] transition-all duration-300`}>
              {isSharedSession && sharedReadOnly && (
                <div className="absolute inset-0 z-10 rounded-xl sm:rounded-2xl backdrop-blur-[3px] bg-zinc-950/60 flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/95 border border-zinc-700/80 rounded-xl shadow-lg">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-zinc-100">{t('session.readOnly')}</span>
                  </div>
                  <p className="text-xs text-zinc-400 text-center px-8 max-w-xs">{t('session.readOnlyDesc')}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSharedReadOnly(false)}
                    className="mt-1 bg-zinc-800 border-zinc-600 text-zinc-100 hover:bg-zinc-700 gap-1.5 text-xs font-semibold"
                  >
                    <LockOpen className="w-3.5 h-3.5" />
                    {t('session.editCopy')}
                  </Button>
                </div>
              )}
              <div className="flex-1 min-h-0 flex flex-col">
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
                  onImport={triggerImportSave}
                  handleManualSave={handleManualSave}
                  isAutosaving={isAutosaving}
                  compact={focusMode === 'preview'}
                />
              </div>
            </div>
          )}

          {/* Right: Preview */}
          {showPreview && (
            <div className={`flex ${previewColClass} min-h-0 flex-col max-lg:h-[85vh] max-lg:mt-4 transition-all duration-300`}>
              <Preview
                lines={lines}
                setLines={setLines}
                playbackPosition={playbackPosition}
                mediaTitle={mediaTitle}
                playerRef={playerRef}
                duration={duration}
                editorMode={editorMode}
                exportToUrl={exportToUrl}
                isSharedSession={isSharedSession}
                sharedReadOnly={sharedReadOnly}
                setSharedReadOnly={setSharedReadOnly}
                shareModal={shareModal}
                setShareModal={setShareModal}
              />
            </div>
          )}
        </div>
      </div>

      {/* Docked Player — persistent bottom bar */}
      <div className="max-lg:fixed max-lg:bottom-0 max-lg:left-0 max-lg:right-0 z-raised w-full border-t border-zinc-700/50 bg-zinc-900/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
          <Player
            ref={playerRef}
            mediaTitle={mediaTitle}
            onTitleChange={setMediaTitle}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onMediaChange={handleMediaChange}
            onYtUrlChange={handleYtUrlChange}
            initialYtUrl={restoredYtUrl}
            initialSeek={restoredPosition}
            initialSpeed={restoredSpeed}
            lines={lines}
            playbackPosition={playbackPosition}
          />
        </div>
      </div>
      <Suspense fallback={null}>
        {showKeyboardHelp && <KeyboardHelp isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />}
      </Suspense>
      <Suspense fallback={null}>
        {showSettings && <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} onManualSave={handleManualSave} />}
      </Suspense>


      {/* Session Restore Modal */}
      {pendingSession && (
        <div className="fixed inset-0 z-popover flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDiscardSession} />
          <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-elevated animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-100">{t('session.restoreTitle')}</h3>
            </div>
            {pendingSession.isUrlSession && (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded-xl">
                <Share2 className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={2} />
                <span className="text-xs text-primary font-medium">{t('session.sharedSession') || 'Shared session from link'}</span>
              </div>
            )}
            <p className="text-sm text-zinc-400 mb-2 leading-relaxed">{t('session.restoreMessage')}</p>
            <p className="text-xs text-zinc-500 mb-5">
              {pendingSession.lines?.length || 0} {t('session.restoreLines')}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDiscardSession}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700 font-semibold text-sm rounded-xl h-10"
              >
                {t('session.discard')}
              </Button>
              <Button
                onClick={handleRestoreSession}
                className="flex-1 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-xl h-10"
              >
                {t('session.restore')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmModal}

      {/* Autosave indicator */}
      {isAutosaving && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-lg animate-fade-in">
          <svg className="w-3.5 h-3.5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
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
