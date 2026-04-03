import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { parseLrcSrtFile } from '../../utils/lrc';
import { matchKey } from '../../utils/keyboard';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import useConfirm from '../../hooks/useConfirm';
import {
  applyBulkShift,
  applyGlobalOffset,
  clearAllTimestamps,
  clearLineTimestamp,
  applyMark,
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
  onImport,
}) {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();
  const [rawText, setRawText] = useState('');
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingSecondary, setEditingSecondary] = useState('');
  const [editingTranslation, setEditingTranslation] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
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
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  const [requestConfirm, confirmModal] = useConfirm();

  const lastClickedRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stable refs to avoid recreating handleMark/keyboard effects on every frame
  const linesRef = useRef(lines);
  const playbackPositionRef = useRef(playbackPosition);
  const activeLineIndexRef = useRef(activeLineIndex);
  const focusedTimestampRef = useRef(focusedTimestamp);
  const selectedLinesRef = useRef(selectedLines);
  const activeWordIndexRef = useRef(0);
  useEffect(() => {
    linesRef.current = lines;
    playbackPositionRef.current = playbackPosition;
    activeLineIndexRef.current = activeLineIndex;
    focusedTimestampRef.current = focusedTimestamp;
    selectedLinesRef.current = selectedLines;
    activeWordIndexRef.current = activeWordIndex;
  });

  // Sync active word cursor with lines (covers undo/redo restoring a previous stamp state)
  useEffect(() => {
    if (editorMode !== 'words') {
      setActiveWordIndex(0);
      activeWordIndexRef.current = 0;
      return;
    }
    const words = lines[activeLineIndex]?.words;
    if (!words?.length) {
      setActiveWordIndex(0);
      activeWordIndexRef.current = 0;
      return;
    }
    const idx = words.findIndex((w) => w.time == null);
    const newIdx = idx === -1 ? words.length : idx;
    setActiveWordIndex(newIdx);
    activeWordIndexRef.current = newIdx;
  }, [activeLineIndex, lines, editorMode]);

  // When switching to words mode, ensure every line has a words array
  useEffect(() => {
    if (editorMode === 'words') {
      setLines((prev) =>
        prev.map((line) => {
          if (line.words?.length) return line;
          const tokens = (line.text || '').trim().split(/\s+/).filter(Boolean);
          if (!tokens.length) return line;
          return { ...line, words: tokens.map((word) => ({ word, time: null })) };
        })
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode]);

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
    const looksLikeLrc = /^\[(\d{1,2}):(\d{2}\.\d{2,3})\]/m.test(rawText);
    const looksLikeSrt = /^\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->/m.test(rawText);
    const looksLikeWordLrc = looksLikeLrc && /<\d{1,2}:\d{2}\.\d{2,3}>/.test(rawText);
    if (looksLikeLrc || looksLikeSrt) {
      const filename = looksLikeSrt ? 'lyrics.srt' : 'lyrics.lrc';
      const parsed = parseLrcSrtFile(rawText, filename);
      if (parsed.length > 0) {
        setLines(parsed);
        if (looksLikeSrt) setEditorMode('srt');
        else if (looksLikeWordLrc) setEditorMode('words');
        else setEditorMode('lrc');
        setActiveLineIndex(Math.max(0, parsed.findIndex((l) => l.timestamp == null)));
        setSyncMode(true);
        return;
      }
    }
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
          {
            const isSrt = file.name.toLowerCase().endsWith('.srt');
            const hasWords = !isSrt && parsed.some(l => l.words?.length > 0);
            setEditorMode(isSrt ? 'srt' : hasWords ? 'words' : 'lrc');
          }
          setActiveLineIndex(Math.max(0, parsed.findIndex((l) => l.timestamp == null)));
          setSyncMode(true);
          toast.success(t('import.success', { count: parsed.length }) || `Imported ${parsed.length} lines`);
          onImport?.();
        } else {
          toast.error(t('import.noLines') || 'No lyrics found in file');
        }
      } catch (err) {
        console.error('Failed to parse lyrics file', err);
        toast.error(t('import.failed') || 'Failed to parse lyrics file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUrlImport = async (url) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      return { error: t('import.invalidUrl') || 'Invalid URL. Use http:// or https://' };
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const filename = parsedUrl.pathname.split('/').pop() || 'lyrics.lrc';
      const parsed = parseLrcSrtFile(text, filename);
      if (parsed.length === 0) {
        return { error: t('import.noLines') || 'No lyrics found in file' };
      }
      setLines(parsed);
      {
        const isSrt = filename.toLowerCase().endsWith('.srt');
        const hasWords = !isSrt && parsed.some(l => l.words?.length > 0);
        setEditorMode(isSrt ? 'srt' : hasWords ? 'words' : 'lrc');
      }
      setActiveLineIndex(Math.max(0, parsed.findIndex((l) => l.timestamp == null)));
      setSyncMode(true);
      toast.success(t('import.success', { count: parsed.length }) || `Imported ${parsed.length} lines`);
      onImport?.();
      return { success: true };
    } catch {
      return { error: t('import.fetchError') || 'Failed to fetch. The server may not allow cross-origin requests.' };
    }
  };

  // ——— Timestamp operations ———

  const shiftTime = useCallback(
    (index, delta) => {
      const numericDelta = Number(delta) || 0;
      const currentLines = linesRef.current;
      if (!currentLines[index]) return;

      // Compute target time before updating state — state updaters must be pure
      let targetTime = null;
      if (
        focusedTimestamp?.lineIndex === index &&
        focusedTimestamp.type === 'end' &&
        currentLines[index].endTime != null
      ) {
        const newEndTime = Math.max(0, Number(currentLines[index].endTime) + numericDelta);
        if (!isNaN(newEndTime)) targetTime = newEndTime;
      } else if (currentLines[index].timestamp != null) {
        const newTimestamp = Math.max(0, Number(currentLines[index].timestamp) + numericDelta);
        if (!isNaN(newTimestamp)) targetTime = newTimestamp;
      }

      setLines((prev) => {
        const updated = [...prev];
        if (!updated[index]) return prev;

        if (
          focusedTimestamp?.lineIndex === index &&
          focusedTimestamp.type === 'end' &&
          updated[index].endTime != null
        ) {
          const newEndTime = Math.max(0, Number(updated[index].endTime) + numericDelta);
          if (!isNaN(newEndTime)) updated[index] = { ...updated[index], endTime: newEndTime };
        } else if (updated[index].timestamp != null) {
          const newTimestamp = Math.max(0, Number(updated[index].timestamp) + numericDelta);
          if (!isNaN(newTimestamp)) updated[index] = { ...updated[index], timestamp: newTimestamp };
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
    const currentLines = linesRef.current;
    const idx = activeLineIndexRef.current;
    if (idx >= currentLines.length) return;
    const time = playerRef?.current?.getCurrentTime?.() ?? playbackPositionRef.current;

    if (settings.editor?.autoPauseOnMark) {
      playerRef?.current?.pause?.();
    }

    const result = applyMark({
      lines: currentLines,
      activeLineIndex: idx,
      time,
      editorMode,
      activeWordIndex: activeWordIndexRef.current,
      awaitingEndMark,
      focusedTimestamp: focusedTimestampRef.current,
      settings: settings.editor || {},
    });

    setLines(result.nextLines);
    if (result.nextActiveLineIndex != null) {
      setActiveLineIndex(result.nextActiveLineIndex);
    }
    if (result.nextAwaitingEndMark !== undefined) {
      setAwaitingEndMarkFor(result.nextAwaitingEndMark);
    }
    if (result.nextActiveWordIndex !== undefined) {
      setActiveWordIndex(result.nextActiveWordIndex);
      activeWordIndexRef.current = result.nextActiveWordIndex;
    }
    // Clear focused timestamp after each mark — it's a one-shot action
    if (focusedTimestampRef.current) {
      setFocusedTimestamp(null);
      focusedTimestampRef.current = null;
    }
  }, [
    playerRef,
    setLines,
    setActiveLineIndex,
    editorMode,
    awaitingEndMark,
    settings.editor,
  ]);

  // ——— Shortcut handler (sync mode) ———
  useEffect(() => {
    if (!syncMode) return;

    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const handleNudge = (delta) => {
        const ft = focusedTimestampRef.current;
        if (ft) {
          shiftTime(ft.lineIndex, delta);
        } else if (selectedLinesRef.current.size > 0) {
          setLines((prev) => applyBulkShift(prev, selectedLinesRef.current, delta));
        } else {
          shiftTime(activeLineIndexRef.current, delta);
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
      } else if (matchKey(e, settings.shortcuts?.nudgeLeft?.[0] || 'Alt+ArrowLeft')) {
        e.preventDefault();
        handleNudge(-(settings.editor?.nudge?.default || 0.1));
      } else if (matchKey(e, settings.shortcuts?.nudgeRight?.[0] || 'Alt+ArrowRight')) {
        e.preventDefault();
        handleNudge(settings.editor?.nudge?.default || 0.1);
      } else if (matchKey(e, settings.shortcuts?.deselect?.[0] || 'Escape') && focusedTimestampRef.current) {
        e.preventDefault();
        setFocusedTimestamp(null);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const modes = ['lrc', 'srt', 'words'];
        setEditorMode((prev) => modes[(modes.indexOf(prev) + 1) % modes.length]);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    syncMode,
    handleMark,
    shiftTime,
    settings.editor?.nudge?.default,
    settings.editor?.nudge?.fine,
    setLines,
    settings.shortcuts?.mark,
    settings.shortcuts?.nudgeLeft,
    settings.shortcuts?.nudgeRight,
    settings.shortcuts?.nudgeLeftFine,
    settings.shortcuts?.nudgeRightFine,
    settings.shortcuts?.deselect,
    setEditorMode,
  ]);

  // ——— Line operations ———

  const handleClearLine = useCallback(
    (index) => {
      setLines((prev) => clearLineTimestamp(prev, index, editorMode === 'srt', editorMode === 'words'));
    },
    [setLines, editorMode],
  );

  const handleClearTimestamps = () => {
    requestConfirm(t('confirm.clearTimestamps') || 'Clear all timestamps?', () => {
      setLines((prev) => clearAllTimestamps(prev, editorMode === 'srt', editorMode === 'words'));
      setActiveLineIndex(0);
    });
  };

  const handleClearAllWordTimestamps = () => {
    requestConfirm(t('confirm.clearWordTimestamps') || 'Clear all word timestamps?', () => {
      setLines((prev) => prev.map((l) =>
        l.words ? { ...l, words: l.words.map((w) => ({ ...w, time: null })) } : l
      ));
    });
  };

  const handleSaveLineText = (index, newText, newSecondary, newTranslation) => {
    setLines((prev) => {
      const updated = [...prev];
      const line = { ...updated[index], text: newText };
      if (newSecondary !== undefined) line.secondary = newSecondary;
      if (newTranslation !== undefined) line.translation = newTranslation;
      // Re-tokenize words while preserving existing timestamps by position
      if (line.words) {
        const tokens = (newText || '').trim().split(/\s+/).filter(Boolean);
        const oldWords = line.words;
        line.words = tokens.map((word, i) => ({ word, time: oldWords[i]?.time ?? null }));
      }
      updated[index] = line;
      return updated;
    });
  };

  const handleDeleteLine = (index) => {
    requestConfirm(t('confirm.deleteLine') || 'Delete this line?', () => {
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

  const handleApplyOffset = useCallback((direction) => {
    const amount = settings.editor?.shiftAllAmount ?? 0.5;
    const delta = direction * amount;
    setLines((prev) => applyGlobalOffset(prev, delta));
  }, [settings.editor?.shiftAllAmount, setLines]);

  // ——— Selection ———

  const handleLineClick = (i, e) => {
    const rangeKey = settings.shortcuts?.rangeSelect?.[0] || 'Shift';
    const toggleKey = settings.shortcuts?.toggleSelect?.[0] || 'Ctrl';
    const modActive = (mod) => {
      if (mod === 'Shift') return e.shiftKey;
      if (mod === 'Ctrl') return e.ctrlKey || e.metaKey;
      if (mod === 'Alt') return e.altKey;
      return false;
    };
    const isRange = modActive(rangeKey);
    const isToggle = modActive(toggleKey);

    // Modifier keys: handle selection without touching lock
    if (isRange || isToggle) {
      setActiveLineIndex(i);
      if (isRange && lastClickedRef.current != null) {
        const start = Math.min(lastClickedRef.current, i);
        const end = Math.max(lastClickedRef.current, i);
        setSelectedLines((prev) => {
          const next = new Set(prev);
          for (let idx = start; idx <= end; idx++) next.add(idx);
          return next;
        });
      } else if (isToggle) {
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

  const handleToggleLine = useCallback((i) => {
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const handleBulkClearTimestamps = useCallback(() => {
    requestConfirm(t('confirm.bulkClear') || 'Clear timestamps for selected lines?', () => {
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
    requestConfirm(t('confirm.bulkDelete') || 'Delete selected lines?', () => {
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

  const handleAddExtraTimestamp = useCallback((lineIndex) => {
    const time = playerRef?.current?.getCurrentTime?.() ?? playbackPositionRef.current;
    setLines((prev) => {
      const updated = [...prev];
      const line = updated[lineIndex];
      if (!line || line.timestamp == null) return prev;
      // Prevent adding a timestamp that already exists (within 0.05s tolerance)
      const allTs = [line.timestamp, ...(line.extraTimestamps || [])];
      if (allTs.some((t) => Math.abs(t - time) < 0.05)) return prev;
      const extras = [...(line.extraTimestamps || []), time].sort((a, b) => a - b);
      updated[lineIndex] = { ...line, extraTimestamps: extras };
      return updated;
    });
  }, [playerRef, setLines]);

  const handleRemoveExtraTimestamp = useCallback((lineIndex, tsIndex) => {
    setLines((prev) => {
      const updated = [...prev];
      const line = updated[lineIndex];
      if (!line?.extraTimestamps?.length) return prev;
      const extras = line.extraTimestamps.filter((_, i) => i !== tsIndex);
      updated[lineIndex] = { ...line, extraTimestamps: extras.length ? extras : undefined };
      return updated;
    });
  }, [setLines]);

  const handleClearWordTimestamp = useCallback((lineIndex, wordIndex) => {
    setLines((prev) => {
      const updated = [...prev];
      const line = updated[lineIndex];
      if (!line?.words) return prev;
      const newWords = [...line.words];
      newWords[wordIndex] = { ...newWords[wordIndex], time: null };
      updated[lineIndex] = { ...line, words: newWords };
      return updated;
    });
    // activeWordIndex is synced by the lines effect above
  }, [setLines]);

  const handleSetActiveWordIndex = useCallback((wordIndex) => {
    setActiveWordIndex(wordIndex);
    activeWordIndexRef.current = wordIndex;
  }, []);

  // ——— Global keybinds ———
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (matchKey(e, settings.shortcuts?.deselect?.[0] || 'Escape') && selectedLines.size > 0) {
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
    settings.shortcuts?.deselect,
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
    editingSecondary,
    setEditingSecondary,
    editingTranslation,
    setEditingTranslation,
    dragIndex,
    dragOverIndex,
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
    listRef,
    fileInputRef,
    // handlers
    handleConfirmLyrics,
    handleFileUpload,
    handleUrlImport,
    shiftTime,
    handleMark,
    handleClearLine,
    handleClearTimestamps,
    handleClearAllWordTimestamps,
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
    handleToggleLine,
    handleBulkClearTimestamps,
    handleBulkDelete,
    handleBulkShift,
    handleAddExtraTimestamp,
    handleRemoveExtraTimestamp,
    handleClearWordTimestamp,
    handleSetActiveWordIndex,
    activeWordIndex,
    // extras
    requestConfirm,
    confirmModal,
    settings,
    t,
    updateSetting,
  };
}
