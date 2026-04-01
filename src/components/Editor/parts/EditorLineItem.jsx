import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTimestamp } from '../../../utils/lrc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Play, ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react';

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
              placeholder={t('primaryText') || 'Primary text'}
              className="w-full bg-zinc-800 border-primary/50 text-xs text-zinc-100 h-7"
            />
            <Input
              type="text"
              value={editingSecondary}
              onChange={(e) => setEditingSecondary(e.target.value)}
              placeholder={t('secondaryText') || 'Secondary (bilingual)'}
              className="w-full bg-zinc-800 border-zinc-600/50 text-xs text-zinc-400 h-6"
            />
            <Input
              type="text"
              value={editingTranslation}
              onChange={(e) => setEditingTranslation(e.target.value)}
              placeholder={t('translationText') || 'Translation'}
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
