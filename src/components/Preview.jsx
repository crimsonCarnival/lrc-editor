import { useEffect, useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/useSettings';
import { compileLRC, compileSRT, downloadLRC } from '../utils/lrc';

export default function Preview({ lines, setLines, playbackPosition, playerRef, duration, mediaTitle, editorMode }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const containerRef = useRef(null);
  const activeRef = useRef(null);
  const exportPanelRef = useRef(null); // ✅ FIX

  const [showMenu, setShowMenu] = useState(false);
  const [pastingType, setPastingType] = useState(null); // 'secondary' | 'translation'
  const [pasteText, setPasteText] = useState('');
  
  const [exportFilename, setExportFilename] = useState('lyrics');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [includeTranslations, setIncludeTranslations] = useState(false);
  const [showTranslationsInPreview, setShowTranslationsInPreview] = useState(true);
  const [wasCopied, setWasCopied] = useState(false);
  const [metadata, setMetadata] = useState({ ti: '', ar: '', al: '', lg: '' });

  useEffect(() => {
  if (settings.export?.defaultFilenamePattern === 'media' && mediaTitle) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExportFilename(mediaTitle);
  }
}, [mediaTitle, settings.export?.defaultFilenamePattern]);

  const sizeOption = settings.interface?.fontSize || 'normal';
  const spacingOption = settings.interface?.spacing || 'normal';

  const activeFontSizes = {
    small: 'text-base sm:text-lg',
    normal: 'text-lg sm:text-2xl',
    large: 'text-xl sm:text-3xl',
    xlarge: 'text-2xl sm:text-4xl'
  };
  const inactiveFontSizes = {
    small: 'text-xs sm:text-sm',
    normal: 'text-sm sm:text-lg',
    large: 'text-base sm:text-xl',
    xlarge: 'text-lg sm:text-2xl'
  };
  const activeSecondarySizes = {
    small: 'text-[10px] sm:text-xs',
    normal: 'text-xs sm:text-sm',
    large: 'text-sm sm:text-base',
    xlarge: 'text-base sm:text-lg'
  };
  const inactiveSecondarySizes = {
    small: 'text-[9px] sm:text-[10px]',
    normal: 'text-xs',
    large: 'text-sm',
    xlarge: 'text-sm sm:text-base'
  };
  const wrapperSpacing = {
    compact: 'space-y-0',
    normal: 'space-y-1',
    relaxed: 'space-y-3'
  };
  const activeMargin = {
    compact: 'my-0.5 sm:my-1',
    normal: 'my-1 sm:my-2',
    relaxed: 'my-2 sm:my-4'
  };

  useEffect(() => {
    if (!showExportPanel) return;
    const handler = (e) => {
      if (exportPanelRef.current && !exportPanelRef.current.contains(e.target)) {
        setShowExportPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportPanel]);

  const handleExport = () => {
    const name = exportFilename.trim() || 'lyrics';
    if (settings.export?.downloadFormat === 'srt') {
      const srt = compileSRT(lines, duration, includeTranslations, settings.export?.lineEndings, settings.editor?.srt);
      downloadLRC(srt, `${name}.srt`);
    } else {
      const filteredMetadata = Object.fromEntries(Object.entries(metadata).filter(([, v]) => v.trim() !== ''));
      const lrc = compileLRC(lines, includeTranslations, settings.export?.timestampPrecision, filteredMetadata, settings.export?.lineEndings);
      downloadLRC(lrc, `${name}.lrc`);
    }
    setShowExportPanel(false);
  };

  const handleCopy = async () => {
    let content = '';
    if (settings.export?.copyFormat === 'srt') {
      content = compileSRT(lines, duration, includeTranslations, settings.export?.lineEndings, settings.editor?.srt);
    } else {
      const filteredMetadata = Object.fromEntries(Object.entries(metadata).filter(([, v]) => v.trim() !== ''));
      content = compileLRC(lines, includeTranslations, settings.export?.timestampPrecision, filteredMetadata, settings.export?.lineEndings);
    }
    try {
      await navigator.clipboard.writeText(content);
      setWasCopied(true);
      setTimeout(() => setWasCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const currentIndex = useMemo(() => {
    if (!lines.length) return -1;

    if (editorMode === 'srt') {
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (line.timestamp != null && line.endTime != null) {
          if (playbackPosition >= line.timestamp && playbackPosition < line.endTime) {
            return i;
          }
        } else if (line.timestamp != null && line.timestamp <= playbackPosition) {
          return i;
        }
      }
      return -1;
    }

    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timestamp != null && lines[i].timestamp <= playbackPosition) {
        idx = i;
      }
    }
    return idx;
  }, [lines, playbackPosition, editorMode]);

  useEffect(() => {
    if (activeRef.current && containerRef.current && settings.editor?.scroll?.alignment !== 'none') {
      const container = containerRef.current;
      const element = activeRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      const elementTop = elementRect.top - containerRect.top + container.scrollTop;
      let scrollTo = container.scrollTop;

      if (settings.editor?.scroll?.alignment === 'center') {
        scrollTo = elementTop - (containerRect.height / 2) + (elementRect.height / 2);
      } else if (settings.editor?.scroll?.alignment === 'start') {
        scrollTo = elementTop;
      } else if (settings.editor?.scroll?.alignment === 'end') {
        scrollTo = elementTop - containerRect.height + elementRect.height;
      } else {
        // nearest
        if (elementRect.top < containerRect.top) {
          scrollTo = elementTop;
        } else if (elementRect.bottom > containerRect.bottom) {
          scrollTo = elementTop - containerRect.height + elementRect.height;
        }
      }

      container.scrollTo({
        top: scrollTo,
        behavior: settings.editor?.scroll?.mode || 'smooth',
      });
    }
  }, [currentIndex, settings.editor?.scroll?.mode, settings.editor?.scroll?.alignment]);

  const syncedLines = lines.filter((l) => l.timestamp != null);
  const hasSyncedLines = syncedLines.length > 0;

  const handleSavePaste = () => {
    if (!pastingType) return;
    const newTexts = pasteText.split('\n');
    setLines((prev) =>
      prev.map((l, i) => ({
        ...l,
        [pastingType]: newTexts[i] !== undefined ? newTexts[i].trim() : l[pastingType],
      }))
    );
    setPastingType(null);
    setPasteText('');
    setShowMenu(false);
  };

  const handleLineClick = (line) => {
    if (line.timestamp != null && playerRef?.current?.seek) {
      playerRef.current.seek(line.timestamp);
      playerRef.current.play();
    }
  };

  return (
    <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col h-full animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-4 gap-2 sm:gap-4 relative">
        <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden flex-1 pb-1">
          <span className="uppercase shrink-0 text-xs sm:text-sm">{t('previewTitle')}</span>
        </h2>
        {hasSyncedLines && (
          <div className="relative flex items-center gap-1 text-zinc-300">
            {lines.some(l => l.translation) && (
              <button
                onClick={() => setShowTranslationsInPreview(!showTranslationsInPreview)}
                className={`p-1 sm:p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-zinc-800 ${showTranslationsInPreview ? 'text-primary hover:text-primary-dim bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200'}`}
                title={t('toggleTranslations') || 'Toggle Translations'}
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              </button>
            )}
            <div className="relative" ref={exportPanelRef}>
              <button
                onClick={() => setShowExportPanel(!showExportPanel)}
                className={`p-1 sm:p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 ${showExportPanel ? 'bg-zinc-800 text-zinc-100' : ''}`}
                title={t('export') || 'Export File'}
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              {showExportPanel && (
                <div className="absolute right-0 top-full mt-2 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3 w-64 sm:w-72 z-50 animate-fade-in shadow-2xl bg-zinc-900 border border-zinc-700 font-sans text-left">
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

                  {lines.some(l => l.translation || l.secondary) && (
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
              )}
            </div>
            
            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-1 sm:p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 ${showMenu ? 'bg-zinc-800 text-zinc-100' : ''}`}
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-36 sm:w-48 glass bg-zinc-900/95 border border-zinc-800 rounded-lg sm:rounded-xl shadow-2xl p-2 z-50 animate-fade-in text-xs sm:text-sm text-zinc-300">
                <button
                  onClick={() => {
                    setPastingType('secondary');
                    setPasteText('');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  {t('secondaryLyrics')}
                </button>
                <button
                  onClick={() => {
                    setPastingType('translation');
                    setPasteText('');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  {t('translation')}
                </button>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Viewport */}
      {pastingType ? (
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
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scroll-smooth mask-edges"
        >
          {!lines.length ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-600 text-xs sm:text-sm italic text-center px-4">
                {t('pasteLyricsPlaceholder')}
              </p>
            </div>
          ) : !hasSyncedLines ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-600 text-xs sm:text-sm italic text-center px-4">
                {t('previewPlaceholder')}
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
                {displayLines.map(({ line, originalIndex: i }) => {
                  const isActive = i === currentIndex || (isDualLine && i === displayLines[0].originalIndex);
                  const isPast =
                    line.timestamp != null && line.timestamp < playbackPosition && !isActive;

                  return (
                    <div
                      key={i}
                      ref={isActive && !isDualLine ? activeRef : null}
                    onClick={() => handleLineClick(line)}
                    title={line.timestamp != null ? t('clickToSeek') : ''}
                    className={`group px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-all duration-500 ease-out flex flex-col cursor-pointer select-none relative ${
                      settings.interface?.previewAlignment === 'right' ? 'items-end text-right' :
                      settings.interface?.previewAlignment === 'center' ? 'items-center text-center' :
                      'items-start text-left'
                    } ${isActive
                      ? `${settings.editor?.display?.activeHighlight === 'zoom' ? 'scale-y-105' : ''} origin-center bg-zinc-800/10 ${activeMargin[spacingOption] || 'my-1 sm:my-2'}`
                      : 'hover:bg-zinc-800/30'
                      }`}
                  >
                    {line.timestamp != null && (
                      <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-primary pointer-events-none ${
                        settings.interface?.previewAlignment === 'right' ? 'right-0 translate-x-full pl-2' : 'left-0 -translate-x-full pr-2'
                      }`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                    {/* Secondary/Romaji Track */}
                    {line.secondary && (
                      <p
                        className={`transition-all duration-300 w-full ${isActive
                          ? `${activeSecondarySizes[sizeOption]} text-zinc-400 font-medium`
                          : `${inactiveSecondarySizes[sizeOption]} text-zinc-600`
                          }`}
                      >
                        {line.secondary}
                      </p>
                    )}

                    {/* Main Track */}
                    <p
                      className={`transition-all duration-500 ease-out w-full break-words ${isActive
                        ? `${activeFontSizes[sizeOption]} font-bold ${settings.editor?.display?.activeHighlight === 'glow' ? 'text-primary glow-line' : settings.editor?.display?.activeHighlight === 'color' ? 'text-primary' : settings.editor?.display?.activeHighlight === 'dim' ? 'text-zinc-100' : 'text-primary'} ${spacingOption === 'compact' ? 'my-0' : 'my-0.5 sm:my-1'}`
                        : isPast
                          ? `${inactiveFontSizes[sizeOption]} ${settings.editor?.display?.activeHighlight === 'dim' ? 'text-zinc-700' : 'text-zinc-500'}`
                          : `${inactiveFontSizes[sizeOption]} ${settings.editor?.display?.activeHighlight === 'dim' ? 'text-zinc-800' : 'text-zinc-600'}`
                        }`}
                    >
                      {line.text || '♪'}
                    </p>

                    {/* Translation Track */}
                    {(line.translation && showTranslationsInPreview) && (
                      <p
                        className={`transition-all duration-300 w-full ${isActive
                          ? `${activeFontSizes[sizeOption]} text-zinc-500 font-medium ${spacingOption === 'compact' ? 'my-0' : 'my-0.5 sm:my-1'}`
                          : `${inactiveFontSizes[sizeOption]} text-zinc-600`
                          }`}
                      >
                        {line.translation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
        </div>
      )}
    </div>
  );
}
