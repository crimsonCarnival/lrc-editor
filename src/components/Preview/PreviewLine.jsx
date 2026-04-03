import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';

export default function PreviewLine({
  line,
  originalIndex: i,
  displayedActiveIndex,
  lockedLineIndex,
  isDualLine,
  displayLines,
  playbackPosition,
  activeRef,
  handleLineClick,
  handleLineHover,
  handleLineHoverEnd,
  showTranslationsInPreview,
  sizeOption,
  spacingOption,
  activeSecondarySizes,
  inactiveSecondarySizes,
  activeFontSizes,
  inactiveFontSizes,
  activeMargin
}) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const isActive = i === displayedActiveIndex || (isDualLine && i === displayLines[0].originalIndex);
  const isPast = line.timestamp != null && line.timestamp < playbackPosition && !isActive;
  const isLocked = lockedLineIndex === i;

  return (
    <div
      ref={isActive && !isDualLine ? activeRef : null}
      onClick={() => handleLineClick(line, i)}
      onMouseEnter={() => handleLineHover(i)}
      onMouseLeave={handleLineHoverEnd}
      title={isLocked ? t('preview.locked') : t('preview.hoverHint')}
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
        <div className={`absolute top-1/2 -translate-y-1/2 ${isLocked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity flex items-center justify-center pointer-events-none ${
          isLocked ? 'text-amber-400' : 'text-primary'
        } ${
          settings.interface?.previewAlignment === 'right' ? 'right-0 translate-x-full pl-2' : 'left-0 -translate-x-full pr-2'
        }`}>
          {isLocked ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C9.24 2 7 4.24 7 7v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7c0-2.76-2.24-5-5-5zm3 10H9v-2c0-1.66 1.34-3 3-3s3 1.34 3 3v2z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
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
        {line.words?.some((w) => w.time != null)
          ? line.words.map((w, wi) => {
              const nextT = line.words.slice(wi + 1).find((w2) => w2.time != null)?.time;
              let fillPct = 0;
              if (w.time != null && w.time <= playbackPosition) {
                fillPct = nextT != null && nextT > playbackPosition
                  ? Math.min(100, ((playbackPosition - w.time) / (nextT - w.time)) * 100)
                  : 100;
              }
              return (
                <React.Fragment key={wi}>
                  <span className="relative inline-block">
                    <span className="text-zinc-500">{w.word}</span>
                    <span
                      className="absolute left-0 top-0 h-full overflow-hidden text-primary whitespace-nowrap"
                      style={{ width: `${fillPct}%` }}
                    >
                      {w.word}
                    </span>
                  </span>
                  {' '}
                </React.Fragment>
              );
            })
          : line.text || '♪'
        }
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
}
