import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { formatTimestamp, parseLrcSrtFile } from '../utils/lrc';
import { useTranslation } from 'react-i18next';

export default function Editor({
  lines,
  setLines,
  syncMode,
  setSyncMode,
  activeLineIndex,
  setActiveLineIndex,
  playbackPosition,
  playerRef,
  undo,
  redo,
  canUndo,
  canRedo,
}) {
  const { t } = useTranslation();
  const [rawText, setRawText] = useState('');
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const activeLineRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleConfirmLyrics = () => {
    const newTexts = rawText.split('\n').map((text) => text.trim());
    const updated = newTexts.map((text, i) => {
      const old = lines[i] || {};
      return { ...old, text, timestamp: old.timestamp ?? null };
    });
    setLines(updated);
    setActiveLineIndex(Math.max(0, updated.findIndex(l => l.timestamp == null)));
    setSyncMode(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      const parsed = parseLrcSrtFile(content, file.name);
      if (parsed.length > 0) {
        setLines(parsed);
        setActiveLineIndex(Math.max(0, parsed.findIndex(l => l.timestamp == null))); // set to first unsynced
        setSyncMode(true);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file could be imported again if needed
    e.target.value = '';
  };

  const shiftTime = useCallback((index, delta) => {
    setLines((prev) => {
      const updated = [...prev];
      if (updated[index] && updated[index].timestamp != null) {
        updated[index] = {
          ...updated[index],
          timestamp: Math.max(0, updated[index].timestamp + delta),
        };
      }
      return updated;
    });
  }, [setLines]);

  const handleMark = useCallback(() => {
    if (activeLineIndex >= lines.length) return;
    const time = playerRef?.current?.getCurrentTime?.() ?? playbackPosition;
    setLines((prev) => {
      const updated = [...prev];
      updated[activeLineIndex] = {
        ...updated[activeLineIndex],
        timestamp: time,
      };
      return updated;
    });
    setActiveLineIndex((prev) => Math.min(prev + 1, lines.length - 1));
  }, [activeLineIndex, lines.length, playbackPosition, playerRef, setLines, setActiveLineIndex]);

  // Space to mark
  useEffect(() => {
    if (!syncMode) return;
    const handler = (e) => {
      // Don't intercept if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleMark();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        shiftTime(activeLineIndex, -0.1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        shiftTime(activeLineIndex, 0.1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [syncMode, activeLineIndex, lines.length, playbackPosition, handleMark, shiftTime]);

  // Auto-scroll to the active line
  useEffect(() => {
    if (activeLineRef.current && listRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex]);

  // Clear a single line's timestamp
  const handleClearLine = (index) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], timestamp: null };
      return updated;
    });
  };

  // Clear all timestamps
  const handleClearTimestamps = () => {
    setLines((prev) => prev.map((l) => ({ ...l, timestamp: null })));
    setActiveLineIndex(0);
  };

  const handleSaveLineText = (index, newText) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: newText };
      return updated;
    });
  };

  const handleDeleteLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
    setActiveLineIndex((prev) => {
      if (prev > index) return prev - 1;
      setEditingLineIndex(null);
      if (prev === index) {
        // If we deleted the active line, keep it at the same index unless it was the last line
        return Math.max(0, Math.min(prev, lines.length - 2));
      }
      return prev;
    });
  };

  const syncedCount = useMemo(() => lines.filter((l) => l.timestamp != null).length, [lines]);

  return (
    <div className="glass rounded-2xl p-5 flex flex-col h-full animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
            {syncMode ? t('syncMode') : t('editor')}
          </h2>
        </div>
        {syncMode && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">
                {syncedCount}/{lines.length}
              </span>
              <div className="h-1.5 w-20 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent-purple rounded-full transition-all duration-300"
                  style={{ width: `${(syncedCount / Math.max(lines.length, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <button
              onClick={() => {
                setLines([]);
                setRawText('');
                setSyncMode(false);
              }}
              className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
              title={t('removeAllLyrics')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Edit Mode */}
      {!syncMode && (
        <div className="flex flex-col flex-1 gap-3 animate-fade-in">
          <textarea
            id="lyrics-textarea"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={t('pasteLyricsPlaceholder')}
            className="flex-1 bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all font-mono leading-relaxed"
          />
          <div className="flex gap-3">
            <button
              id="confirm-lyrics-btn"
              onClick={handleConfirmLyrics}
              disabled={!rawText.trim()}
              className="flex-1 py-3 bg-primary hover:bg-primary-dim disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-xl transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-primary/20"
            >
              {t('startSyncing')}
            </button>
            <input
              type="file"
              accept=".lrc,.srt"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-300 font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              title={t('importFile')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{t('importFile')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Sync Mode */}
      {syncMode && (
        <div className="flex flex-col flex-1 gap-3 animate-fade-in min-h-0">
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0"
          >
            {lines.map((line, i) => {
              const isActive = i === activeLineIndex;
              const isSynced = line.timestamp != null;
              return (
                <div
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => setActiveLineIndex(i)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer group ${isActive
                    ? 'bg-primary/10 border border-primary/30'
                    : 'hover:bg-zinc-800/40 border border-transparent'
                    }`}
                >
                  <span
                    className={`text-xs font-mono min-w-[75px] mt-1 shrink-0 transition-colors ${isSynced
                      ? 'text-primary'
                      : isActive
                        ? 'text-zinc-400 animate-pulse-glow'
                        : 'text-zinc-600'
                      }`}
                  >
                    {isSynced ? formatTimestamp(line.timestamp) : '--:--.--'}
                  </span>

                  {/* Lyrics text container (scrollable horizontally if needed) */}
                  <div className="flex-1 min-w-0 overflow-x-auto whitespace-nowrap scrollbar-hide pb-0.5 mt-0.5" onDoubleClick={() => {
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
                      <p
                        className={`text-sm transition-colors ${isActive
                          ? 'text-zinc-100 font-medium'
                          : isSynced
                            ? 'text-zinc-300'
                            : 'text-zinc-500'
                          }`}
                      >
                        {line.text || '♪'}
                      </p>
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
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); shiftTime(i, -0.1); }}
                          className="p-1 hover:bg-zinc-700/60 rounded text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                          title={t('minusTime')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); shiftTime(i, 0.1); }}
                          className="p-1 hover:bg-zinc-700/60 rounded text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                          title={t('plusTime')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <div className="w-px h-4 bg-zinc-700/50 mx-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClearLine(i); }}
                          className="p-1 text-zinc-500 hover:text-orange-400 transition-all duration-150 cursor-pointer rounded hover:bg-orange-500/10"
                          title={t('clearTimestamp')}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteLine(i); }}
                      className="p-1 text-zinc-500 hover:text-red-400 transition-all duration-150 cursor-pointer rounded hover:bg-red-500/10"
                      title={t('removeLine')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sync controls */}
          <div className="flex gap-2 pt-2 border-t border-zinc-800/50">
            <button
              id="mark-btn"
              onClick={handleMark}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-xl transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] glow-primary text-sm"
            >
              {t('mark')}
            </button>
            <button
              id="undo-btn"
              onClick={undo}
              disabled={!canUndo}
              className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all duration-200 cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('undoTitle')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
              </svg>
            </button>
            <button
              id="redo-btn"
              onClick={redo}
              disabled={!canRedo}
              className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all duration-200 cursor-pointer text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('redoTitle')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
              </svg>
            </button>
            <button
              id="clear-timestamps-btn"
              onClick={handleClearTimestamps}
              className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all duration-200 cursor-pointer text-sm"
            >
              {t('clear')}
            </button>
          </div>

          <p className="text-xs text-zinc-600 text-center">
            {t('markInstruction')}
          </p>


        </div>
      )}
    </div>
  );
}
