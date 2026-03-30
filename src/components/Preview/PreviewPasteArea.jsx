import { useTranslation } from 'react-i18next';

export default function PreviewPasteArea({
  pastingType,
  setPastingType,
  pasteText,
  setPasteText,
  handleSavePaste
}) {
  const { t } = useTranslation();

  if (!pastingType) return null;

  return (
    <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-h-0 animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-800/40 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg">
        <span className="text-xs sm:text-sm font-medium text-primary">
          {t('paste')} {pastingType === 'secondary' ? t('secondaryLyrics') : t('translation')} {t('lyricsHeader')}
        </span>
        <button
          onClick={() => setPastingType(null)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer flex-shrink-0"
        >
          {t('cancel')}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        {t('pasteMatchesLineInstruction')}
      </p>
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        className="flex-1 bg-zinc-900/50 border border-zinc-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-sm text-zinc-200 placeholder-zinc-600 resize-none font-mono leading-relaxed focus:outline-none focus:border-primary/50"
        placeholder={t('pasteTextPlaceholder')}
      />
      <button
        onClick={handleSavePaste}
        className="w-full py-2 sm:py-3 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold rounded-lg sm:rounded-xl transition-all shadow-lg cursor-pointer text-sm"
      >
        {t('saveTracks')}
      </button>
    </div>
  );
}
