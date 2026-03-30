import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';

export default function ExportPanel({
  showExportPanel,
  setShowExportPanel,
  exportFilename,
  setExportFilename,
  metadata,
  setMetadata,
  includeTranslations,
  setIncludeTranslations,
  hasTranslations,
  wasCopied,
  handleExport,
  handleCopy
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const exportPanelRef = useRef(null);

  useEffect(() => {
    if (!showExportPanel) return;
    const handler = (e) => {
      if (exportPanelRef.current && !exportPanelRef.current.contains(e.target)) {
        setShowExportPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportPanel, setShowExportPanel]);

  if (!showExportPanel) return null;

  return (
    <div className="absolute right-0 top-full mt-2 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3 w-64 sm:w-72 z-50 animate-fade-in shadow-2xl bg-zinc-900 border border-zinc-700 font-sans text-left" ref={exportPanelRef}>
      <label className="block">
        <span className="text-xs text-zinc-400 font-medium">{t('filename')}</span>
        <div className="flex items-center gap-1 mt-1">
          <input
            type="text"
            value={exportFilename}
            onChange={(e) => setExportFilename(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExport()}
            placeholder="lyrics"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all w-0"
          />
          <span className="text-sm text-zinc-500 min-w-8">.{settings.export?.downloadFormat}</span>
        </div>
      </label>

      {settings.export?.downloadFormat === 'lrc' && (
        <div className="space-y-2 pt-2 border-t border-zinc-700/50">
          <span className="text-xs text-zinc-400 font-medium">{t('exportMetadata', 'LRC Metadata')}</span>
          {['ti', 'ar', 'al', 'lg'].map((key) => {
            const labels = { ti: t('metaTitle', 'Title'), ar: t('metaArtist', 'Artist'), al: t('metaAlbum', 'Album'), lg: t('metaLanguage', 'Language') };
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-16">{labels[key]}</span>
                <input
                  type="text"
                  value={metadata[key]}
                  onChange={(e) => setMetadata(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={labels[key]}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-primary/50"
                />
              </div>
            );
          })}
        </div>
      )}

      {hasTranslations && (
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
          {wasCopied ? `${t('copied')} ${settings.export?.copyFormat.toUpperCase()}!` : t('copyToClipboard')}
        </button>
        <button
          onClick={handleExport}
          className="flex-1 py-2.5 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm rounded-lg transition-all cursor-pointer"
        >
          {t('download')}
        </button>
      </div>
    </div>
  );
}
