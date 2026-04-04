import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/useSettings';
import useHistory from './useHistory';
import useConfirm from './useConfirm';
import { inferEndTimes, parseLrcSrtFile } from '../utils/lrc';
import { matchKey } from '../utils/keyboard';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SESSION_KEY = 'lrc-syncer-session';
const SHARED_SESSION_KEY = 'lrc-syncer-shared-session';

// ——— URL compression helpers for shareable session links ———
async function compressToBase64(str) {
  const stream = new CompressionStream('deflate');
  const writer = stream.writable.getWriter();
  writer.write(new TextEncoder().encode(str));
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function decompressFromBase64(b64) {
  const normalized = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '=='.slice(0, (4 - normalized.length % 4) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  const stream = new DecompressionStream('deflate');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  return new Response(stream.readable).text();
}

// ——— Compact v1 share format helpers ———
// Encodes lines to minimal JSON: single-char keys, no nulls/UUIDs/metadata.
function buildSharePayload(lines, editorMode, ytUrl, readOnly = true) {
  return {
    v: 1,
    m: editorMode,
    ...(ytUrl ? { y: ytUrl } : {}),
    ...(!readOnly ? { ro: 0 } : {}),
    l: lines.map((l) => {
      const entry = { t: l.text };
      if (l.timestamp != null) entry.s = l.timestamp;
      if (editorMode === 'srt' && l.endTime != null) entry.e = l.endTime;
      if (l.secondary) entry.x = l.secondary;
      if (l.translation) entry.r = l.translation;
      if (Array.isArray(l.words) && l.words.length) {
        const wArr = l.words.map((w) => {
          const we = { w: w.word };
          if (w.time != null) we.t = w.time;
          return we;
        });
        entry.w = wArr;
      }
      return entry;
    }),
  };
}

// Expands a v1 compact payload back into the full session shape.
function expandSharePayload(p) {
  const lines = (p.l || []).map((l) => ({
    text: l.t || '',
    timestamp: l.s ?? null,
    endTime: l.e ?? null,
    secondary: l.x || '',
    translation: l.r || '',
    id: crypto.randomUUID(),
    words: Array.isArray(l.w)
      ? l.w.map((w) => ({ word: w.w || '', time: w.t ?? null })).filter((w) => w.word)
      : undefined,
  }));
  return {
    lines,
    editorMode: p.m || (lines.some((l) => l.endTime != null) ? 'srt' : 'lrc'),
    ytUrl: p.y || '',
    syncMode: true,
    activeLineIndex: 0,
    playbackPosition: 0,
    playbackSpeed: 1,
    readOnly: p.ro !== 0,
  };
}

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
  // editorMode must be declared before useHistory so getCompanion can close over it
  const [editorMode, setEditorModeRaw] = useState('lrc');

  const [lines, setLines, undo, redo, canUndo, canRedo] = useHistory([], {
    limit: settings.advanced?.history?.limit || 50,
    groupingThresholdMs: settings.advanced?.history?.groupingThresholdMs || 500,
    getCompanion: () => editorMode,
    onRestoreCompanion: setEditorModeRaw,
  });

  const [syncMode, setSyncMode] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaTitle, setMediaTitle] = useState('');
  const [hasMedia, setHasMedia] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [isSharedSession, setIsSharedSession] = useState(false);
  const [sharedReadOnly, setSharedReadOnly] = useState(true);
  const [shareModal, setShareModal] = useState(null); // null | { url, ytUrl, linesCount, hasSynced, readOnly }

  const [pendingSession, setPendingSession] = useState(() => {
    // Always discard any leftover shared session (e.g. from a crash before beforeunload fired)
    localStorage.removeItem(SHARED_SESSION_KEY);
    // If a shared session hash is in the URL, skip localStorage — useEffect handles it async
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#s=')) {
      return null;
    }
    try {
      const saved = localStorage.getItem(SESSION_KEY);
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
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [sessionYtUrl, setSessionYtUrl] = useState('');
  const [restoredYtUrl, setRestoredYtUrl] = useState('');
  const [restoredPosition, setRestoredPosition] = useState(0);
  const [restoredSpeed, setRestoredSpeed] = useState(1);
  const maxDragDepth = useRef(0);
  const lastLoopSeekRef = useRef(0);
  // Refs for stale-closure-safe reads inside save callbacks and guarded setLines
  const isSharedSessionRef = useRef(false);
  const sharedReadOnlyRef = useRef(true);

  const playerRef = useRef(null);
  const langMenuRef = useRef(null);
  const [requestConfirm, confirmModal] = useConfirm();

  useEffect(() => { isSharedSessionRef.current = isSharedSession; }, [isSharedSession]);
  useEffect(() => { sharedReadOnlyRef.current = sharedReadOnly; }, [sharedReadOnly]);

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
      playbackPosition: hasMedia ? playbackPosition : 0,
      playbackSpeed: hasMedia ? (playerRef.current?.getSpeed?.() ?? 1) : 1,
      saveTime: toLocalISOString(now, utcOffset),
      timezone: tz,
      utcOffset,
    };
  }, [lines, syncMode, activeLineIndex, editorMode, settings.advanced.timezone, sessionYtUrl, playbackPosition, hasMedia]);

  const handleManualSave = useCallback(() => {
    const key = isSharedSessionRef.current ? SHARED_SESSION_KEY : SESSION_KEY;
    localStorage.setItem(key, JSON.stringify(buildSessionPayload()));
    setIsAutosaving(true);
    setTimeout(() => setIsAutosaving(false), 1200);
  }, [buildSessionPayload]);

  // ——— Save-after-import: fires after state settles from an import ———
  const [importTick, setImportTick] = useState(0);
  const manualSaveRef = useRef(null);
  useEffect(() => { manualSaveRef.current = handleManualSave; });
  useEffect(() => {
    if (importTick === 0) return;
    manualSaveRef.current?.();
  }, [importTick]);
  const triggerImportSave = useCallback(() => setImportTick((t) => t + 1), []);

  // ——— Fork from shared session on first user edit ———
  const forkFromShared = useCallback(() => {
    isSharedSessionRef.current = false;
    setIsSharedSession(false);
    localStorage.removeItem(SHARED_SESSION_KEY);
  }, []);

  // Guarded setLines: blocks edits when read-only, forks to personal on first edit
  const setLinesGuarded = useCallback((updater) => {
    if (isSharedSessionRef.current && sharedReadOnlyRef.current) return;
    if (isSharedSessionRef.current && !sharedReadOnlyRef.current) forkFromShared();
    setLines(updater);
  }, [setLines, forkFromShared]);

  // ——— Shared session URL: decode hash on mount ———
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#s=')) return;
    const encoded = hash.slice(3);
    // Clear the hash immediately so it doesn't persist after restore
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    decompressFromBase64(encoded)
      .then((text) => {
        const raw = JSON.parse(text);
        // Support both compact v1 format and legacy full format
        const parsed = raw.v === 1 ? expandSharePayload(raw) : raw;
        if (!parsed.lines?.length) return;
        const validLines = parsed.lines.filter(
          (l) => l && typeof l === 'object' && typeof l.text === 'string',
        ).map((l) => ({
          text: l.text,
          timestamp: typeof l.timestamp === 'number' && isFinite(l.timestamp) ? l.timestamp : null,
          endTime: typeof l.endTime === 'number' && isFinite(l.endTime) ? l.endTime : undefined,
          secondary: typeof l.secondary === 'string' ? l.secondary : '',
          translation: typeof l.translation === 'string' ? l.translation : '',
          id: typeof l.id === 'string' ? l.id : crypto.randomUUID(),
          words: Array.isArray(l.words) ? l.words.map((w) => ({
            word: typeof w.word === 'string' ? w.word : '',
            time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null,
            ...(typeof w.reading === 'string' && w.reading ? { reading: w.reading } : {}),
          })).filter((w) => w.word) : undefined,
        }));
        if (validLines.length === 0) return;
        setLines(validLines);
        if (parsed.syncMode) setSyncMode(parsed.syncMode);
        const idx = parsed.activeLineIndex;
        if (typeof idx === 'number' && idx >= 0 && idx < validLines.length) {
          setActiveLineIndex(idx);
        }
        const restoredMode = parsed.editorMode
          || (validLines.some((l) => l.endTime != null) ? 'srt' : 'lrc');
        setEditorModeRaw(restoredMode);
        if (parsed.ytUrl) setRestoredYtUrl(parsed.ytUrl);
        if (typeof parsed.playbackPosition === 'number') setRestoredPosition(parsed.playbackPosition);
        if (typeof parsed.playbackSpeed === 'number') setRestoredSpeed(parsed.playbackSpeed);
        const decodedReadOnly = parsed.readOnly !== false;
        setSharedReadOnly(decodedReadOnly);
        sharedReadOnlyRef.current = decodedReadOnly;
        setIsSharedSession(true);
        updateSetting('interface.focusMode', 'playback');
        localStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(parsed));
      })
      .catch((err) => console.error('Failed to decode shared session URL', err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ——— Clean up shared session when the page is closed ———
  useEffect(() => {
    if (!isSharedSession) return;
    const cleanup = () => localStorage.removeItem(SHARED_SESSION_KEY);
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, [isSharedSession]);

  // ——— Export session as shareable URL ———
  const exportToUrl = useCallback(async (readOnly = true) => {
    const payload = buildSharePayload(lines, editorMode, sessionYtUrl, readOnly);
    try {
      const encoded = await compressToBase64(JSON.stringify(payload));
      const url = `${window.location.origin}${window.location.pathname}#s=${encoded}`;
      // Write the shared session to its own localStorage key (separate from the personal session)
      localStorage.setItem(SHARED_SESSION_KEY, JSON.stringify(buildSessionPayload()));
      setShareModal({
        url,
        ytUrl: sessionYtUrl,
        linesCount: lines.length,
        hasSynced: lines.some((l) => l.timestamp != null),
        readOnly,
      });
    } catch {
      toast.error(t('session.shareFailed') || 'Could not generate share link.');
    }
  }, [lines, editorMode, sessionYtUrl, buildSessionPayload, t]);

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

  // ——— Auto-save (dual-condition: time OR action count, whichever first) ———
  // Sync latest volatile values into a ref so callbacks never capture stale closures
  const autoSaveRef = useRef(null);
  useEffect(() => {
    autoSaveRef.current = {
      pendingSession,
      enabled: settings.advanced.autoSave.enabled,
      timeInterval: settings.advanced.autoSave.timeInterval ?? 30,
      buildPayload: buildSessionPayload,
      isSharedSession,
    };
  });
  const lastSaveTimeRef = useRef(Date.now());
  const changeCountRef = useRef(0);
  const doAutoSave = useCallback(() => {
    const s = autoSaveRef.current;
    if (!s || s.pendingSession !== null || !s.enabled) return;
    const payload = s.buildPayload();
    if (!payload?.lines?.length) return;
    const key = s.isSharedSession ? SHARED_SESSION_KEY : SESSION_KEY;
    localStorage.setItem(key, JSON.stringify(payload));
    lastSaveTimeRef.current = Date.now();
    changeCountRef.current = 0;
    setIsAutosaving(true);
    setTimeout(() => setIsAutosaving(false), 1200);
  }, []);
  // Action-based trigger
  const isFirstLinesRender = useRef(true);
  useEffect(() => {
    if (isFirstLinesRender.current) { isFirstLinesRender.current = false; return; }
    const s = autoSaveRef.current;
    if (!s?.enabled) return;
    changeCountRef.current += 1;
    if (changeCountRef.current >= 5) {
      doAutoSave();
    }
  }, [lines, doAutoSave]);
  // Time-based trigger (ticks every second)
  useEffect(() => {
    if (!settings.advanced.autoSave.enabled) return;
    const id = setInterval(() => {
      const s = autoSaveRef.current;
      if (!s?.enabled) return;
      const elapsedSec = (Date.now() - lastSaveTimeRef.current) / 1000;
      if (elapsedSec >= (s.timeInterval ?? 30)) {
        doAutoSave();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [settings.advanced.autoSave.enabled, doAutoSave]);

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
        words: Array.isArray(l.words) ? l.words.map((w) => ({
          word: typeof w.word === 'string' ? w.word : '',
          time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null,
          ...(typeof w.reading === 'string' && w.reading ? { reading: w.reading } : {}),
        })).filter((w) => w.word) : undefined,
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

      if (['lrc', 'srt', 'txt'].includes(extension)) {
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
      } else {
        toast.error(t('import.unsupportedFormat') || 'Unsupported file type. Use .lrc, .srt, or .txt files.');
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
    setLines: setLinesGuarded,
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
    triggerImportSave,
    handleRestoreSession,
    handleDiscardSession,
    handleMediaChange,
    handleTimeUpdate,
    handleDurationChange,
    handleYtUrlChange,
    restoredYtUrl,
    restoredPosition,
    restoredSpeed,
    exportToUrl,
    confirmModal,
    isAutosaving,
    isSharedSession,
    sharedReadOnly,
    setSharedReadOnly,
    shareModal,
    setShareModal,
  };
}
