import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/useSettings';
import useHistory from '../utils/useHistory';
import { inferEndTimes, parseLrcSrtFile } from '../utils/lrc';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function useAppState() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();

  // ——— Theme ———
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      if (settings.interface.theme === 'light') {
        root.classList.remove('dark');
      } else if (settings.interface.theme === 'system') {
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      } else {
        root.classList.add('dark');
      }
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [settings.interface.theme]);

  // ——— Lines state with undo/redo ———
  const [lines, setLines, undo, redo, canUndo, canRedo] = useHistory([], {
    limit: settings.advanced?.history?.limit || 50,
    groupingThresholdMs: settings.advanced?.history?.groupingThresholdMs || 500,
  });

  const [syncMode, setSyncMode] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaTitle, setMediaTitle] = useState('');
  const [hasMedia, setHasMedia] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingSession, setPendingSession] = useState(() => {
    try {
      const saved = localStorage.getItem('lrc-syncer-session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lines && parsed.lines.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse session data', e);
    }
    return null;
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [editorMode, setEditorModeRaw] = useState('lrc');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const maxDragDepth = useRef(0);
  const lastLoopSeekRef = useRef(0);

  const playerRef = useRef(null);
  const langMenuRef = useRef(null);

  // ——— Manual save ———
  const handleManualSave = useCallback(() => {
    localStorage.setItem(
      'lrc-syncer-session',
      JSON.stringify({
        lines,
        syncMode,
        activeLineIndex,
        editorMode,
        timestamp: Date.now(),
      }),
    );
  }, [lines, syncMode, activeLineIndex, editorMode]);

  // ——— Mode switching with end-time inference ———
  const setEditorMode = useCallback(
    (mode) => {
      if (mode === 'srt' && editorMode !== 'srt') {
        setLines((prev) => inferEndTimes(prev, duration, settings.editor?.srt));
      }
      setEditorModeRaw(mode);
    },
    [editorMode, duration, setLines, settings.editor?.srt],
  );

  // ——— Auto-save ———
  useEffect(() => {
    if (pendingSession !== null || !lines.length || !settings.advanced.autoSave.enabled) return;
    const timeoutId = setTimeout(() => {
      localStorage.setItem(
        'lrc-syncer-session',
        JSON.stringify({
          lines,
          syncMode,
          activeLineIndex,
          editorMode,
          timestamp: Date.now(),
        }),
      );
    }, settings.advanced.autoSave.interval);
    return () => clearTimeout(timeoutId);
  }, [
    lines,
    syncMode,
    activeLineIndex,
    editorMode,
    pendingSession,
    settings.advanced.autoSave.enabled,
    settings.advanced.autoSave.interval,
  ]);

  const handleRestoreSession = () => {
    if (pendingSession) {
      setLines(pendingSession.lines);
      if (pendingSession.syncMode) setSyncMode(pendingSession.syncMode);
      if (pendingSession.activeLineIndex != null) setActiveLineIndex(pendingSession.activeLineIndex);
      // Restore editorMode, auto-detect SRT if lines have endTime
      const restoredMode = pendingSession.editorMode
        || (pendingSession.lines.some(l => l.endTime != null) ? 'srt' : 'lrc');
      setEditorModeRaw(restoredMode);
    }
    setPendingSession(null);
  };

  const handleDiscardSession = () => {
    localStorage.removeItem('lrc-syncer-session');
    setPendingSession(null);
  };

  // ——— Clear all data when media is removed ———
  const handleMediaChange = useCallback(
    (loaded) => {
      setHasMedia(loaded);
      if (!loaded) {
        setLines([]);
        setSyncMode(false);
        setActiveLineIndex(0);
        setPlaybackPosition(0);
        setDuration(0);
        setMediaTitle('');
      }
    },
    [setLines],
  );

  // ——— Global Undo/Redo keyboard shortcut ———
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === '?') {
        setShowKeyboardHelp((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ——— Close language menu on outside click ———
  useEffect(() => {
    if (!showLangMenu) return;
    const handler = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLangMenu]);

  const handleTimeUpdate = useCallback((time) => {
    setPlaybackPosition(time);
  }, []);

  const handleDurationChange = useCallback((d) => {
    setDuration(d);
  }, []);

  // ——— Loop Current Line ———
  useEffect(() => {
    if (
      !settings.playback?.loopCurrentLine ||
      !syncMode ||
      !lines[activeLineIndex] ||
      lines[activeLineIndex].timestamp == null
    )
      return;

    const currentLine = lines[activeLineIndex];
    let endMark = currentLine.endTime;

    if (editorMode !== 'srt' || endMark == null) {
      const nextLine = lines.slice(activeLineIndex + 1).find((l) => l.timestamp != null);
      if (nextLine) endMark = nextLine.timestamp;
    }

    if (endMark != null && playbackPosition >= endMark) {
      const now = Date.now();
      if (now - lastLoopSeekRef.current > 200) {
        lastLoopSeekRef.current = now;
        playerRef.current?.seek(currentLine.timestamp);
      }
    }
  }, [playbackPosition, settings.playback?.loopCurrentLine, syncMode, lines, activeLineIndex, editorMode]);

  // ——— Drag & Drop ———
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    maxDragDepth.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    maxDragDepth.current -= 1;
    if (maxDragDepth.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      maxDragDepth.current = 0;
      setIsDraggingFile(false);

      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      if (file.type.startsWith('audio/')) {
        if (playerRef.current?.loadLocalAudio) {
          playerRef.current.loadLocalAudio(file);
        }
        return;
      }

      const extension = file.name.split('.').pop().toLowerCase();

      if (['lrc', 'srt'].includes(extension)) {
        if (file.size > MAX_IMPORT_FILE_SIZE) {
          toast.error(t('fileTooLarge') || 'File too large (max 5 MB)');
          return;
        }

        try {
          const text = await file.text();
          const parsedLines = parseLrcSrtFile(text, file.name);

          if (parsedLines.length === 0) {
            toast.error(t('noLinesFound') || 'No lyrics found in file');
            return;
          }

          if (lines.length > 0 && settings.advanced.confirmDestructive) {
            if (!window.confirm(t('confirmRemoveAll') || 'Replace existing lyrics?')) {
              return;
            }
          }

          setLines(parsedLines);
          setEditorModeRaw(extension === 'srt' ? 'srt' : 'lrc');
          toast.success(
            t('importedLines', { count: parsedLines.length }) || `Imported ${parsedLines.length} lines`,
          );
        } catch (err) {
          console.error('Failed to parse dropped lyrics file', err);
          toast.error(t('importFailed') || 'Failed to parse lyrics file');
        }
      }
    },
    [lines.length, setLines, settings.advanced.confirmDestructive, t],
  );

  // ——— Register drag listeners ———
  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return {
    t,
    i18n,
    settings,
    lines,
    setLines,
    undo,
    redo,
    canUndo,
    canRedo,
    syncMode,
    setSyncMode,
    activeLineIndex,
    setActiveLineIndex,
    playbackPosition,
    duration,
    mediaTitle,
    setMediaTitle,
    hasMedia,
    showKeyboardHelp,
    setShowKeyboardHelp,
    showSettings,
    setShowSettings,
    pendingSession,
    showLangMenu,
    setShowLangMenu,
    editorMode,
    setEditorMode,
    isDraggingFile,
    playerRef,
    langMenuRef,
    handleManualSave,
    handleRestoreSession,
    handleDiscardSession,
    handleMediaChange,
    handleTimeUpdate,
    handleDurationChange,
  };
}
