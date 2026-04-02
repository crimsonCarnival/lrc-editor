import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/useSettings';
import useHistory from './useHistory';
import useConfirm from './useConfirm';
import { inferEndTimes, parseLrcSrtFile } from '../utils/lrc';
import { matchKey } from '../utils/keyboard';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function useAppState() {
  const { t, i18n } = useTranslation();
  const { settings, updateSetting } = useSettings();

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
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [sessionYtUrl, setSessionYtUrl] = useState('');
  const [restoredYtUrl, setRestoredYtUrl] = useState('');
  const [restoredPosition, setRestoredPosition] = useState(0);
  const [restoredSpeed, setRestoredSpeed] = useState(1);
  const maxDragDepth = useRef(0);
  const lastLoopSeekRef = useRef(0);

  const playerRef = useRef(null);
  const langMenuRef = useRef(null);
  const [requestConfirm, confirmModal] = useConfirm();

  // ——— Manual save ———
  // Build an ISO-8601 string in the local timezone, e.g. "2026-03-30T20:46:37.191-05:00"
  function toLocalISOString(date, utcOffset) {
    const [sign, hh, mm] = utcOffset.match(/([+-])(\d{2}):(\d{2})/).slice(1);
    const offsetMs = (sign === '-' ? -1 : 1) * (Number(hh) * 60 + Number(mm)) * 60000;
    const local = new Date(date.getTime() + offsetMs);
    return local.toISOString().replace('Z', utcOffset);
  }

  const buildSessionPayload = useCallback(() => {
    const tzSetting = settings.advanced.timezone;
    const tz = (!tzSetting || tzSetting === 'auto')
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : tzSetting;

    // Compute UTC offset for the resolved timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    // offsetPart is like "GMT-5" or "GMT+5:30" — normalize to ±HH:MM
    const match = offsetPart.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);
    let utcOffset = '+00:00';
    if (match) {
      const sign = match[1] || '+';
      const hrs = match[2].padStart(2, '0');
      const mins = (match[3] || '0').padStart(2, '0');
      utcOffset = `${sign}${hrs}:${mins}`;
    }

    return {
      lines: lines.map((l) => ({
        ...l,
        timestamp: typeof l.timestamp === 'number' ? Math.round(l.timestamp * 1000) / 1000 : l.timestamp,
        endTime: editorMode === 'srt'
          ? (typeof l.endTime === 'number' ? Math.round(l.endTime * 1000) / 1000 : (l.endTime ?? null))
          : null,
      })),
      syncMode,
      activeLineIndex,
      editorMode,
      ytUrl: sessionYtUrl || '',
      playbackPosition,
      playbackSpeed: playerRef.current?.getSpeed?.() ?? 1,
      saveTime: toLocalISOString(now, utcOffset),
      timezone: tz,
      utcOffset,
    };
  }, [lines, syncMode, activeLineIndex, editorMode, settings.advanced.timezone, sessionYtUrl, playbackPosition]);

  const handleManualSave = useCallback(() => {
    localStorage.setItem('lrc-syncer-session', JSON.stringify(buildSessionPayload()));
  }, [buildSessionPayload]);

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

  // ——— Auto-save (action-count based) ———
  const actionCountRef = useRef(0);
  // Sync latest volatile values so the lines-only effect never captures stale closures
  const autoSaveRef = useRef(null);
  useEffect(() => {
    autoSaveRef.current = {
      pendingSession,
      enabled: settings.advanced.autoSave.enabled,
      interval: settings.advanced.autoSave.interval ?? 10,
      buildPayload: buildSessionPayload,
    };
  });
  useEffect(() => {
    const s = autoSaveRef.current;
    if (!s || s.pendingSession !== null || !lines.length || !s.enabled) return;
    actionCountRef.current += 1;
    if (actionCountRef.current < s.interval) return;
    actionCountRef.current = 0;
    localStorage.setItem('lrc-syncer-session', JSON.stringify(s.buildPayload()));
    setIsAutosaving(true);
    setTimeout(() => setIsAutosaving(false), 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const handleRestoreSession = () => {
    if (pendingSession) {
      // Validate line shape before restoring
      const validLines = pendingSession.lines.filter(
        (l) => l && typeof l === 'object' && typeof l.text === 'string',
      ).map((l) => ({
        text: l.text,
        timestamp: typeof l.timestamp === 'number' && isFinite(l.timestamp) ? l.timestamp : null,
        endTime: typeof l.endTime === 'number' && isFinite(l.endTime) ? l.endTime : undefined,
        secondary: typeof l.secondary === 'string' ? l.secondary : '',
        translation: typeof l.translation === 'string' ? l.translation : '',
        id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
      }));
      if (validLines.length === 0) {
        setPendingSession(null);
        return;
      }
      setLines(validLines);
      if (pendingSession.syncMode) setSyncMode(pendingSession.syncMode);
      const idx = pendingSession.activeLineIndex;
      if (typeof idx === 'number' && idx >= 0 && idx < validLines.length) {
        setActiveLineIndex(idx);
      }
      // Restore editorMode, auto-detect SRT if lines have endTime
      const restoredMode = pendingSession.editorMode
        || (validLines.some((l) => l.endTime != null) ? 'srt' : 'lrc');
      setEditorModeRaw(restoredMode);
      // Restore YouTube URL and playback state
      if (pendingSession.ytUrl) setRestoredYtUrl(pendingSession.ytUrl);
      if (typeof pendingSession.playbackPosition === 'number') setRestoredPosition(pendingSession.playbackPosition);
      if (typeof pendingSession.playbackSpeed === 'number') setRestoredSpeed(pendingSession.playbackSpeed);
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
        // Do NOT clear lines or syncMode — editor content is independent of media
        setPlaybackPosition(0);
        setDuration(0);
        setMediaTitle('');
      }
    },
    [],
  );

  // ——— Global keyboard shortcuts ———
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (matchKey(e, settings.shortcuts?.showHelp?.[0] || '?')) {
        setShowKeyboardHelp((prev) => !prev);
      // ——— Player shortcuts ———
      } else if (matchKey(e, settings.shortcuts?.playPause?.[0] || 'Enter')) {
        e.preventDefault();
        playerRef.current?.togglePlay?.();
      } else if (matchKey(e, settings.shortcuts?.seekBackward?.[0] || 'ArrowLeft')) {
        e.preventDefault();
        const cur = playerRef.current?.getCurrentTime?.() ?? 0;
        playerRef.current?.seek?.(Math.max(0, cur - (settings.playback?.seekTime ?? 5)));
      } else if (matchKey(e, settings.shortcuts?.seekForward?.[0] || 'ArrowRight')) {
        e.preventDefault();
        const cur = playerRef.current?.getCurrentTime?.() ?? 0;
        playerRef.current?.seek?.(cur + (settings.playback?.seekTime ?? 5));
      } else if (matchKey(e, settings.shortcuts?.mute?.[0] || 'm')) {
        e.preventDefault();
        updateSetting('playback.muted', !settings.playback.muted);
      } else if (matchKey(e, settings.shortcuts?.speedUp?.[0] || '+')) {
        e.preventDefault();
        playerRef.current?.adjustSpeed?.(settings.editor?.nudge?.default ?? 0.1);
      } else if (matchKey(e, settings.shortcuts?.speedDown?.[0] || '-')) {
        e.preventDefault();
        playerRef.current?.adjustSpeed?.(-(settings.editor?.nudge?.default ?? 0.1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, settings, updateSetting, playerRef]);

  // ——— Block disruptive browser shortcuts ———
  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      // Ctrl+S → manual save instead of browser save dialog
      if (key === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleManualSave();
        return;
      }
      // Block: bookmark (D), history (H), downloads (J), print (P), view-source (U)
      if (!e.shiftKey && !e.altKey && ['d', 'h', 'j', 'p', 'u'].includes(key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleManualSave]);

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

  const handleYtUrlChange = useCallback((url) => {
    setSessionYtUrl(url || '');
  }, []);

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
          toast.error(t('import.tooLarge') || 'File too large (max 5 MB)');
          return;
        }

        try {
          const text = await file.text();
          const parsedLines = parseLrcSrtFile(text, file.name);

          if (parsedLines.length === 0) {
            toast.error(t('import.noLines') || 'No lyrics found in file');
            return;
          }

          const applyImport = () => {
            setLines(parsedLines);
            setEditorModeRaw(extension === 'srt' ? 'srt' : 'lrc');
            toast.success(
              t('import.success', { count: parsedLines.length }) || `Imported ${parsedLines.length} lines`,
            );
          };

          if (lines.length > 0 && settings.advanced.confirmDestructive) {
            requestConfirm(t('confirm.removeAll') || 'Replace existing lyrics?', applyImport);
          } else {
            applyImport();
          }
        } catch (err) {
          console.error('Failed to parse dropped lyrics file', err);
          toast.error(t('import.failed') || 'Failed to parse lyrics file');
        }
      }
    },
    [lines.length, setLines, settings.advanced.confirmDestructive, t, requestConfirm],
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
    handleYtUrlChange,
    restoredYtUrl,
    restoredPosition,
    restoredSpeed,
    confirmModal,
    isAutosaving,
  };
}
