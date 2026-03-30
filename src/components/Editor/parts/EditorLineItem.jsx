import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTimestamp } from '../../../utils/lrc';

const EditorLineItem = React.memo(({
  line,
  i,
  isActive,
  isLocked,
  isSynced,
  editorMode,
  awaitingEndMark,
  focusedTimestamp,
  setFocusedTimestamp,
  activeLineRef,
  handleLineClick,
  handleLineHover,
  handleLineHoverEnd,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  handleDrop,
  dragOverIndex,
  dragIndex,
  selectedLines,
  settings,
  editingLineIndex,
  setEditingLineIndex,
  editingText,
  setEditingText,
  handleSaveLineText,
  playerRef,
  shiftTime,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  isLastLine
}) => {
  const { t } = useTranslation();

  return (
    <div
      ref={isActive ? activeLineRef : null}
      onClick={(e) => handleLineClick(i, e)}
      onMouseEnter={() => handleLineHover(i)}
      onMouseLeave={handleLineHoverEnd}
      draggable
      onDragStart={(e) => handleDragStart(e, i)}
      onDragOver={(e) => handleDragOver(e, i)}
      onDragEnd={handleDragEnd}
      onDrop={(e) => handleDrop(e, i)}
      className={`flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer group relative overflow-hidden ${selectedLines.has(i)
        ? 'bg-primary/15 border border-primary/40 ring-1 ring-primary/20'
        : isActive
          ? isLocked
            ? 'bg-primary/10 border border-primary/30'
            : 'bg-primary/5 border border-primary/20 border-dashed'
          : dragOverIndex === i
            ? 'bg-accent-blue/10 border border-accent-blue/30'
            : 'hover:bg-zinc-800/40 border border-transparent'
        } ${dragIndex === i ? 'opacity-40' : ''}`}
    >
      {/* Lock/unlock indicator */}
      {isActive && (
        <div className={`absolute left-0 inset-y-0 w-1 z-0 rounded-l-xl ${
          isLocked
            ? 'bg-primary shadow-[0_0_12px_rgba(29,185,84,0.6)] opacity-90'
            : 'bg-primary/40 opacity-60'
        }`} />
      )}
      <span
        className={`text-xs font-mono tabular-nums shrink-0 transition-colors ${isSynced
          ? 'text-primary'
          : isActive
            ? 'text-zinc-400 animate-pulse-glow'
            : 'text-zinc-600'
          }`}
        style={{ minWidth: editorMode === 'srt' ? '160px' : '75px' }}
      >
        {editorMode === 'srt' ? (
          <>
            <span
              onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start' ? null : { lineIndex: i, type: 'start' })}
              className={`cursor-pointer px-1 py-0.5 rounded transition-all ${focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start'
                ? 'bg-primary/40 ring-1 ring-primary/60 text-primary font-semibold'
                : 'hover:bg-zinc-700/40'
                }`}
            >
              {isSynced ? formatTimestamp(line.timestamp, settings.editor?.timestampPrecision || 'hundredths') : '--:--.--'}
            </span>
            <span className="text-zinc-600 mx-2">→</span>
            <span
              onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'end' ? null : { lineIndex: i, type: 'end' })}
              className={`cursor-pointer px-1 py-0.5 rounded transition-all ${focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'end'
                ? 'bg-primary/40 ring-1 ring-primary/60 font-semibold'
                : 'hover:bg-zinc-700/40'
                }`}
            >
              {line.endTime != null
                ? (() => {
                  const isOverlap = !isLastLine && line.endTime > line.nextTimestamp;
                  const colorClass = isOverlap ? 'text-red-400 font-bold underline decoration-wavy decoration-red-500/50' : 'text-accent-blue';
                  return <span className={`${awaitingEndMark === i ? 'animate-pulse-glow text-primary' : colorClass}`} title={isOverlap ? 'Overlap Warning' : ''}>{formatTimestamp(line.endTime, settings.editor?.timestampPrecision || 'hundredths')}</span>;
                })()
                : <span className={awaitingEndMark === i ? 'animate-pulse-glow text-zinc-400' : 'text-zinc-600'}>--:--.--</span>
              }
            </span>
          </>
        ) : (
          <span
            onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start' ? null : { lineIndex: i, type: 'start' })}
            className={`cursor-pointer px-1 py-0.5 rounded transition-all inline-block ${focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start'
              ? 'bg-primary/40 ring-1 ring-primary/60 text-primary font-semibold'
              : 'hover:bg-zinc-700/40'
              }`}
          >
            {isSynced ? formatTimestamp(line.timestamp, settings.editor?.timestampPrecision || 'hundredths') : '--:--.--'}
          </span>
        )}
      </span>

      {/* Lyrics text container (scrollable horizontally if needed) */}
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pb-0.5 mt-0.5" onDoubleClick={() => {
        setEditingLineIndex(i);
        setEditingText(line.text);
      }}>
        {editingLineIndex === i ? (
          <input
            type="text"
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={() => {
              handleSaveLineText(i, editingText);
              setEditingLineIndex(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveLineText(i, editingText);
                setEditingLineIndex(null);
              } else if (e.key === 'Escape') {
                setEditingLineIndex(null);
              }
            }}
            className="w-full bg-zinc-800 border border-primary/50 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-2 group/text">
            <p
              className={`text-xs transition-colors ${isActive
                ? 'text-zinc-100 font-medium'
                : isSynced
                  ? 'text-zinc-300'
                  : 'text-zinc-500'
                }`}
            >
              {line.text || '♪'}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingLineIndex(i);
                setEditingText(line.text);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-primary transition-all rounded hover:bg-zinc-800/60 cursor-pointer"
              title={t('editLine') || 'Edit text (Double-click)'}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {isSynced && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (playerRef?.current?.seek) {
                  playerRef.current.seek(line.timestamp);
                  if (playerRef.current.play) playerRef.current.play();
                }
              }}
              className="p-1 hover:bg-primary/20 rounded text-zinc-500 hover:text-primary transition-colors cursor-pointer mr-2"
              title={t('jumpSync')}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            {selectedLines.size === 0 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); shiftTime(i, -(settings.editor?.nudge?.default || 0.1)); }}
                  className="p-1 hover:bg-zinc-700/60 rounded text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title={`-${settings.editor?.nudge?.default || 0.1}s`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); shiftTime(i, (settings.editor?.nudge?.default || 0.1)); }}
                  className="p-1 hover:bg-zinc-700/60 rounded text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  title={`+${settings.editor?.nudge?.default || 0.1}s`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5L15.75 12l-7.5 7.5" />
                  </svg>
                </button>
                <div className="w-px h-4 bg-zinc-700/50 mx-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleAddLine(i); }}
                  className="p-1 text-zinc-500 hover:text-green-400 transition-all duration-150 cursor-pointer rounded hover:bg-green-500/10"
                  title={t('addLine')}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleClearLine(i); }}
                  className="p-1 text-zinc-500 hover:text-orange-400 transition-all duration-150 cursor-pointer rounded hover:bg-orange-500/10"
                  title={t('clearTimestamp')}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </>
        )}
        {selectedLines.size === 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteLine(i); }}
            className="p-1 text-zinc-500 hover:text-red-400 transition-all duration-150 cursor-pointer rounded hover:bg-red-500/10"
            title={t('removeLine')}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

export default EditorLineItem;
