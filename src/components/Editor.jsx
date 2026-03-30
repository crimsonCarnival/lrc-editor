import { useState, useEffect, useRef, useCallback } from 'react';
import { formatTimestamp, parseLrcSrtFile } from '../utils/lrc';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/useSettings';
import ConfirmModal from './ConfirmModal';
import NumberInput from './NumberInput';

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
  editorMode,
  setEditorMode,
}) {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();
  const [rawText, setRawText] = useState('');
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [offsetValue, setOffsetValue] = useState('');
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    message: '',
    onConfirm: null,
  });

  // SRT mode: track whether we're waiting for the second Space press (end time)
  const [awaitingEndMark, setAwaitingEndMark] = useState(null); // index of line awaiting end mark

  useEffect(() => {
    setAwaitingEndMark(null);
  }, [editorMode, activeLineIndex]);

  // Track focused timestamp for direct editing: { lineIndex: number, type: 'start' | 'end' }
  const [focusedTimestamp, setFocusedTimestamp] = useState(null);

  const lastClickedRef = useRef(null);
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
    const numericDelta = Number(delta) || 0;
    
    setLines((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        // Check if there is a focused timestamp for this line and it's the end time
        if (focusedTimestamp?.lineIndex === index && focusedTimestamp.type === 'end') {
          if (updated[index].endTime != null) {
            const newEndTime = Math.max(0, Number(updated[index].endTime) + numericDelta);
            if (!isNaN(newEndTime)) {
              updated[index] = {
                ...updated[index],
                endTime: newEndTime,
              };
              if (playerRef?.current?.seek) {
                playerRef.current.seek(newEndTime);
              }
            }
          }
        } else if (updated[index].timestamp != null) {
          const newTimestamp = Math.max(0, Number(updated[index].timestamp) + numericDelta);
          if (!isNaN(newTimestamp)) {
            updated[index] = {
              ...updated[index],
              timestamp: newTimestamp,
            };
            // Seek player to the new timestamp
            if (playerRef?.current?.seek) {
              playerRef.current.seek(newTimestamp);
            }
          }
        }
      }
      return updated;
    });
  }, [playerRef, setLines, focusedTimestamp]);

  const handleMark = useCallback(() => {
    if (activeLineIndex >= lines.length) return;
    const time = playerRef?.current?.getCurrentTime?.() ?? playbackPosition;

    if (settings.editor?.autoPauseOnMark) {
      playerRef?.current?.pause?.();
    }

    // If a timestamp is focused, mark that specific timestamp
    if (focusedTimestamp) {
      setLines((prev) => {
        const updated = [...prev];
        const line = updated[focusedTimestamp.lineIndex];
        if (line) {
          updated[focusedTimestamp.lineIndex] = {
            ...line,
            ...(focusedTimestamp.type === 'start'
              ? { timestamp: time }
              : { endTime: Math.max(line.timestamp ?? 0, time) })
          };
        }
        return updated;
      });
      return;
    }

    if (editorMode === 'srt') {
      if (settings.editor?.srt?.snapToNextLine) {
        setLines((prev) => {
          const updated = [...prev];

          let lastSyncedIndex = activeLineIndex - 1;
          while (lastSyncedIndex >= 0 && updated[lastSyncedIndex].timestamp == null) {
            lastSyncedIndex--;
          }
          if (lastSyncedIndex >= 0 && updated[lastSyncedIndex].endTime == null) {
            updated[lastSyncedIndex] = {
              ...updated[lastSyncedIndex],
              endTime: Math.max(
                updated[lastSyncedIndex].timestamp ?? 0,
                time - (settings.editor?.srt?.minSubtitleGap || 0)
              )
            };
          }

          updated[activeLineIndex] = {
            ...updated[activeLineIndex],
            timestamp: time,
          };
          return updated;
        });

        if (settings.editor?.autoAdvance?.enabled) {
          let nextIndex = activeLineIndex + 1;
          if (settings.editor?.autoAdvance?.skipBlank) {
            while (nextIndex < lines.length) {
              const nextText = lines[nextIndex]?.text?.trim();
              if (nextText && nextText !== '♪') break;
              nextIndex++;
            }
            if (nextIndex > activeLineIndex + 1) {
              setLines((prev) => {
                const updated = [...prev];
                for (let i = activeLineIndex + 1; i < nextIndex; i++) {
                  updated[i] = { ...updated[i], timestamp: time, endTime: time };
                }
                return updated;
              });
            }
          }
          setActiveLineIndex(Math.min(nextIndex, lines.length - 1));
        }
      } else {
        // SRT double-space logic
        if (awaitingEndMark === activeLineIndex) {
          // Second space: set end time for this line
          setLines((prev) => {
            const updated = [...prev];
            updated[activeLineIndex] = {
              ...updated[activeLineIndex],
              endTime: Math.max(updated[activeLineIndex].timestamp ?? 0, time),
            };
            return updated;
          });
          setAwaitingEndMark(null);
          if (settings.editor?.autoAdvance?.enabled) {
            let nextIndex = activeLineIndex + 1;
            if (settings.editor?.autoAdvance?.skipBlank) {
              while (nextIndex < lines.length) {
                const nextText = lines[nextIndex]?.text?.trim();
                if (nextText && nextText !== '♪') break;
                nextIndex++;
              }
              if (nextIndex > activeLineIndex + 1) {
                setLines((prev) => {
                  const updated = [...prev];
                  for (let i = activeLineIndex + 1; i < nextIndex; i++) {
                    updated[i] = { ...updated[i], timestamp: time, endTime: time };
                  }
                  return updated;
                });
              }
            }
            setActiveLineIndex(Math.min(nextIndex, lines.length - 1));
          }
        } else {
          // First space: set start time
          setLines((prev) => {
            const updated = [...prev];
            updated[activeLineIndex] = {
              ...updated[activeLineIndex],
              timestamp: time,
            };
            return updated;
          });
          setAwaitingEndMark(activeLineIndex);
        }
      }
    } else {
      // LRC mode: original behavior
      setLines((prev) => {
        const updated = [...prev];
        updated[activeLineIndex] = {
          ...updated[activeLineIndex],
          timestamp: time,
        };
        return updated;
      });
      if (settings.editor?.autoAdvance?.enabled) {
        let nextIndex = activeLineIndex + 1;
        if (settings.editor?.autoAdvance?.skipBlank) {
          while (nextIndex < lines.length) {
            const nextText = lines[nextIndex]?.text?.trim();
            if (nextText && nextText !== '♪') break;
            nextIndex++;
          }
          if (nextIndex > activeLineIndex + 1) {
            setLines((prev) => {
              const updated = [...prev];
              for (let i = activeLineIndex + 1; i < nextIndex; i++) {
                updated[i] = { ...updated[i], timestamp: time };
              }
              return updated;
            });
          }
        }
        setActiveLineIndex(Math.min(nextIndex, lines.length - 1));
      }
    }
  }, [activeLineIndex, lines, playbackPosition, playerRef, setLines, setActiveLineIndex, settings.editor?.autoAdvance?.enabled, settings.editor?.autoAdvance?.skipBlank, editorMode, awaitingEndMark, focusedTimestamp, settings.editor?.autoPauseOnMark, settings.editor?.srt?.snapToNextLine, settings.editor?.srt?.minSubtitleGap]);

  // Shortcuts
  useEffect(() => {
    if (!syncMode) return;

    const matchKey = (e, targetKey) => {
      if (!targetKey) return false;
      const parts = targetKey.split('+');
      const key = parts.pop();
      const needsCtrl = parts.includes('Ctrl') || parts.includes('Cmd') || parts.includes('Meta');
      const needsAlt = parts.includes('Alt');
      const needsShift = parts.includes('Shift');
      const hasCtrl = e.ctrlKey || e.metaKey;
      if (needsCtrl !== hasCtrl || needsAlt !== e.altKey || needsShift !== e.shiftKey) return false;
      if (key === 'Space') return e.code === 'Space';
      if (e.key.length === 1) return e.key.toUpperCase() === key.toUpperCase();
      return e.key === key;
    };

    const handler = (e) => {
      // Don't intercept if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const handleNudge = (delta) => {
        const numericDelta = Number(delta) || 0;
        if (focusedTimestamp) {
          shiftTime(focusedTimestamp.lineIndex, numericDelta);
        } else if (selectedLines.size > 0) {
          setLines((prev) => prev.map((l, idx) => {
            if (selectedLines.has(idx) && l.timestamp != null) {
              const newTimestamp = Math.max(0, Number(l.timestamp) + numericDelta);
              return !isNaN(newTimestamp) ? { ...l, timestamp: newTimestamp } : l;
            }
            return l;
          }));
        } else {
          shiftTime(activeLineIndex, numericDelta);
        }
      };

      if (matchKey(e, settings.shortcuts?.mark?.[0] || 'Space')) {
        e.preventDefault();
        handleMark();
      } else if (matchKey(e, settings.shortcuts?.nudgeLeftFine?.[0] || 'Shift+ArrowLeft')) {
        e.preventDefault();
        handleNudge(-(settings.editor?.nudge?.fine || 0.01));
      } else if (matchKey(e, settings.shortcuts?.nudgeRightFine?.[0] || 'Shift+ArrowRight')) {
        e.preventDefault();
        handleNudge((settings.editor?.nudge?.fine || 0.01));
      } else if (matchKey(e, settings.shortcuts?.nudgeLeft?.[0] || 'ArrowLeft')) {
        e.preventDefault();
        handleNudge(-(settings.editor?.nudge?.default || 0.1));
      } else if (matchKey(e, settings.shortcuts?.nudgeRight?.[0] || 'ArrowRight')) {
        e.preventDefault();
        handleNudge((settings.editor?.nudge?.default || 0.1));
      } else if (e.key === 'Escape') {
        if (focusedTimestamp) {
          e.preventDefault();
          setFocusedTimestamp(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [syncMode, activeLineIndex, lines.length, playbackPosition, handleMark, shiftTime, selectedLines, settings.editor?.nudge?.default, settings.editor?.nudge?.fine, setLines, focusedTimestamp, settings.shortcuts?.mark, settings.shortcuts?.nudgeLeft, settings.shortcuts?.nudgeRight, settings.shortcuts?.nudgeLeftFine, settings.shortcuts?.nudgeRightFine]);

  // Auto-scroll to the active line
  useEffect(() => {
    if (activeLineRef.current && listRef.current && settings.editor?.scroll?.alignment !== 'none') {
      const container = listRef.current;
      const element = activeLineRef.current;

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
  }, [activeLineIndex, settings.editor?.scroll?.mode, settings.editor?.scroll?.alignment]);

  // Clear a single line's timestamp
  const handleClearLine = useCallback((index) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], timestamp: null, ...(editorMode === 'srt' && { endTime: null }) };
      return updated;
    });
  }, [setLines, editorMode]);

  const requestConfirm = useCallback((message, action) => {
    if (settings.advanced?.confirmDestructive) {
      setConfirmConfig({ isOpen: true, message, onConfirm: action });
    } else {
      action();
    }
  }, [settings.advanced?.confirmDestructive]);

  // Clear all timestamps
  const handleClearTimestamps = () => {
    requestConfirm(t('confirmClearTimestamps') || 'Clear all timestamps?', () => {
      setLines((prev) => prev.map((l) => ({
        ...l,
        timestamp: null,
        ...(editorMode === 'srt' && { endTime: null }),
      })));
      setActiveLineIndex(0);
    });
  };

  const handleSaveLineText = (index, newText) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: newText };
      return updated;
    });
  };

  const handleDeleteLine = (index) => {
    requestConfirm(t('confirmDeleteLine') || 'Delete this line?', () => {
      setLines((prev) => prev.filter((_, i) => i !== index));
      setEditingLineIndex(null);
      setActiveLineIndex((prev) => {
        if (prev > index) return prev - 1;
        if (prev === index) {
          // If we deleted the active line, keep it at the same index unless it was the last line
          return Math.max(0, Math.min(prev, lines.length - 2));
        }
        return prev;
      });
    });
  };

  const handleAddLine = useCallback((index) => {
    setLines((prev) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, { text: '', timestamp: prev[index].timestamp });
      return updated;
    });
  }, [setLines]);

  // ——— Drag-to-reorder ———
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (dragIndex == null || dragIndex === dropIndex) return;
    setLines((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      return updated;
    });
    // Update active line index to follow the moved line
    if (activeLineIndex === dragIndex) {
      setActiveLineIndex(dropIndex);
    } else if (dragIndex < activeLineIndex && dropIndex >= activeLineIndex) {
      setActiveLineIndex(activeLineIndex - 1);
    } else if (dragIndex > activeLineIndex && dropIndex <= activeLineIndex) {
      setActiveLineIndex(activeLineIndex + 1);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ——— Global offset shift ———
  const handleApplyOffset = () => {
    const delta = parseFloat(offsetValue);
    if (isNaN(delta) || delta === 0) return;
    setLines((prev) => prev.map((l) => ({
      ...l,
      timestamp: l.timestamp != null ? Math.max(0, l.timestamp + delta) : null,
    })));
    setOffsetValue('');
  };

  // ——— Selection logic ———
  const handleLineClick = (i, e) => {
    setActiveLineIndex(i); // Clicking always makes it the active line (to hear audio)

    // Only allow selection with Ctrl+Click or Shift+Click
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return;

    if (e.shiftKey && lastClickedRef.current != null) {
      // Range select from last clicked to current
      const start = Math.min(lastClickedRef.current, i);
      const end = Math.max(lastClickedRef.current, i);
      setSelectedLines((prev) => {
        const next = new Set(prev);
        for (let idx = start; idx <= end; idx++) {
          next.add(idx);
        }
        return next;
      });
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle individual line on Ctrl+Click
      setSelectedLines((prev) => {
        const next = new Set(prev);
        if (next.has(i)) {
          next.delete(i);
        } else {
          next.add(i);
        }
        return next;
      });
    }
    lastClickedRef.current = i;
  };

  const clearSelection = useCallback(() => {
    setSelectedLines(new Set());
  }, [setSelectedLines]);

  // ——— Bulk actions on selected lines ———
  const handleBulkClearTimestamps = useCallback(() => {
    requestConfirm(t('confirmBulkClear') || 'Clear timestamps for selected lines?', () => {
      setLines((prev) => prev.map((l, idx) =>
        selectedLines.has(idx) ? {
          ...l,
          timestamp: null,
          ...(editorMode === 'srt' && { endTime: null }),
        } : l
      ));
      clearSelection();
    });
  }, [selectedLines, editorMode, setLines, clearSelection, requestConfirm, t]);

  const handleBulkDelete = useCallback(() => {
    requestConfirm(t('confirmBulkDelete') || 'Delete selected lines?', () => {
      setLines((prev) => prev.filter((_, idx) => !selectedLines.has(idx)));
      // Adjust active line index
      setActiveLineIndex((prev) => {
        let offset = 0;
        for (const idx of selectedLines) {
          if (idx < prev) offset++;
        }
        return Math.max(0, prev - offset);
      });
      clearSelection();
    });
  }, [selectedLines, t, setLines, setActiveLineIndex, clearSelection, requestConfirm]);

  const handleBulkShift = (delta) => {
    const numericDelta = Number(delta) || 0;
    setLines((prev) => prev.map((l, idx) => {
      if (selectedLines.has(idx) && l.timestamp != null) {
        const newTimestamp = Math.max(0, Number(l.timestamp) + numericDelta);
        return !isNaN(newTimestamp) ? { ...l, timestamp: newTimestamp } : l;
      }
      return l;
    }));
  };

  // Global Keybinds
  useEffect(() => {
    const matchKey = (e, targetKey) => {
      if (!targetKey) return false;
      const parts = targetKey.split('+');
      const key = parts.pop();
      const needsCtrl = parts.includes('Ctrl') || parts.includes('Cmd') || parts.includes('Meta');
      const needsAlt = parts.includes('Alt');
      const needsShift = parts.includes('Shift');
      const hasCtrl = e.ctrlKey || e.metaKey;
      if (needsCtrl !== hasCtrl || needsAlt !== e.altKey || needsShift !== e.shiftKey) return false;
      if (key === 'Space') return e.code === 'Space';
      if (e.key.length === 1) return e.key.toUpperCase() === key.toUpperCase();
      return e.key === key;
    };

    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Escape' && selectedLines.size > 0) {
        clearSelection();
        return;
      }

      if (matchKey(e, settings.shortcuts?.deleteLine?.[0] || 'Delete')) {
        e.preventDefault();
        if (selectedLines.size > 0) {
          handleBulkDelete();
        } else {
          setLines((prev) => {
            const newLengthAfterDelete = prev.length - 1;
            setActiveLineIndex(prevIndex => Math.max(0, Math.min(prevIndex, newLengthAfterDelete - 1)));
            return prev.filter((_, i) => i !== activeLineIndex);
          });
          clearSelection();
        }
      } else if (matchKey(e, settings.shortcuts?.addLine?.[0] || 'Insert')) {
        e.preventDefault();
        handleAddLine(activeLineIndex);
      } else if (matchKey(e, settings.shortcuts?.clearTimestamp?.[0] || 'Backspace')) {
        e.preventDefault();
        if (selectedLines.size > 0) {
          handleBulkClearTimestamps();
        } else {
          handleClearLine(activeLineIndex);
        }
      } else if (matchKey(e, settings.shortcuts?.switchMode?.[0] || 'Tab')) {
        e.preventDefault();
        const nextMode = editorMode === 'lrc' ? 'srt' : 'lrc';
        setEditorMode(nextMode);
        updateSetting('export.copyFormat', nextMode);
        updateSetting('export.downloadFormat', nextMode);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedLines, handleBulkDelete, clearSelection, settings.shortcuts?.deleteLine, settings.shortcuts?.addLine, settings.shortcuts?.clearTimestamp, settings.shortcuts?.switchMode, activeLineIndex, lines.length, handleAddLine, handleBulkClearTimestamps, handleClearLine, editorMode, setEditorMode, updateSetting, setLines, setActiveLineIndex]);

  return (
    <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col h-full animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-zinc-400">
            {t('editor')}
          </h2>
          {/* LRC / SRT mode toggle */}
          <div className="flex items-center bg-zinc-800/80 rounded-lg border border-zinc-700/60 overflow-hidden">
            <button
              onClick={() => {
                setEditorMode('lrc');
                updateSetting('export.copyFormat', 'lrc');
                updateSetting('export.downloadFormat', 'lrc');
              }}
              className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${editorMode === 'lrc'
                ? 'bg-primary text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {t('editorModeLRC')}
            </button>
            <button
              onClick={() => {
                setEditorMode('srt');
                updateSetting('export.copyFormat', 'srt');
                updateSetting('export.downloadFormat', 'srt');
              }}
              className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${editorMode === 'srt'
                ? 'bg-primary text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-200'
                }`}
            >
              {t('editorModeSRT')}
            </button>
          </div>
        </div>
        {syncMode && (
          <div className="flex items-center justify-end gap-1 sm:gap-2 w-full">
            <button
              id="undo-btn"
              onClick={undo}
              disabled={!canUndo}
              className="p-1 sm:p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              title={t('undoTitle')}
            >
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
              </svg>
            </button>
            <button
              id="redo-btn"
              onClick={redo}
              disabled={!canRedo}
              className="p-1 sm:p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              title={t('redoTitle')}
            >
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
              </svg>
            </button>
            <div className="w-px h-4 bg-zinc-800 hidden sm:block mx-1" />
            <button
              id="select-all-btn"
              onClick={() => setSelectedLines(new Set(lines.map((_, i) => i)))}
              className="p-1 sm:p-1.5 hover:bg-primary/20 rounded-lg text-zinc-400 hover:text-primary transition-colors cursor-pointer flex-shrink-0"
              title={t('selectAll')}
            >
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </button>
            <button
              id="clear-timestamps-btn"
              onClick={handleClearTimestamps}
              className="p-1 sm:p-1.5 hover:bg-orange-500/10 rounded-lg text-orange-400 hover:text-orange-300 transition-colors cursor-pointer flex-shrink-0"
              title={t('clearTimestamps')}
            >
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-px h-4 bg-zinc-800 hidden sm:block mx-1" />
            <button
              onClick={() => {
                requestConfirm(t('confirmRemoveAll'), () => {
                  setLines([]);
                  setRawText('');
                  setSyncMode(false);
                });
              }}
              className="p-1 sm:p-1.5 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-colors cursor-pointer flex-shrink-0"
              title={t('removeAllLyrics')}
            >
              <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Edit Mode */}
      {!syncMode && (
        <div className="flex flex-col flex-1 gap-2 sm:gap-3 animate-fade-in min-h-0 px-1">
          <textarea
            id="lyrics-textarea"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={t('pasteLyricsPlaceholder')}
            className="flex-1 bg-zinc-800/40 border border-zinc-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-all font-mono leading-relaxed"
          />
          <div className="flex flex-col gap-2 sm:gap-3">
            <button
              id="confirm-lyrics-btn"
              onClick={handleConfirmLyrics}
              disabled={!rawText.trim()}
              className="w-full py-2.5 sm:py-3 bg-primary hover:bg-primary-dim disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-semibold rounded-lg sm:rounded-xl transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-primary/20 text-sm"
            >
              {t('startSyncing')}
            </button>
            <div className="flex gap-2 sm:gap-3">
              <input
                type="file"
                accept=".lrc,.srt"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-300 font-semibold rounded-lg sm:rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
                title={t('importFile')}
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">{t('importFile')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Mode */}
      {syncMode && (
        <div className="flex flex-col flex-1 gap-3 animate-fade-in min-h-0">
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-0 mask-edges"
          >
            {lines.map((line, i) => {
              const isActive = i === activeLineIndex;
              const isSynced = line.timestamp != null;
              return (
                <div
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  onClick={(e) => handleLineClick(i, e)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, i)}
                  className={`flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer group relative overflow-hidden ${selectedLines.has(i)
                    ? 'bg-primary/15 border border-primary/40 ring-1 ring-primary/20'
                    : isActive
                      ? 'bg-primary/10 border border-primary/30'
                      : dragOverIndex === i
                        ? 'bg-accent-blue/10 border border-accent-blue/30'
                        : 'hover:bg-zinc-800/40 border border-transparent'
                    } ${dragIndex === i ? 'opacity-40' : ''}`}
                >
                  {/* Subtle active accent bar */}
                  {isActive && (
                    <div className="absolute left-0 inset-y-0 w-1 bg-primary shadow-[0_0_12px_rgba(29,185,84,0.6)] z-0 rounded-l-xl opacity-90" />
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
                              const isOverlap = i < lines.length - 1 && lines[i + 1].timestamp != null && line.endTime > lines[i + 1].timestamp;
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
                        className={`text-xs transition-colors ${isActive
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
            })}
          </div>

          {/* ——— Compact Selection Action Bar ——— */}
          {selectedLines.size > 0 && (
            <div className="flex items-center justify-center gap-1 px-2 py-1.5 bg-zinc-900/95 border border-primary/30 rounded-lg shadow-lg animate-fade-in backdrop-blur-md">
              <span className="text-[10px] font-bold text-primary tabular-nums px-1.5">
                {selectedLines.size}
              </span>
              <div className="w-px h-4 bg-zinc-700/50" />
              <button
                onClick={handleBulkClearTimestamps}
                className="p-1.5 text-orange-400 hover:bg-orange-500/15 rounded-md transition-all cursor-pointer"
                title={t('clearTimestamps') || 'Clear timestamps'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={() => handleBulkShift(-(settings.editor?.nudge?.default || 0.1))}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 rounded-md transition-all cursor-pointer"
                title={`(-${settings.editor?.nudge?.default || 0.1}s)`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={() => handleBulkShift((settings.editor?.nudge?.default || 0.1))}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 rounded-md transition-all cursor-pointer"
                title={`(+${settings.editor?.nudge?.default || 0.1}s)`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5L15.75 12l-7.5 7.5" />
                </svg>
              </button>
              <div className="w-px h-4 bg-zinc-700/50" />
              <button
                onClick={handleBulkDelete}
                className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-md transition-all cursor-pointer"
                title={t('deleteSelected') || 'Delete selected'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <div className="w-px h-4 bg-zinc-700/50" />
              <button
                onClick={clearSelection}
                className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 rounded-md transition-all cursor-pointer"
                title={t('deselectAll') || 'Deselect all (Esc)'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Sync controls */}
          <div className="flex flex-row gap-2 pt-2 border-t border-zinc-800/50 overflow-x-auto items-center">
            <button
              id="mark-btn"
              onClick={handleMark}
              title={t('mark')}
              className="px-4 sm:px-6 h-8 sm:h-9 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-dim text-zinc-950 font-bold rounded-lg transition-all duration-200 cursor-pointer glow-primary flex-shrink-0"
            >
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs sm:text-sm">{t('mark')}</span>
            </button>


            {/* Global offset shift */}
            {settings.editor?.showShiftAll && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-px h-6 bg-zinc-800/80 mx-1 hidden sm:block" />
                <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0 hidden md:inline">{t('shiftAll')}</span>
                <NumberInput
                  step={0.1}
                  value={offsetValue}
                  onChange={(e) => setOffsetValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyOffset()}
                  placeholder="±0.0s"
                  className="w-20"
                  id="shift-all-input"
                />
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-600 text-center">
            {selectedLines.size > 0
              ? (t('selectionHint') || 'Shift+Click: range · Ctrl+Click: toggle · Esc: deselect')
              : editorMode === 'srt'
                ? (awaitingEndMark != null ? t('markEndInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space') : t('markInstructionSRT').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space'))
                : t('markInstruction').replace(/Space|Espacio/gi, settings.shortcuts?.mark?.[0] || 'Space')
            }
          </p>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        message={confirmConfig.message}
        onConfirm={() => {
          const action = confirmConfig.onConfirm;
          setConfirmConfig({ isOpen: false, message: '', onConfirm: null });
          if (action) setTimeout(action, 0);
        }}
        onCancel={() => setConfirmConfig({ isOpen: false, message: '', onConfirm: null })}
      />
    </div>

  );
}
