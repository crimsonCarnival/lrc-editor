import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
          <Input
            type="text"
            value={exportFilename}
            onChange={(e) => setExportFilename(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExport()}
            placeholder="lyrics"
            className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus-visible:ring-primary/25 focus-visible:border-primary/50 w-0"
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
                <Input
                  type="text"
                  value={metadata[key]}
                  onChange={(e) => setMetadata(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={labels[key]}
                  className="flex-1 bg-zinc-800 border-zinc-700 text-xs text-zinc-100 placeholder-zinc-600 h-7 focus-visible:border-primary/50"
                />
              </div>
            );
          })}
        </div>
      )}

      {hasTranslations && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="include-translations"
            checked={includeTranslations}
            onCheckedChange={setIncludeTranslations}
            className="border-zinc-600 bg-zinc-800 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <Label htmlFor="include-translations" className="text-xs text-zinc-400 cursor-pointer">
            {t('includeTranslations')}
          </Label>
        </div>
      )}

      <div className="flex gap-2 w-full mt-2">
        <Button
          variant="outline"
          onClick={handleCopy}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 font-semibold text-sm h-10"
        >
          {wasCopied ? `${t('copied')} ${settings.export?.copyFormat.toUpperCase()}!` : t('copyToClipboard')}
        </Button>
        <Button
          onClick={handleExport}
          className="flex-1 bg-primary hover:bg-primary-dim text-zinc-950 font-semibold text-sm h-10"
        >
          {t('download')}
        </Button>
      </div>
    </div>
  );
}
