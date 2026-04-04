import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { SharePanel } from '../shared/ShareModal';
import { Eye, Share2, X, Lock, LockOpen } from 'lucide-react';

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
    includeSecondary,
    setIncludeSecondary,
    includeWordTimestamps,
    setIncludeWordTimestamps,
    includeMetadata,
    setIncludeMetadata,
    showTranslationsInPreview,
    setShowTranslationsInPreview,
    showFuriganaInPreview,
    setShowFuriganaInPreview,
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
    hasSecondary,
    hasWords,
    hasFurigana,
    handleSavePaste,
    handleLineClick,
    handleExport,
    handleCopy,
  } = usePreview(props);

  const { lines, playbackPosition, exportToUrl, isSharedSession, sharedReadOnly, setSharedReadOnly, editorMode, shareModal, setShareModal } = props;

  const shareTriggerRef = useRef(null);
  const sharePanelRef = useRef(null);
  const [shareAnchor, setShareAnchor] = useState(null);

  // Close panel on outside click
  useEffect(() => {
    if (!shareModal) return;
    const handler = (e) => {
      if (shareTriggerRef.current?.contains(e.target)) return;
      if (sharePanelRef.current?.contains(e.target)) return;
      setShareModal(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareModal, setShareModal]);

  const handleShareToggle = useCallback(() => {
    if (shareModal) {
      setShareModal(null);
      setShareAnchor(null);
      return;
    }
    if (shareTriggerRef.current) {
      const rect = shareTriggerRef.current.getBoundingClientRect();
      setShareAnchor({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    exportToUrl();
  }, [shareModal, setShareModal, exportToUrl]);

  return (
    <>
    <div className="glass relative rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-4 gap-2 sm:gap-4 relative z-raised">
        <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden flex-1 pb-1">
          <span className="uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{t('preview.title')}</span>
        </h2>
        {hasSyncedLines && (
          <div className="relative flex items-center gap-1 text-zinc-300">
            {/* Share button */}
            <Button
              ref={shareTriggerRef}
              variant="ghost"
              size="icon-sm"
              onClick={handleShareToggle}
              className={`flex-shrink-0 transition-colors ${
                isSharedSession
                  ? 'text-primary bg-primary/10 hover:bg-primary/20'
                  : shareModal
                    ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title={shareModal ? t('share.close', 'Close') : (isSharedSession ? 'Viewing shared session' : 'Share session')}
            >
              {shareModal
                ? <X className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2} />
                : <Share2 className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
              }
            </Button>
            {/* Lock/unlock toggle for shared sessions */}
            {isSharedSession && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setSharedReadOnly?.(!sharedReadOnly)}
                className={`flex-shrink-0 ${sharedReadOnly ? 'text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20' : 'text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20'}`}
                title={sharedReadOnly ? 'Read-only \u2014 click to edit your copy' : 'Editing your personal copy'}
              >
                {sharedReadOnly
                  ? <Lock className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
                  : <LockOpen className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={1.8} />
                }
              </Button>
            )}
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
                data-export-toggle
                onClick={() => setShowExportPanel(!showExportPanel)}
                className={`flex-shrink-0 ${showExportPanel ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                title={t('export.title') || 'Export File'}
              >
                {showExportPanel ? (
                  <X className="w-4 sm:w-5 h-4 sm:h-5" strokeWidth={2} />
                ) : (
                  <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
              </Button>
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
                {hasFurigana && (
                  <DropdownMenuItem
                    onClick={() => setShowFuriganaInPreview((v) => !v)}
                    className="text-xs sm:text-sm text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer flex items-center justify-between"
                  >
                    {t('preview.furigana', 'Furigana')}
                    <span className={`text-[10px] ml-2 ${showFuriganaInPreview ? 'text-primary' : 'text-zinc-600'}`}>
                      {showFuriganaInPreview ? '✓' : '✗'}
                    </span>
                  </DropdownMenuItem>
                )}
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
                <DropdownMenuItem
                  onClick={() => { setPastingType('furigana'); setPasteText(lines.map(l => l.furigana || '').join('\n')); }}
                  className="text-xs sm:text-sm text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 cursor-pointer"
                >
                  {t('preview.furigana', 'Furigana')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Viewport */}
      {showExportPanel ? (
        <ExportPanel
          showExportPanel={showExportPanel}
          setShowExportPanel={setShowExportPanel}
          exportFilename={exportFilename}
          setExportFilename={setExportFilename}
          metadata={metadata}
          setMetadata={setMetadata}
          includeTranslations={includeTranslations}
          setIncludeTranslations={setIncludeTranslations}
          includeSecondary={includeSecondary}
          setIncludeSecondary={setIncludeSecondary}
          includeWordTimestamps={includeWordTimestamps}
          setIncludeWordTimestamps={setIncludeWordTimestamps}
          includeMetadata={includeMetadata}
          setIncludeMetadata={setIncludeMetadata}
          hasTranslations={hasTranslations}
          hasSecondary={hasSecondary}
          hasWords={hasWords}
          wasCopied={wasCopied}
          handleExport={handleExport}
          handleCopy={handleCopy}
        />
      ) : pastingType ? (
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
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scroll-smooth mask-edges rounded-lg"
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

            // Pre-compute nextTimestamp for karaoke fill
            const nextTimestamps = {};
            for (let idx = 0; idx < lines.length; idx++) {
              for (let j = idx + 1; j < lines.length; j++) {
                if (lines[j].timestamp != null) {
                  nextTimestamps[idx] = lines[j].timestamp;
                  break;
                }
              }
            }

            return (
              <div className={`overflow-x-hidden px-1 sm:px-0 scroll-smooth ${isDualLine ? 'h-full flex flex-col justify-center items-center gap-4 sm:gap-8' : wrapperSpacing[spacingOption] || 'space-y-1'}`}>
                {displayLines.map(({ line, originalIndex: i }) => (
                  <PreviewLine
                    key={i}
                    line={{ ...line, nextTimestamp: nextTimestamps[i] ?? null }}
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
                    showFuriganaInPreview={showFuriganaInPreview}
                    sizeOption={sizeOption}
                    spacingOption={spacingOption}
                    activeSecondarySizes={activeSecondarySizes}
                    inactiveSecondarySizes={inactiveSecondarySizes}
                    activeFontSizes={activeFontSizes}
                    inactiveFontSizes={inactiveFontSizes}
                    activeMargin={activeMargin}
                    distanceFromActive={currentIndex >= 0 ? Math.abs(i - currentIndex) : null}
                    totalLines={lines.length}
                    editorMode={editorMode}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
      {shareModal && shareAnchor && createPortal(
        <div
          ref={sharePanelRef}
          style={{ position: 'fixed', top: shareAnchor.top, right: shareAnchor.right }}
          className="z-overlay w-80 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-elevated animate-fade-in"
        >
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center flex-shrink-0">
              <Share2 className="w-3 h-3 text-white" strokeWidth={2} />
            </div>
            <span className="text-xs font-bold text-zinc-100">{t('share.title', 'Share Session')}</span>
          </div>
          <SharePanel {...shareModal} />
        </div>,
        document.body
      )}
    </>
  );
}
