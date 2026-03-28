import { useEffect, useRef, useMemo, useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/SettingsContext';

export default function Preview({ lines, setLines, playbackPosition, playerRef }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const containerRef = useRef(null);
  const activeRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const [showMenu, setShowMenu] = useState(false);
  const [pastingType, setPastingType] = useState(null); // 'secondary' | 'translation'
  const [pasteText, setPasteText] = useState('');

  // Find the current line index based on playback position
  const currentIndex = useMemo(() => {
    if (!lines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].timestamp != null && lines[i].timestamp <= playbackPosition) {
        idx = i;
      }
    }
    return idx;
  }, [lines, playbackPosition]);

  // Track container height for dynamic padding
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll to current line
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: settings.scrollBehavior,
        block: settings.scrollBlock,
      });
    }
  }, [currentIndex, settings.scrollBehavior, settings.scrollBlock]);

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
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 sm:p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 glass bg-zinc-900/95 border border-zinc-800 rounded-lg sm:rounded-xl shadow-2xl p-2 z-50 animate-fade-in text-xs sm:text-sm text-zinc-300">
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
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scroll-smooth"
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
          ) : (
            <div className="space-y-1 overflow-x-hidden px-1 sm:px-0">
              {lines.map((line, i) => {
                const isActive = i === currentIndex;
                const isPast =
                  line.timestamp != null && line.timestamp < playbackPosition && !isActive;

                return (
                  <div
                    key={i}
                    ref={isActive ? activeRef : null}
                    onClick={() => handleLineClick(line)}
                    title={line.timestamp != null ? t('clickToSeek') : ''}
                    className={`group px-2 sm:px-4 py-1 sm:py-2 rounded-lg transition-all duration-500 ease-out flex flex-col items-start cursor-pointer select-none relative ${isActive
                      ? 'scale-y-105 origin-center my-1 sm:my-2 bg-zinc-800/10'
                      : 'hover:bg-zinc-800/30'
                      }`}
                  >
                    {/* Play cursor on hover (only for synced lines) */}
                    {line.timestamp != null && (
                      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-primary pointer-events-none pr-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                    {/* Secondary/Romaji Track */}
                    {line.secondary && (
                      <p
                        className={`transition-all duration-300 w-full ${isActive
                          ? 'text-xs sm:text-sm text-zinc-400 font-medium'
                          : 'text-xs text-zinc-600'
                          }`}
                      >
                        {line.secondary}
                      </p>
                    )}

                    {/* Main Track */}
                    <p
                      className={`transition-all duration-500 ease-out w-full break-words ${isActive
                        ? 'text-lg sm:text-2xl font-bold text-primary glow-line my-0.5 sm:my-1'
                        : isPast
                          ? 'text-sm sm:text-lg text-zinc-500'
                          : 'text-sm sm:text-lg text-zinc-600'
                        }`}
                    >
                      {line.text || '♪'}
                    </p>

                    {/* Translation Track */}
                    {line.translation && (
                      <p
                        className={`transition-all duration-300 w-full ${isActive
                          ? 'text-lg sm:text-2xl text-zinc-500 font-medium my-0.5 sm:my-1'
                          : 'text-sm sm:text-lg text-zinc-600'
                          }`}
                      >
                        {line.translation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
