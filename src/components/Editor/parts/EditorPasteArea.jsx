import { useTranslation } from 'react-i18next';

export default function EditorPasteArea({
  rawText,
  setRawText,
  handleConfirmLyrics,
  fileInputRef,
  handleFileUpload
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col flex-1 gap-2 sm:gap-3 animate-fade-in min-h-0 px-1">
      <textarea
        id="lyrics-textarea"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={t('pasteLyricsPlaceholder')}
        className="flex-1 bg-zinc-800/40 border border-zinc-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all font-mono leading-relaxed"
      />
      <div className="flex flex-col gap-2 sm:gap-3">
        <button
          id="confirm-lyrics-btn"
          onClick={handleConfirmLyrics}
          disabled={!rawText.trim()}
          className="w-full py-2.5 sm:py-3 bg-primary hover:bg-primary-dim disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-primary/20 text-sm"
        >
          {t('startSyncing')}
        </button>
        <div className="flex gap-2 sm:gap-3">
          <input
            type="file"
            accept=".lrc,.srt"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-300 font-semibold rounded-lg sm:rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
            title={t('importFile')}
          >
            <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="hidden sm:inline">{t('importFile')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
