import { lazy, Suspense, useEffect, useCallback, useState } from 'react';
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
import { Music2, UploadCloud, Globe, Settings as SettingsIcon, Eye, EyeOff, Lock, LockOpen, LayoutList } from 'lucide-react';
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
  const rawFocusMode = settings.interface?.focusMode || 'default';
  // Normalize: if old 'preview' mode was saved, fall back to 'default'
  const focusMode = ['default', 'sync', 'playback'].includes(rawFocusMode) ? rawFocusMode : 'default';
  const [hideEditor, setHideEditor] = useState(false);

  // Mobile tab state: 'editor' | 'preview'
  const [mobileTab, setMobileTab] = useState('editor');

  const setFocusMode = useCallback((mode) => {
    updateSetting('interface.focusMode', mode);
  }, [updateSetting]);

  // Cycle: default → sync → playback → default
  const cycleFocusMode = useCallback(() => {
    const modes = ['default', 'sync', 'playback'];
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
        if (focusMode === 'playback') {
          setFocusMode('default');
          setHideEditor(false);
        } else {
          setHideEditor(h => !h);
        }
      } else if (matchKey(e, settings.shortcuts?.focusPlayback?.[0] || 'Ctrl+3')) {
        e.preventDefault();
        setFocusMode(focusMode === 'playback' ? 'default' : 'playback');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.shortcuts, focusMode, setFocusMode]);

  // Grid column classes per focus mode
  const editorColClass = ({
    default: 'lg:col-span-7',
    sync: 'lg:col-span-8',
    playback: 'hidden',
  }[focusMode]) || 'lg:col-span-7';

  const previewColClass = (hideEditor || focusMode === 'playback')
    ? 'lg:col-span-12'
    : ({ default: 'lg:col-span-5', sync: 'lg:col-span-4' }[focusMode] || 'lg:col-span-5');

  const showEditor = focusMode !== 'playback' && !hideEditor;
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
          {/* Hide Editor Toggle — desktop only */}
          <Button
            variant="outline"
            onClick={() => {
              if (focusMode === 'playback') {
                setFocusMode('default');
                setHideEditor(false);
              } else {
                setHideEditor(h => !h);
              }
            }}
            className={`hidden lg:flex px-2 py-1.5 h-auto text-[10px] font-bold border rounded-lg gap-1 flex-shrink-0 transition-colors ${
              (hideEditor || focusMode === 'playback')
                ? 'bg-primary text-zinc-950 border-primary hover:bg-primary/90 hover:text-zinc-950'
                : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            }`}
            title={`${t('app.hideEditor')} (Ctrl+2)`}
          >
            {(hideEditor || focusMode === 'playback') ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span className="hidden xl:inline">{t('app.hideEditor')}</span>
          </Button>

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

      <div className="relative z-raised max-w-7xl mx-auto w-full flex-1 min-h-0 px-2 sm:px-4 lg:px-6 max-lg:pb-[144px] lg:pb-4 flex flex-col">
        {/* Main content grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 min-h-0 lg:overflow-hidden max-lg:overflow-visible transition-all duration-300">
          {/* Left: Editor */}
          {showEditor && (
            <div className={`${editorColClass} relative flex flex-col gap-2 sm:gap-3 lg:gap-4 min-h-0 max-lg:h-full transition-all duration-300 ${mobileTab !== 'editor' ? 'max-lg:hidden' : ''}`}>
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
                <Suspense fallback={
                  <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col gap-3 h-full animate-fade-in">
                    <div className="skeleton h-8 rounded-lg w-3/4" />
                    <div className="skeleton h-8 rounded-lg w-full" />
                    <div className="skeleton h-8 rounded-lg w-5/6" />
                    <div className="skeleton h-8 rounded-lg w-2/3" />
                    <div className="skeleton h-8 rounded-lg w-4/5" />
                  </div>
                }>
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
                  compact={false}
                />
                </Suspense>
              </div>
            </div>
          )}

          {/* Right: Preview */}
          {showPreview && (
            <div className={`flex ${previewColClass} min-h-0 flex-col max-lg:h-full max-lg:mt-0 lg:mt-0 transition-all duration-300 ${mobileTab !== 'preview' ? 'max-lg:hidden' : ''}`}>
              <Suspense fallback={
                <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col gap-3 h-full animate-fade-in">
                  <div className="skeleton h-6 rounded-lg w-1/4 mb-2" />
                  <div className="skeleton h-10 rounded-lg w-full" />
                  <div className="skeleton h-8 rounded-lg w-3/4" />
                  <div className="skeleton h-10 rounded-lg w-5/6" />
                  <div className="skeleton h-7 rounded-lg w-2/3" />
                </div>
              }>
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
              </Suspense>
            </div>
          )}
        </div>
      </div>

      {/* ── Player (one instance) ──
          Desktop: docked bottom bar.
          Mobile:  fixed compact bar above the tab bar — compact layout
                   shows seekbar + finger-friendly action row. ── */}
      <div className="lg:relative lg:z-raised lg:w-full lg:border-t lg:border-zinc-700/50 lg:bg-zinc-900/80 lg:backdrop-blur-md lg:shadow-[0_-4px_24px_rgba(0,0,0,0.3)] max-lg:fixed max-lg:inset-x-0 max-lg:bottom-14 max-lg:z-30">
        <div className="max-w-7xl mx-auto max-lg:p-0 lg:px-6 lg:py-3">
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
            syncMode={syncMode}
          />
        </div>
      </div>

      {/* ── Mobile: Bottom tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-700/50 flex items-stretch pb-safe">
        {[
          { id: 'editor',  label: t('app.tab.editor', 'Editor'),  Icon: LayoutList },
          { id: 'preview', label: t('app.tab.preview', 'Preview'), Icon: Eye },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
              mobileTab === id
                ? 'text-primary'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            aria-label={label}
            aria-current={mobileTab === id ? 'page' : undefined}
          >
            <Icon className="w-5 h-5" strokeWidth={mobileTab === id ? 2.5 : 1.8} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

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
