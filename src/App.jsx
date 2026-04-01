import { lazy, Suspense } from 'react';
import Player from './components/Player';
import { SettingsProvider } from './contexts/SettingsContext';

const Editor = lazy(() => import('./components/Editor'));
const Preview = lazy(() => import('./components/Preview'));
import { useAppState } from './hooks/useAppState';
import { Kbd } from './components/shared/Kbd';
import { Button } from './components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';
import { Music2, UploadCloud, Globe, Settings as SettingsIcon } from 'lucide-react';
import { useScrollLock } from './hooks/useScrollLock';

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
    hasMedia,
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
    handleRestoreSession,
    handleDiscardSession,
    handleMediaChange,
    handleTimeUpdate,
    handleDurationChange,
    confirmModal,
    isAutosaving,
  } = useAppState();

  useScrollLock(!!pendingSession);

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
            <UploadCloud className="w-20 h-20" strokeWidth={1.5} />
            <h2 className="text-3xl font-bold tracking-tight text-center px-4">{t('player.dropAudio') || 'Drop your audio or lyrics file here'}</h2>
          </div>
        </div>
      )}


      <header className="relative z-50 flex flex-row items-center justify-between gap-2 w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-5 animate-fade-in">
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

      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 min-h-0 px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 flex flex-col">
        {/* 3-Column layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 lg:gap-4 min-h-0 lg:overflow-hidden max-lg:overflow-visible">
          {/* Left: Player + Editor */}
          <div className="lg:col-span-6 flex flex-col gap-2 sm:gap-3 lg:gap-4 min-h-0 max-lg:h-[85vh]">
            <Player
              ref={playerRef}
              mediaTitle={mediaTitle}
              onTitleChange={setMediaTitle}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onMediaChange={handleMediaChange}
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
                  <Music2 className="w-10 h-10 text-zinc-700 mb-3" strokeWidth={1.5} />
                  <p className="text-sm text-zinc-500 text-center whitespace-pre-line">{t('player.noMedia')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex lg:col-span-6 min-h-0 flex-col max-lg:h-[85vh] max-lg:mt-4">
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
      </div>
      <Suspense fallback={null}>
        {showKeyboardHelp && <KeyboardHelp isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />}
      </Suspense>
      <Suspense fallback={null}>
        {showSettings && <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} onManualSave={handleManualSave} />}
      </Suspense>

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
              <h3 className="text-lg font-bold text-zinc-100">{t('session.restoreTitle')}</h3>
            </div>
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
