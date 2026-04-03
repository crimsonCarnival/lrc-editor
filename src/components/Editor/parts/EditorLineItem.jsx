import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { serializeToRubyMarkup, isKanji } from '../../../utils/furigana';
import { formatTimestamp } from '../../../utils/lrc';
import { formatTime } from '../../../utils/formatTime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Kbd } from '../../shared/Kbd';
import { Pencil, Play, ChevronLeft, ChevronRight, Plus, X, Trash2, Repeat } from 'lucide-react';

/**
 * Uncontrolled input that binds wanakana romaji→hiragana conversion while mounted.
 * Only activates if the global `window.wanakana` is available (CDN load).
 */
function ReadingInput({ defaultValue, onCommit, onCancel, className, style, placeholder }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    window.wanakana?.bind(el, { IMEMode: 'toHiragana' });
    return () => { window.wanakana?.unbind(el); };
  }, []);
  return (
    <input
      ref={ref}
      autoFocus
      type="text"
      defaultValue={defaultValue}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(e.target.value);
        if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder={placeholder ?? '…'}
      className={className}
      style={style}
    />
  );
}

/**
 * Inline timestamp editor — double-click to edit, scroll to adjust, shows nudge indicator.
 */
function InlineTimestampEdit({ value, onChange, onCancel, precision }) {
  const fmt = (s) => {
    if (s == null || isNaN(s) || s < 0) return '00:00.00';
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = secs.toFixed(precision === 'thousandths' ? 3 : 2).padStart(precision === 'thousandths' ? 6 : 5, '0');
    return `${mm}:${ss}`;
  };

  const [text, setText] = useState(fmt(value));
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const parseInput = (str) => {
    // Accept mm:ss.xx or mm:ss.xxx
    const m = str.match(/^(\d{1,3}):(\d{1,2})\.(\d{1,3})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + parseInt(m[3], 10) / Math.pow(10, m[3].length);
  };

  const commit = () => {
    const parsed = parseInput(text);
    if (parsed != null && parsed >= 0) {
      onChange(parsed);
    } else {
      onCancel();
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    const parsed = parseInput(text);
    if (parsed != null) {
      const next = Math.max(0, parsed + delta);
      setText(fmt(next));
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        e.stopPropagation();
      }}
      onWheel={handleWheel}
      onClick={(e) => e.stopPropagation()}
      className="w-[82px] text-[10px] font-mono tabular-nums bg-zinc-800 border border-primary/50 rounded px-1.5 py-0.5 text-primary outline-none focus:ring-1 focus:ring-primary/50"
    />
  );
}

/**
 * Timestamp badge that supports double-click to edit and shows wheel-nudge indicator.
 */
function TimestampBadge({ value, isSynced, isFocused, isActive, precision, onClick, onDoubleClick, onWheel, nudgeIndicator }) {
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        className={`flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums transition-all w-fit ${
          isFocused
            ? 'bg-primary/25 ring-1 ring-primary/50 text-primary font-semibold'
            : isSynced
              ? 'bg-zinc-800 border border-zinc-700/50 text-primary hover:border-primary/40 hover:bg-zinc-700/60'
              : isActive
                ? 'text-zinc-400 animate-pulse-glow hover:bg-zinc-800/50 border border-transparent'
                : 'text-zinc-600 hover:bg-zinc-800/50 border border-transparent'
        }`}
      >
        {isSynced ? formatTimestamp(value, precision) : '--:--.--'}
      </button>
      {nudgeIndicator && (
        <span className="absolute -right-8 text-[9px] font-mono text-primary/80 animate-fade-in pointer-events-none whitespace-nowrap">
          {nudgeIndicator}
        </span>
      )}
    </div>
  );
}

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
  isLastLine,
  activeWordIndex,
  handleClearWordTimestamp,
  handleSetActiveWordIndex,
  handleSetTimestamp,
  handleSetWordReading,
  playbackPosition,
  isOverlapping,
  upcomingDepth,
}) => {
  const { t } = useTranslation();
  const [editingTimestamp, setEditingTimestamp] = useState(null); // null | 'start' | 'end'
  const [editingReadingWordIndex, setEditingReadingWordIndex] = useState(null);
  const [nudgeIndicator, setNudgeIndicator] = useState(null);
  const [justSynced, setJustSynced] = useState(false);
  const nudgeTimerRef = useRef(null);
  const justSyncedTimerRef = useRef(null);

  const showNudge = useCallback((delta) => {
    const sign = delta > 0 ? '+' : '';
    setNudgeIndicator(`${sign}${delta.toFixed(2)}s`);
    clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setNudgeIndicator(null), 600);
  }, []);

  const handleTimestampWheel = useCallback((e, index) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.01 : -0.01;
    shiftTime(index, delta);
    showNudge(delta);
  }, [shiftTime, showNudge]);

  // Cleanup nudge timer
  useEffect(() => () => clearTimeout(nudgeTimerRef.current), []);

  // Just-synced flash: trigger when line transitions from unsynced to synced
  const [prevIsSynced, setPrevIsSynced] = useState(isSynced);
  if (isSynced !== prevIsSynced) {
    setPrevIsSynced(isSynced);
    if (isSynced && !prevIsSynced) {
      setJustSynced(true);
    }
  }

  useEffect(() => {
    if (justSynced) {
      clearTimeout(justSyncedTimerRef.current);
      justSyncedTimerRef.current = setTimeout(() => setJustSynced(false), 600);
    }
    return () => clearTimeout(justSyncedTimerRef.current);
  }, [justSynced]);

  // Segment progress for active synced line
  const segmentProgress = isActive && isSynced && line.nextTimestamp != null && playbackPosition != null
    ? Math.min(1, Math.max(0, (playbackPosition - line.timestamp) / (line.nextTimestamp - line.timestamp)))
    : null;

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
            : upcomingDepth > 0
              ? `bg-primary/${upcomingDepth === 1 ? '5' : upcomingDepth === 2 ? '3' : '2'} border border-primary/${upcomingDepth === 1 ? '15' : '10'} border-dashed`
              : 'hover:bg-zinc-800/40 border border-transparent'
        } ${dragIndex === i ? 'opacity-40' : ''} ${justSynced ? 'ring-2 ring-primary/60 animate-just-synced' : ''}`}
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
      {/* Overlap warning indicator */}
      {isOverlapping && (
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 animate-pulse" title={t('editor.overlapWarning', 'Overlapping timestamp')} />
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
        {editorMode === 'words' ? (
          <div className="flex flex-col gap-1">
            {/* Line-level timestamp badge */}
            {editingTimestamp === 'start' && isSynced ? (
              <InlineTimestampEdit
                value={line.timestamp}
                precision={settings.editor?.timestampPrecision || 'hundredths'}
                onChange={(val) => { handleSetTimestamp(i, 'start', val); setEditingTimestamp(null); }}
                onCancel={() => setEditingTimestamp(null)}
              />
            ) : (
              <TimestampBadge
                value={line.timestamp}
                isSynced={isSynced}
                isFocused={focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start'}
                isActive={isActive}
                precision={settings.editor?.timestampPrecision || 'hundredths'}
                onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start' ? null : { lineIndex: i, type: 'start' })}
                onDoubleClick={(e) => { e.stopPropagation(); if (isSynced) setEditingTimestamp('start'); }}
                onWheel={(e) => { if (isSynced) handleTimestampWheel(e, i, 'start'); }}
                nudgeIndicator={isSynced ? nudgeIndicator : null}
              />
            )}
            {/* Word chips */}
            {line.words?.length > 0 && (
              <div className="flex flex-wrap gap-x-0.5 gap-y-1 max-w-[120px]">
                {line.words.map((w, wi) => {
                  const displayWord = w.word.replace(/^[()'"]+|[,;.!?()'"]+$/g, '');
                  const isEditingReading = editingReadingWordIndex === wi;
                  const isFocusedWord = focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'word' && focusedTimestamp?.wordIndex === wi;
                  const isActiveWord = wi === activeWordIndex;
                  const canHaveReading = isKanji(w.word?.[0] || '');
                  return (
                    <div key={wi} className="flex flex-col items-center gap-0">
                      {/* Furigana reading row */}
                      {isEditingReading ? (
                        <ReadingInput
                          defaultValue={w.reading || ''}
                          onCommit={(val) => { handleSetWordReading?.(i, wi, val); setEditingReadingWordIndex(null); }}
                          onCancel={() => setEditingReadingWordIndex(null)}
                          className="text-[7px] font-mono text-center bg-zinc-700 border border-primary/50 rounded-sm px-0.5 py-0 text-primary outline-none focus:ring-1 focus:ring-primary/40 leading-tight"
                          style={{ width: `${Math.max(24, (w.reading?.length || 1) * 6, displayWord.length * 8)}px` }}
                        />
                      ) : (
                        <span
                          onClick={(e) => { e.stopPropagation(); setEditingReadingWordIndex(wi); }}
                          title={w.reading ? `Reading: ${w.reading} — click to edit` : 'Click to add reading'}
                          className={`text-[7px] font-mono leading-tight cursor-pointer select-none border-b transition-colors ${
                            w.reading
                              ? 'text-zinc-400 border-zinc-600/60 hover:text-primary hover:border-primary/50'
                              : 'text-transparent border-transparent hover:text-zinc-600 hover:border-zinc-700'
                          }`}
                          style={{ width: `${Math.max(16, (w.reading?.length || 1) * 6, displayWord.length * 8)}px`, textAlign: 'center', display: 'block' }}
                        >
                          {w.reading || '　'}
                        </span>
                      )}
                      {/* Word chip */}
                      {w.time != null ? (
                        <div className="group/word flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (playerRef?.current?.seek) {
                                playerRef.current.seek(w.time);
                                if (settings.playback?.seekPlays && playerRef.current.play) playerRef.current.play();
                              }
                              if (activeWordIndex !== -1) handleSetActiveWordIndex(wi);
                              setFocusedTimestamp({ lineIndex: i, type: 'word', wordIndex: wi });
                            }}
                            onDoubleClick={(e) => { e.stopPropagation(); if (canHaveReading) setEditingReadingWordIndex(wi); }}
                            title={canHaveReading ? `${w.word} @ ${formatTime(w.time)} — dbl-click to edit reading` : `${w.word} @ ${formatTime(w.time)} — click to focus`}
                            className={`text-[9px] px-1 py-0.5 rounded border leading-none transition-colors cursor-pointer hover:border-primary hover:bg-primary/20 hover:text-primary ${
                              isFocusedWord
                                ? 'bg-primary/30 border-primary text-primary ring-1 ring-primary/50'
                                : isActiveWord
                                  ? 'bg-primary/20 border-primary/60 text-primary animate-pulse-glow'
                                  : 'bg-zinc-800 border-primary/30 text-primary/70'
                            }`}
                          >
                            {displayWord}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleClearWordTimestamp(i, wi); }}
                            title={`Clear timestamp for "${w.word}"`}
                            className="opacity-0 group-hover/word:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5 -ml-0.5"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onDoubleClick={(e) => { e.stopPropagation(); if (canHaveReading) setEditingReadingWordIndex(wi); }}
                          className={`text-[9px] px-1 py-0.5 rounded border leading-none ${
                            isActiveWord
                              ? 'bg-primary/20 border-primary/60 text-primary animate-pulse-glow'
                              : 'bg-zinc-800/50 border-zinc-700/30 text-zinc-600'
                          }`}
                        >
                          {displayWord}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : editorMode === 'srt' ? (
          <div className="flex flex-col gap-1">
            {/* Start time badge */}
            {editingTimestamp === 'start' && isSynced ? (
              <InlineTimestampEdit
                value={line.timestamp}
                precision={settings.editor?.timestampPrecision || 'hundredths'}
                onChange={(val) => { handleSetTimestamp(i, 'start', val); setEditingTimestamp(null); }}
                onCancel={() => setEditingTimestamp(null)}
              />
            ) : (
              <TimestampBadge
                value={line.timestamp}
                isSynced={isSynced}
                isFocused={focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start'}
                isActive={isActive}
                precision={settings.editor?.timestampPrecision || 'hundredths'}
                onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start' ? null : { lineIndex: i, type: 'start' })}
                onDoubleClick={(e) => { e.stopPropagation(); if (isSynced) setEditingTimestamp('start'); }}
                onWheel={(e) => { if (isSynced) handleTimestampWheel(e, i, 'start'); }}
                nudgeIndicator={isSynced ? nudgeIndicator : null}
              />
            )}
            {/* End time badge */}
            {editingTimestamp === 'end' && line.endTime != null ? (
              <InlineTimestampEdit
                value={line.endTime}
                precision={settings.editor?.timestampPrecision || 'hundredths'}
                onChange={(val) => { handleSetTimestamp(i, 'end', val); setEditingTimestamp(null); }}
                onCancel={() => setEditingTimestamp(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'end' ? null : { lineIndex: i, type: 'end' })}
                onDoubleClick={(e) => { e.stopPropagation(); if (line.endTime != null) setEditingTimestamp('end'); }}
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
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Primary timestamp + add-repeat on one line */}
            <div className="flex items-center gap-1">
              {editingTimestamp === 'start' && isSynced ? (
                <InlineTimestampEdit
                  value={line.timestamp}
                  precision={settings.editor?.timestampPrecision || 'hundredths'}
                  onChange={(val) => { handleSetTimestamp(i, 'start', val); setEditingTimestamp(null); }}
                  onCancel={() => setEditingTimestamp(null)}
                />
              ) : (
                <TimestampBadge
                  value={line.timestamp}
                  isSynced={isSynced}
                  isFocused={focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start'}
                  isActive={isActive}
                  precision={settings.editor?.timestampPrecision || 'hundredths'}
                  onClick={() => setFocusedTimestamp(focusedTimestamp?.lineIndex === i && focusedTimestamp?.type === 'start' ? null : { lineIndex: i, type: 'start' })}
                  onDoubleClick={(e) => { e.stopPropagation(); if (isSynced) setEditingTimestamp('start'); }}
                  onWheel={(e) => { if (isSynced) handleTimestampWheel(e, i, 'start'); }}
                  nudgeIndicator={isSynced ? nudgeIndicator : null}
                />
              )}
              {/* Add repeat — inline with primary badge, appears on row hover */}
              {isSynced && editingLineIndex !== i && !editingTimestamp && (
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
        setEditingText(serializeToRubyMarkup(line.words) || line.text);
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
              placeholder={`${t('editor.primaryText')} — {漢字|よみかた}`}
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
                className={`text-xs transition-colors ${editorMode !== 'words' && line.words?.some(w => w.reading) ? 'overflow-hidden' : 'truncate'} ${isActive
                  ? 'text-zinc-100 font-medium'
                  : isSynced
                    ? 'text-zinc-300'
                    : 'text-zinc-500'
                  }`}
                style={editorMode !== 'words' && line.words?.some(w => w.reading) ? { lineHeight: '2.2' } : undefined}
              >
                {editorMode === 'words' && line.words?.length > 0
                  ? line.words.map((w, wi) => (
                      <span
                        key={wi}
                        className={`transition-colors ${
                          isActive && wi === activeWordIndex
                            ? 'text-primary underline decoration-dotted underline-offset-2'
                            : w.time != null
                              ? 'text-primary/70'
                              : ''
                        }`}
                      >
                        {w.word}{' '}
                      </span>
                    ))
                  : line.words?.some(w => w.reading)
                    ? line.words.map((w, wi) => {
                        const canHaveReading = isKanji(w.word?.[0] || '');
                        const isEditingThisReading = editingReadingWordIndex === wi;
                        return (
                          <span key={wi} className="inline-flex flex-col items-center leading-none align-bottom">
                            {isEditingThisReading ? (
                              <ReadingInput
                                defaultValue={w.reading || ''}
                                onCommit={(val) => { handleSetWordReading?.(i, wi, val); setEditingReadingWordIndex(null); }}
                                onCancel={() => setEditingReadingWordIndex(null)}
                                className="text-[7px] font-mono text-center bg-zinc-700 border border-primary/50 rounded-sm px-0.5 py-0 text-primary outline-none focus:ring-1 focus:ring-primary/40 leading-tight"
                                style={{ width: `${Math.max(24, [...(w.reading || '')].length * 6, [...w.word].length * 8)}px` }}
                              />
                            ) : (
                              <span
                                onClick={(e) => { e.stopPropagation(); if (canHaveReading) setEditingReadingWordIndex(wi); }}
                                className={`text-[7px] font-mono leading-tight select-none border-b transition-colors ${
                                  w.reading
                                    ? 'text-zinc-400 border-zinc-600/60 hover:text-primary hover:border-primary/50 cursor-pointer'
                                    : canHaveReading
                                      ? 'text-transparent border-transparent hover:text-zinc-500 hover:border-zinc-700 cursor-pointer'
                                      : 'text-transparent border-transparent pointer-events-none'
                                }`}
                                style={{ minWidth: `${Math.max(14, [...w.word].length * 8)}px`, textAlign: 'center', display: 'block' }}
                              >
                                {w.reading || '　'}
                              </span>
                            )}
                            <span>{w.word}</span>
                          </span>
                        );
                      })
                    : (line.text || '♪')
                }
              </p>
              {editorMode !== 'words' && line.words?.length > 0 && !line.words.some((w) => w.time != null) && (
                <span
                  className="flex-shrink-0 text-[9px] font-mono text-accent-blue/60 px-1 py-0.5 bg-accent-blue/10 rounded border border-accent-blue/20 leading-none cursor-pointer hover:bg-accent-blue/20 hover:text-accent-blue transition-colors"
                  title={t('editor.wordBadgeHint', { count: line.words.filter(w => w.time != null).length })}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  W
                </span>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLineIndex(i);
                  setEditingText(serializeToRubyMarkup(line.words) || line.text);
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
          title={
            editorMode === 'words' && line.timestamp != null
              ? `Stamp "${line.words?.[activeWordIndex]?.word || 'word'}" (${activeWordIndex + 1}/${line.words?.length ?? 0})`
              : t('editor.mark')
          }
          className={`h-7 px-2 gap-1.5 border font-semibold rounded-lg flex-shrink-0 text-xs ${
            editorMode === 'words' && line.timestamp != null
              ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/40 text-sky-400'
              : 'bg-primary/20 hover:bg-primary/30 border-primary/40 text-primary'
          }`}
        >
          {editorMode === 'words' && line.timestamp != null && line.words?.[activeWordIndex] ? (
            <span className="font-mono text-[10px] max-w-[48px] truncate">{line.words[activeWordIndex].word.replace(/^[()'"]+|[,;.!?()'"]+$/g, '')}</span>
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
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
            {line.nextTimestamp != null && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (playerRef?.current?.setLoop) {
                    playerRef.current.setLoop(line.timestamp, line.endTime ?? line.nextTimestamp);
                    playerRef.current.seek(line.timestamp);
                    if (playerRef.current.play) playerRef.current.play();
                  }
                }}
                className="text-zinc-500 hover:bg-accent-purple/20 hover:text-accent-purple mr-1"
                title={t('editor.loopCurrentLine')}
              >
                <Repeat className="w-3 h-3" />
              </Button>
            )}
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
      {/* Progress stripe for active synced line */}
      {segmentProgress != null && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800/50">
          <div
            className="h-full bg-primary/50 transition-[width] duration-100 ease-linear rounded-full"
            style={{ width: `${segmentProgress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
});

export default EditorLineItem;
