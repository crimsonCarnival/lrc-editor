import { useTranslation } from 'react-i18next';

export default function EditorToolbar({
  editorMode,
  setEditorMode,
  updateSetting,
  syncMode,
  undo,
  redo,
  canUndo,
  canRedo,
  lines,
  setSelectedLines,
  handleClearTimestamps,
  requestConfirm,
  setLines,
  setRawText,
  setSyncMode
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-zinc-400">
          {t('editor')}
        </h2>
        {/* LRC / SRT mode toggle */}
        <div className="flex items-center bg-zinc-800/80 rounded-lg border border-zinc-700/60 overflow-hidden">
          <button
            onClick={() => {
              setEditorMode('lrc');
              updateSetting('export.copyFormat', 'lrc');
              updateSetting('export.downloadFormat', 'lrc');
            }}
            className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${editorMode === 'lrc'
              ? 'bg-primary text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            {t('editorModeLRC')}
          </button>
          <button
            onClick={() => {
              setEditorMode('srt');
              updateSetting('export.copyFormat', 'srt');
              updateSetting('export.downloadFormat', 'srt');
            }}
            className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${editorMode === 'srt'
              ? 'bg-primary text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            {t('editorModeSRT')}
          </button>
        </div>
      </div>
      {syncMode && (
        <div className="flex items-center justify-end gap-1 sm:gap-2 w-full">
          <button
            id="undo-btn"
            onClick={undo}
            disabled={!canUndo}
            className="p-1 sm:p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            title={t('undoTitle')}
          >
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
            </svg>
          </button>
          <button
            id="redo-btn"
            onClick={redo}
            disabled={!canRedo}
            className="p-1 sm:p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            title={t('redoTitle')}
          >
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
            </svg>
          </button>
          <div className="w-px h-4 bg-zinc-800 hidden sm:block mx-1" />
          <button
            id="select-all-btn"
            onClick={() => setSelectedLines(new Set(lines.map((_, i) => i)))}
            className="p-1 sm:p-1.5 hover:bg-primary/20 rounded-lg text-zinc-400 hover:text-primary transition-colors cursor-pointer flex-shrink-0"
            title={t('selectAll')}
          >
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </button>
          <button
            id="clear-timestamps-btn"
            onClick={handleClearTimestamps}
            className="p-1 sm:p-1.5 hover:bg-orange-500/10 rounded-lg text-orange-400 hover:text-orange-300 transition-colors cursor-pointer flex-shrink-0"
            title={t('clearTimestamps')}
          >
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-px h-4 bg-zinc-800 hidden sm:block mx-1" />
          <button
            onClick={() => {
              requestConfirm(t('confirmRemoveAll'), () => {
                setLines([]);
                setRawText('');
                setSyncMode(false);
              });
            }}
            className="p-1 sm:p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors cursor-pointer flex-shrink-0"
            title={t('removeAllLyrics')}
          >
            <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
