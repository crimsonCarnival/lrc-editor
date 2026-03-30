import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { parseLrcSrtFile } from '../../utils/lrc';
import { matchKey } from '../../utils/keyboard';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import useConfirm from '../../utils/useConfirm';
import {
  computeNextIndex,
  applyBulkShift,
  applyGlobalOffset,
  clearAllTimestamps,
  clearLineTimestamp,
} from './editorService';

export function useEditor({
  lines,
  setLines,
  syncMode,
  setSyncMode,
  activeLineIndex,
  setActiveLineIndex,
  playbackPosition,
  playerRef,
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
  // awaitingEndMark is derived: only non-null when the stored context still matches
  const [awaitingEndMarkFor, setAwaitingEndMarkFor] = useState(null); // null | { lineIndex, mode }
  const awaitingEndMark =
    awaitingEndMarkFor?.lineIndex === activeLineIndex && awaitingEndMarkFor?.mode === editorMode
      ? awaitingEndMarkFor.lineIndex
      : null;
  const [focusedTimestamp, setFocusedTimestamp] = useState(null);
  const [hoveredLineIndex, setHoveredLineIndex] = useState(null);
  const [isActiveLineLocked, setIsActiveLineLocked] = useState(false);

  const [requestConfirm, confirmModal] = useConfirm();

  const lastClickedRef = useRef(null);
  const activeLineRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  const displayedActiveIndex = isActiveLineLocked
    ? activeLineIndex
    : (hoveredLineIndex ?? activeLineIndex);

  const handleLineHover = useCallback((i) => {
    if (!isActiveLineLocked) {
      setHoveredLineIndex(i);
    }
  }, [isActiveLineLocked]);

  const handleLineHoverEnd = useCallback(() => {
    setHoveredLineIndex(null);
  }, []);

  // ——— Paste-area handlers ———

  const handleConfirmLyrics = () => {
    const newTexts = rawText.split('\n').map((text) => text.trim());
    const updated = newTexts.map((text, i) => {
      const old = lines[i] || {};
      return { ...old, text, timestamp: old.timestamp ?? null, id: old.id || crypto.randomUUID() };
    });
    setLines(updated);
    setActiveLineIndex(Math.max(0, updated.findIndex((l) => l.timestamp == null)));
    setSyncMode(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = parseLrcSrtFile(evt.target.result, file.name);
        if (parsed.length > 0) {
          setLines(parsed);
          setActiveLineIndex(Math.max(0, parsed.findIndex((l) => l.timestamp == null)));
          setSyncMode(true);
          toast.success(t('importedLines', { count: parsed.length }) || `Imported ${parsed.length} lines`);
        } else {
          toast.error(t('noLinesFound') || 'No lyrics found in file');
        }
      } catch (err) {
        console.error('Failed to parse lyrics file', err);
        toast.error(t('importFailed') || 'Failed to parse lyrics file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ——— Timestamp operations ———

  const shiftTime = useCallback(
    (index, delta) => {
      const numericDelta = Number(delta) || 0;
      let targetTime = null;

      setLines((prev) => {
        const updated = [...prev];
        if (!updated[index]) return prev;

        if (
          focusedTimestamp?.lineIndex === index &&
          focusedTimestamp.type === 'end' &&
          updated[index].endTime != null
        ) {
          const newEndTime = Math.max(0, Number(updated[index].endTime) + numericDelta);
          if (!isNaN(newEndTime)) {
            updated[index] = { ...updated[index], endTime: newEndTime };
            targetTime = newEndTime;
          }
        } else if (updated[index].timestamp != null) {
          const newTimestamp = Math.max(0, Number(updated[index].timestamp) + numericDelta);
          if (!isNaN(newTimestamp)) {
            updated[index] = { ...updated[index], timestamp: newTimestamp };
            targetTime = newTimestamp;
          }
        }
        return updated;
      });

      if (targetTime !== null && playerRef?.current?.seek) {
        playerRef.current.seek(targetTime);
      }
    },
    [playerRef, setLines, focusedTimestamp],
  );

  const handleMark = useCallback(() => {
    if (activeLineIndex >= lines.length) return;
    const time = playerRef?.current?.getCurrentTime?.() ?? playbackPosition;

    if (settings.editor?.autoPauseOnMark) {
      playerRef?.current?.pause?.();
    }

    // Focused timestamp takes priority
    if (focusedTimestamp) {
      setLines((prev) => {
        const updated = [...prev];
        const line = updated[focusedTimestamp.lineIndex];
        if (line) {
          updated[focusedTimestamp.lineIndex] = {
            ...line,
            ...(focusedTimestamp.type === 'start'
              ? { timestamp: time }
              : { endTime: Math.max(line.timestamp ?? 0, time) }),
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
                time - (settings.editor?.srt?.minSubtitleGap || 0),
              ),
            };
          }

          updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };

          if (settings.editor?.autoAdvance?.skipBlank) {
            let nextIndex = activeLineIndex + 1;
            while (nextIndex < prev.length) {
              const nextText = prev[nextIndex]?.text?.trim();
              if (nextText && nextText !== '♪') break;
              nextIndex++;
            }
            for (let i = activeLineIndex + 1; i < nextIndex; i++) {
              updated[i] = { ...updated[i], timestamp: time, endTime: time };
            }
          }

          return updated;
        });

        if (settings.editor?.autoAdvance?.enabled) {
          setActiveLineIndex(
            computeNextIndex(lines, activeLineIndex, settings.editor?.autoAdvance?.skipBlank),
          );
        }
      } else {
        if (awaitingEndMark === activeLineIndex) {
          setLines((prev) => {
            const updated = [...prev];
            updated[activeLineIndex] = {
              ...updated[activeLineIndex],
              endTime: Math.max(updated[activeLineIndex].timestamp ?? 0, time),
            };

            if (settings.editor?.autoAdvance?.skipBlank) {
              let nextIndex = activeLineIndex + 1;
              while (nextIndex < prev.length) {
                const nextText = prev[nextIndex]?.text?.trim();
                if (nextText && nextText !== '♪') break;
                nextIndex++;
              }
              for (let i = activeLineIndex + 1; i < nextIndex; i++) {
                updated[i] = { ...updated[i], timestamp: time, endTime: time };
              }
            }
            return updated;
          });
          setAwaitingEndMarkFor(null);
          if (settings.editor?.autoAdvance?.enabled) {
            setActiveLineIndex(
              computeNextIndex(lines, activeLineIndex, settings.editor?.autoAdvance?.skipBlank),
            );
          }
        } else {
          setLines((prev) => {
            const updated = [...prev];
            updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };
            return updated;
          });
          setAwaitingEndMarkFor({ lineIndex: activeLineIndex, mode: editorMode });
        }
      }
    } else {
      // LRC mode
      setLines((prev) => {
        const updated = [...prev];
        updated[activeLineIndex] = { ...updated[activeLineIndex], timestamp: time };

        if (settings.editor?.autoAdvance?.skipBlank) {
          let nextIndex = activeLineIndex + 1;
          while (nextIndex < prev.length) {
            const nextText = prev[nextIndex]?.text?.trim();
            if (nextText && nextText !== '♪') break;
            nextIndex++;
          }
          for (let i = activeLineIndex + 1; i < nextIndex; i++) {
            updated[i] = { ...updated[i], timestamp: time };
          }
        }

        return updated;
      });

      if (settings.editor?.autoAdvance?.enabled) {
        setActiveLineIndex(
          computeNextIndex(lines, activeLineIndex, settings.editor?.autoAdvance?.skipBlank),
        );
      }
    }
  }, [
    activeLineIndex,
    lines,
    playbackPosition,
    playerRef,
    setLines,
    setActiveLineIndex,
    settings.editor?.autoAdvance?.enabled,
    settings.editor?.autoAdvance?.skipBlank,
    editorMode,
    awaitingEndMark,
    focusedTimestamp,
    settings.editor?.autoPauseOnMark,
    settings.editor?.srt?.snapToNextLine,
    settings.editor?.srt?.minSubtitleGap,
  ]);

  // ——— Shortcut handler (sync mode) ———
  useEffect(() => {
    if (!syncMode) return;

    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const handleNudge = (delta) => {
        if (focusedTimestamp) {
          shiftTime(focusedTimestamp.lineIndex, delta);
        } else if (selectedLines.size > 0) {
          setLines((prev) => applyBulkShift(prev, selectedLines, delta));
        } else {
          shiftTime(activeLineIndex, delta);
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
        handleNudge(settings.editor?.nudge?.fine || 0.01);
      } else if (matchKey(e, settings.shortcuts?.nudgeLeft?.[0] || 'ArrowLeft')) {
        e.preventDefault();
        handleNudge(-(settings.editor?.nudge?.default || 0.1));
      } else if (matchKey(e, settings.shortcuts?.nudgeRight?.[0] || 'ArrowRight')) {
        e.preventDefault();
        handleNudge(settings.editor?.nudge?.default || 0.1);
      } else if (e.key === 'Escape' && focusedTimestamp) {
        e.preventDefault();
        setFocusedTimestamp(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    syncMode,
    activeLineIndex,
    lines.length,
    handleMark,
    shiftTime,
    selectedLines,
    settings.editor?.nudge?.default,
    settings.editor?.nudge?.fine,
    setLines,
    focusedTimestamp,
    settings.shortcuts?.mark,
    settings.shortcuts?.nudgeLeft,
    settings.shortcuts?.nudgeRight,
    settings.shortcuts?.nudgeLeftFine,
    settings.shortcuts?.nudgeRightFine,
  ]);

  // ——— Auto-scroll to active line ———
  useEffect(() => {
    if (!activeLineRef.current || !listRef.current) return;
    if (settings.editor?.scroll?.alignment === 'none') return;

    const container = listRef.current;
    const element = activeLineRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const elementTop = elementRect.top - containerRect.top + container.scrollTop;
    let scrollTo = container.scrollTop;

    if (settings.editor?.scroll?.alignment === 'center') {
      scrollTo = elementTop - containerRect.height / 2 + elementRect.height / 2;
    } else if (settings.editor?.scroll?.alignment === 'start') {
      scrollTo = elementTop;
    } else if (settings.editor?.scroll?.alignment === 'end') {
      scrollTo = elementTop - containerRect.height + elementRect.height;
    } else {
      if (elementRect.top < containerRect.top) scrollTo = elementTop;
      else if (elementRect.bottom > containerRect.bottom)
        scrollTo = elementTop - containerRect.height + elementRect.height;
    }

    container.scrollTo({ top: scrollTo, behavior: settings.editor?.scroll?.mode || 'smooth' });
  }, [activeLineIndex, settings.editor?.scroll?.mode, settings.editor?.scroll?.alignment]);

  // ——— Line operations ———

  const handleClearLine = useCallback(
    (index) => {
      setLines((prev) => clearLineTimestamp(prev, index, editorMode === 'srt'));
    },
    [setLines, editorMode],
  );

  const handleClearTimestamps = () => {
    requestConfirm(t('confirmClearTimestamps') || 'Clear all timestamps?', () => {
      setLines((prev) => clearAllTimestamps(prev, editorMode === 'srt'));
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
      setLines((prev) => {
        const newLines = prev.filter((_, i) => i !== index);
        setActiveLineIndex((prevIdx) => {
          if (prevIdx > index) return prevIdx - 1;
          if (prevIdx === index) return Math.max(0, Math.min(prevIdx, newLines.length - 1));
          return prevIdx;
        });
        return newLines;
      });
      setEditingLineIndex(null);
    });
  };

  const handleAddLine = useCallback(
    (index) => {
      setLines((prev) => {
        const updated = [...prev];
        updated.splice(index + 1, 0, {
          text: '',
          timestamp: prev[index].timestamp,
          id: crypto.randomUUID(),
        });
        return updated;
      });
    },
    [setLines],
  );

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

  // ——— Global offset ———

  const handleApplyOffset = () => {
    const delta = parseFloat(offsetValue);
    if (isNaN(delta) || delta === 0) return;
    setLines((prev) => applyGlobalOffset(prev, delta));
    setOffsetValue('');
  };

  // ——— Selection ———

  const handleLineClick = (i, e) => {
    // Modifier keys: handle selection without touching lock
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      setActiveLineIndex(i);
      if (e.shiftKey && lastClickedRef.current != null) {
        const start = Math.min(lastClickedRef.current, i);
        const end = Math.max(lastClickedRef.current, i);
        setSelectedLines((prev) => {
          const next = new Set(prev);
          for (let idx = start; idx <= end; idx++) next.add(idx);
          return next;
        });
      } else if (e.ctrlKey || e.metaKey) {
        setSelectedLines((prev) => {
          const next = new Set(prev);
          if (next.has(i)) next.delete(i);
          else next.add(i);
          return next;
        });
      }
      lastClickedRef.current = i;
      return;
    }

    // Plain click: toggle lock
    if (isActiveLineLocked && activeLineIndex === i) {
      // Clicking the locked active line unlocks
      setIsActiveLineLocked(false);
    } else {
      // Lock onto the clicked line
      setActiveLineIndex(i);
      setIsActiveLineLocked(true);
      setHoveredLineIndex(null);
    }
    lastClickedRef.current = i;
  };

  const clearSelection = useCallback(() => {
    setSelectedLines(new Set());
  }, []);

  const handleBulkClearTimestamps = useCallback(() => {
    requestConfirm(t('confirmBulkClear') || 'Clear timestamps for selected lines?', () => {
      setLines((prev) =>
        prev.map((l, idx) =>
          selectedLines.has(idx)
            ? { ...l, timestamp: null, ...(editorMode === 'srt' && { endTime: null }) }
            : l,
        ),
      );
      clearSelection();
    });
  }, [selectedLines, editorMode, setLines, clearSelection, requestConfirm, t]);

  const handleBulkDelete = useCallback(() => {
    requestConfirm(t('confirmBulkDelete') || 'Delete selected lines?', () => {
      setLines((prev) => prev.filter((_, idx) => !selectedLines.has(idx)));
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
    setLines((prev) => applyBulkShift(prev, selectedLines, delta));
  };

  // ——— Global keybinds ———
  useEffect(() => {
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
            const newLines = prev.filter((_, i) => i !== activeLineIndex);
            setActiveLineIndex((prevIndex) =>
              Math.max(0, Math.min(prevIndex, newLines.length - 1)),
            );
            return newLines;
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
  }, [
    selectedLines,
    handleBulkDelete,
    clearSelection,
    settings.shortcuts?.deleteLine,
    settings.shortcuts?.addLine,
    settings.shortcuts?.clearTimestamp,
    settings.shortcuts?.switchMode,
    activeLineIndex,
    lines.length,
    handleAddLine,
    handleBulkClearTimestamps,
    handleClearLine,
    editorMode,
    setEditorMode,
    updateSetting,
    setLines,
    setActiveLineIndex,
  ]);

  return {
    // state
    rawText,
    setRawText,
    editingLineIndex,
    setEditingLineIndex,
    editingText,
    setEditingText,
    dragIndex,
    dragOverIndex,
    offsetValue,
    setOffsetValue,
    selectedLines,
    setSelectedLines,
    awaitingEndMark,
    focusedTimestamp,
    setFocusedTimestamp,
    displayedActiveIndex,
    isActiveLineLocked,
    handleLineHover,
    handleLineHoverEnd,
    // refs
    activeLineRef,
    listRef,
    fileInputRef,
    // handlers
    handleConfirmLyrics,
    handleFileUpload,
    shiftTime,
    handleMark,
    handleClearLine,
    handleClearTimestamps,
    handleSaveLineText,
    handleDeleteLine,
    handleAddLine,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    handleApplyOffset,
    handleLineClick,
    clearSelection,
    handleBulkClearTimestamps,
    handleBulkDelete,
    handleBulkShift,
    // extras
    requestConfirm,
    confirmModal,
    settings,
    t,
    updateSetting,
  };
}
