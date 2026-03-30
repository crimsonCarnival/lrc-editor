import { useTranslation } from 'react-i18next';

export default function SelectionActionBar({
  selectedLines,
  settings,
  handleBulkClearTimestamps,
  handleBulkShift,
  handleBulkDelete,
  clearSelection
}) {
  const { t } = useTranslation();

  if (selectedLines.size === 0) return null;

  return (
    <div className="flex items-center justify-center gap-1 px-2 py-1.5 bg-zinc-900/95 border border-primary/30 rounded-lg shadow-lg animate-fade-in backdrop-blur-md">
      <span className="text-[10px] font-bold text-primary tabular-nums px-1.5">
        {selectedLines.size}
      </span>
      <div className="w-px h-4 bg-zinc-700/50" />
      <button
        onClick={handleBulkClearTimestamps}
        className="p-1.5 text-orange-400 hover:bg-orange-500/15 rounded-md transition-all cursor-pointer"
        title={t('clearTimestamps') || 'Clear timestamps'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <button
        onClick={() => handleBulkShift(-(settings.editor?.nudge?.default || 0.1))}
        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 rounded-md transition-all cursor-pointer"
        title={`(-${settings.editor?.nudge?.default || 0.1}s)`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <button
        onClick={() => handleBulkShift((settings.editor?.nudge?.default || 0.1))}
        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 rounded-md transition-all cursor-pointer"
        title={`(+${settings.editor?.nudge?.default || 0.1}s)`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5L15.75 12l-7.5 7.5" />
        </svg>
      </button>
      <div className="w-px h-4 bg-zinc-700/50" />
      <button
        onClick={handleBulkDelete}
        className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-md transition-all cursor-pointer"
        title={t('deleteSelected') || 'Delete selected'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      <div className="w-px h-4 bg-zinc-700/50" />
      <button
        onClick={clearSelection}
        className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 rounded-md transition-all cursor-pointer"
        title={t('deselectAll') || 'Deselect all (Esc)'}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
