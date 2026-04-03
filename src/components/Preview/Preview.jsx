import { usePreview } from './usePreview';
import ExportPanel from './ExportPanel';
import PreviewPasteArea from './PreviewPasteArea';
import PreviewLine from './PreviewLine';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Eye, Share2 } from 'lucide-react';

export default function Preview(props) {
  const {
    t,
    settings,
    containerRef,
    activeRef,
    pastingType,
    setPastingType,
    pasteText,
    setPasteText,
    exportFilename,
    setExportFilename,
    showExportPanel,
    setShowExportPanel,
    includeTranslations,
    setIncludeTranslations,
    showTranslationsInPreview,
    setShowTranslationsInPreview,
    wasCopied,
    metadata,
    setMetadata,
    sizeOption,
    spacingOption,
    activeFontSizes,
    inactiveFontSizes,
    activeSecondarySizes,
    inactiveSecondarySizes,
    wrapperSpacing,
    activeMargin,
    currentIndex,
    hasSyncedLines,
    hasTranslations,
    handleSavePaste,
    handleLineClick,
    handleExport,
    handleCopy,
  } = usePreview(props);

  const { lines, playbackPosition, exportToUrl, isSharedSession } = props;

  return (
    <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col h-full animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-4 gap-2 sm:gap-4 relative">
        <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden flex-1 pb-1">
          <span className="uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{t('preview.title')}</span>
        </h2>
        {hasSyncedLines && (
          <div className="relative flex items-center gap-1 text-zinc-300">
            {/* Share button */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={exportToUrl}
              className={`flex-shrink-0 ${isSharedSession ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
              title={isSharedSession ? 'Viewing shared session' : 'Share session'}
            >
              <Share2 className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
            </Button>
            {lines.some(l => l.translation) && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowTranslationsInPreview(!showTranslationsInPreview)}
                className={`flex-shrink-0 ${showTranslationsInPreview ? 'text-primary hover:text-primary-dim bg-zinc-800/50 hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                title={t('preview.toggleTranslations') || 'Toggle Translations'}
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </Button>
            )}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowExportPanel(!showExportPanel)}
                className={`flex-shrink-0 ${showExportPanel ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                title={t('export.title') || 'Export File'}
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Button>
              <ExportPanel
                showExportPanel={showExportPanel}
                setShowExportPanel={setShowExportPanel}
                exportFilename={exportFilename}
                setExportFilename={setExportFilename}
                metadata={metadata}
                setMetadata={setMetadata}
                includeTranslations={includeTranslations}
                setIncludeTranslations={setIncludeTranslations}
                hasTranslations={hasTranslations}
                wasCopied={wasCopied}
                handleExport={handleExport}
                handleCopy={handleCopy}
              />
            </div>

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
                >
                  <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-36 sm:w-48 bg-zinc-900 border-zinc-700/80" align="end">
                <DropdownMenuItem
                  onClick={() => { setPastingType('secondary'); setPasteText(lines.map(l => l.secondary || '').join('\n')); }}
                  className="text-xs sm:text-sm text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
                >
                  {t('preview.secondaryLyrics')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { setPastingType('translation'); setPasteText(lines.map(l => l.translation || '').join('\n')); }}
                  className="text-xs sm:text-sm text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
                >
                  {t('preview.translation')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Viewport */}
      {pastingType ? (
        <PreviewPasteArea
          pastingType={pastingType}
          setPastingType={setPastingType}
          pasteText={pasteText}
          setPasteText={setPasteText}
          handleSavePaste={handleSavePaste}
        />
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scroll-smooth mask-edges"
        >
          {!lines.length ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-600 text-xs sm:text-sm italic text-center px-4">
                {t('editor.pastePlaceholder')}
              </p>
            </div>
          ) : !hasSyncedLines ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-600 text-xs sm:text-sm italic text-center px-4">
                {t('preview.placeholder')}
              </p>
            </div>
          ) : (() => {
            const isDualLine = settings.editor?.display?.dualLine;
            const showNextLine = settings.editor?.display?.showNextLine !== false;

            let displayLines = lines.map((l, i) => ({ line: l, originalIndex: i }));
            
            if (isDualLine) {
              if (currentIndex === -1) {
                 const firstSynced = lines.findIndex(l => l.timestamp != null);
                 displayLines = firstSynced !== -1 
                   ? [{ line: lines[firstSynced], originalIndex: firstSynced }]
                   : [{ line: lines[0], originalIndex: 0 }];
                 
                 if (showNextLine && displayLines[0].originalIndex + 1 < lines.length) {
                    const idx = displayLines[0].originalIndex + 1;
                    displayLines.push({ line: lines[idx], originalIndex: idx });
                 }
              } else {
                 displayLines = [{ line: lines[currentIndex], originalIndex: currentIndex }];
                 if (showNextLine) {
                    let nextIdx = currentIndex + 1;
                    while (nextIdx < lines.length && lines[nextIdx].timestamp == null) {
                       nextIdx++;
                    }
                    if (nextIdx < lines.length) {
                       displayLines.push({ line: lines[nextIdx], originalIndex: nextIdx });
                    }
                 }
              }
            }

            return (
              <div className={`overflow-x-hidden px-1 sm:px-0 scroll-smooth ${isDualLine ? 'h-full flex flex-col justify-center items-center gap-4 sm:gap-8' : wrapperSpacing[spacingOption] || 'space-y-1'}`}>
                {displayLines.map(({ line, originalIndex: i }) => (
                  <PreviewLine
                    key={i}
                    line={line}
                    originalIndex={i}
                    displayedActiveIndex={currentIndex}
                    lockedLineIndex={null}
                    isDualLine={isDualLine}
                    displayLines={displayLines}
                    playbackPosition={playbackPosition}
                    activeRef={activeRef}
                    handleLineClick={handleLineClick}
                    handleLineHover={() => {}}
                    handleLineHoverEnd={() => {}}
                    showTranslationsInPreview={showTranslationsInPreview}
                    sizeOption={sizeOption}
                    spacingOption={spacingOption}
                    activeSecondarySizes={activeSecondarySizes}
                    inactiveSecondarySizes={inactiveSecondarySizes}
                    activeFontSizes={activeFontSizes}
                    inactiveFontSizes={inactiveFontSizes}
                    activeMargin={activeMargin}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
