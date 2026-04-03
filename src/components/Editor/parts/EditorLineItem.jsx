import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTimestamp } from '../../../utils/lrc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Kbd } from '../../shared/Kbd';
import { Pencil, Play, ChevronLeft, ChevronRight, Plus, X, Trash2, Repeat } from 'lucide-react';

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
  editingSecondary,
  setEditingSecondary,
  editingTranslation,
  setEditingTranslation,
  handleSaveLineText,
  playerRef,
  shiftTime,
  handleAddLine,
  handleClearLine,
  handleDeleteLine,
  handleToggleLine,
  handleAddExtraTimestamp,
  handleRemoveExtraTimestamp,
  handleMark,
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
      {/* Line number / checkbox */}
      {(settings.editor?.showLineNumbers ?? true) && (
        <div
          className="w-5 shrink-0 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {selectedLines.size > 0 ? (
            <Checkbox
              checked={selectedLines.has(i)}
              onCheckedChange={() => handleToggleLine(i)}
              className="w-3.5 h-3.5 border-zinc-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          ) : (
            <span className="text-[10px] font-mono tabular-nums text-zinc-600 select-none text-right">
              {i + 1}
            </span>
          )}
        </div>
      )}
      <span
        className={`text-xs font-mono tabular-nums shrink-0 transition-colors ${isSynced
          ? 'text-primary'
          : isActive
            ? 'text-zinc-400 animate-pulse-glow'
            : 'text-zinc-600'
          }`}
        style={{ minWidth: '92px' }}
      >
        {editorMode === 'srt' ? (
          <div className="flex flex-col gap-1">
            {/* Start time badge */}
            <button
              type="button"
              onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start' ? null : { lineIndex: i, type: 'start' })}
              className={`flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums transition-all w-fit ${
                focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start'
                  ? 'bg-primary/25 ring-1 ring-primary/50 text-primary font-semibold'
                  : isSynced
                    ? 'bg-zinc-800 border border-zinc-700/50 text-primary hover:border-primary/40 hover:bg-zinc-700/60'
                    : 'text-zinc-600 hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              {isSynced ? formatTimestamp(line.timestamp, settings.editor?.timestampPrecision || 'hundredths') : '--:--.--'}
            </button>
            {/* End time badge */}
            <button
              type="button"
              onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'end' ? null : { lineIndex: i, type: 'end' })}
              className={`flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums transition-all w-fit ${
                focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'end'
                  ? 'bg-primary/25 ring-1 ring-primary/50 font-semibold'
                  : line.endTime != null
                    ? 'bg-zinc-800 border border-zinc-700/50 hover:border-accent-blue/40 hover:bg-zinc-700/60'
                    : 'text-zinc-600 hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              {line.endTime != null
                ? (() => {
                    const isOverlap = !isLastLine && line.endTime > line.nextTimestamp;
                    const colorClass = isOverlap ? 'text-red-400 font-bold underline decoration-wavy decoration-red-500/50' : 'text-accent-blue';
                    return <span className={awaitingEndMark === i ? 'animate-pulse-glow text-primary' : colorClass} title={isOverlap ? 'Overlap Warning' : ''}>{formatTimestamp(line.endTime, settings.editor?.timestampPrecision || 'hundredths')}</span>;
                  })()
                : <span className={awaitingEndMark === i ? 'animate-pulse-glow text-zinc-400' : ''}>--:--.--</span>
              }
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Primary timestamp + add-repeat on one line */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start' ? null : { lineIndex: i, type: 'start' })}
                className={`flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums transition-all w-fit ${
                  focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start'
                    ? 'bg-primary/25 ring-1 ring-primary/50 text-primary font-semibold'
                    : isSynced
                      ? 'bg-zinc-800 border border-zinc-700/50 text-primary hover:border-primary/40 hover:bg-zinc-700/60'
                      : 'text-zinc-600 hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                {isSynced ? formatTimestamp(line.timestamp, settings.editor?.timestampPrecision || 'hundredths') : '--:--.--'}
              </button>
              {/* Add repeat — inline with primary badge, appears on row hover */}
              {isSynced && editingLineIndex !== i && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleAddExtraTimestamp(i); }}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-zinc-500 hover:text-primary hover:bg-zinc-800/60 border border-transparent hover:border-zinc-700/40 transition-all"
                  title={t('editor.addExtraTimestamp')}
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Extra timestamp chips */}
            {isSynced && line.extraTimestamps?.map((ts, tsIdx) => (
              <div key={tsIdx} className="flex items-center gap-0.5 group/extra">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums bg-zinc-800/70 border border-zinc-700/30 text-primary/60 hover:text-primary hover:border-primary/30 transition-all"
                  onClick={(e) => { e.stopPropagation(); playerRef?.current?.seek?.(ts); }}
                  title={t('editor.jumpSync')}
                >
                  <Repeat className="w-2 h-2 opacity-60 flex-shrink-0" />
                  {formatTimestamp(ts, settings.editor?.timestampPrecision || 'hundredths')}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveExtraTimestamp(i, tsIdx); }}
                  className="opacity-0 group-hover/extra:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5"
                  title={t('editor.removeExtraTimestamp')}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </span>

      {/* Lyrics text container */}
      <div className="flex-1 min-w-0 flex items-start gap-2 overflow-x-hidden pb-0.5 mt-0.5" onDoubleClick={() => {
        setEditingLineIndex(i);
        setEditingText(line.text);
        setEditingSecondary(line.secondary || '');
        setEditingTranslation(line.translation || '');
      }}>
        {editingLineIndex === i ? (
          <div
            className="flex flex-col gap-1 w-full"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                handleSaveLineText(i, editingText, editingSecondary, editingTranslation);
                setEditingLineIndex(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveLineText(i, editingText, editingSecondary, editingTranslation);
                setEditingLineIndex(null);
              } else if (e.key === 'Escape') {
                setEditingLineIndex(null);
              }
            }}
          >
            <Input
              type="text"
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder={t('editor.primaryText')}
              className="w-full bg-zinc-800 border-primary/50 text-xs text-zinc-100 h-7"
            />
            <Input
              type="text"
              value={editingSecondary}
              onChange={(e) => setEditingSecondary(e.target.value)}
              placeholder={t('editor.secondaryText')}
              className="w-full bg-zinc-800 border-zinc-600/50 text-xs text-zinc-400 h-6"
            />
            <Input
              type="text"
              value={editingTranslation}
              onChange={(e) => setEditingTranslation(e.target.value)}
              placeholder={t('editor.translationText')}
              className="w-full bg-zinc-800 border-zinc-600/50 text-xs text-zinc-500 h-6 italic"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 group/text min-w-0 w-full">
            <div className="flex items-center gap-2">
              <p
                className={`text-xs transition-colors truncate ${isActive
                  ? 'text-zinc-100 font-medium'
                  : isSynced
                    ? 'text-zinc-300'
                    : 'text-zinc-500'
                  }`}
              >
                {line.text || '♪'}
              </p>
              {line.words?.length > 0 && (
                <span
                  className="flex-shrink-0 text-[9px] font-mono text-accent-blue/60 px-1 py-0.5 bg-accent-blue/10 rounded border border-accent-blue/20 leading-none"
                  title={`${line.words.length} word-level timestamps`}
                >
                  W:{line.words.length}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLineIndex(i);
                  setEditingText(line.text);
                  setEditingSecondary(line.secondary || '');
                  setEditingTranslation(line.translation || '');
                }}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-zinc-500 hover:text-primary hover:bg-zinc-800/60"
                title={t('editor.editLine') || 'Edit text (Double-click)'}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </div>
            {line.secondary && (
              <p className="text-[10px] text-zinc-500 leading-tight pl-0.5 truncate">{line.secondary}</p>
            )}
            {line.translation && (
              <p className="text-[10px] text-zinc-500/70 italic leading-tight pl-0.5 truncate">{line.translation}</p>
            )}
          </div>
        )}
      </div>
      {/* Mark button — always visible on the active unsaved line */}
      {isActive && editingLineIndex !== i && (
        <Button
          onClick={(e) => { e.stopPropagation(); handleMark(); }}
          title={t('editor.mark')}
          className="h-7 px-2 gap-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-semibold rounded-lg flex-shrink-0 text-xs"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Button>
      )}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {isSynced && (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                if (playerRef?.current?.seek) {
                  playerRef.current.seek(line.timestamp);
                  if (playerRef.current.play) playerRef.current.play();
                }
              }}
              className="text-zinc-500 hover:bg-primary/20 hover:text-primary mr-1"
              title={t('editor.jumpSync')}
            >
              <Play className="w-3 h-3" fill="currentColor" />
            </Button>
            {selectedLines.size === 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => { e.stopPropagation(); shiftTime(i, -(settings.editor?.nudge?.default || 0.1)); }}
                  className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
                  title={`-${settings.editor?.nudge?.default || 0.1}s`}
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => { e.stopPropagation(); shiftTime(i, (settings.editor?.nudge?.default || 0.1)); }}
                  className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/60"
                  title={`+${settings.editor?.nudge?.default || 0.1}s`}
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
                <div className="w-px h-4 bg-zinc-700/50 mx-1" />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => { e.stopPropagation(); handleAddLine(i); }}
                  className="text-zinc-500 hover:text-green-400 hover:bg-green-500/10"
                  title={t('editor.addLine')}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => { e.stopPropagation(); handleClearLine(i); }}
                  className="text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10"
                  title={t('editor.clearTimestamp')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </>
            )}
          </>
        )}
        {selectedLines.size === 0 && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => { e.stopPropagation(); handleDeleteLine(i); }}
            className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            title={t('editor.removeLine')}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
});

export default EditorLineItem;
