import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../contexts/useSettings';
import useHistory from './useHistory';
import useConfirm from './useConfirm';
import { lyrics, projects, uploads, getAccessToken } from '../api';
import { matchKey } from '../utils/keyboard';

const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const PROJECT_KEY = 'lrc-syncer-project';
const SHARED_PROJECT_KEY = 'lrc-syncer-shared-project';
const ACTIVE_PROJECT_ID_KEY = 'lrc-syncer-active-project-id';

// ——— URL compression helpers for legacy shareable project links ———
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

// ——— Compact v1 share format helpers (legacy) ———
// Expands a v1 compact payload back into the full project shape.
function expandSharePayload(p) {
  const lines = (p.l || []).map((l) => ({
    text: l.t || '',
    timestamp: l.s ?? null,
    endTime: l.e ?? null,
    secondary: l.x || '',
    translation: l.r || '',
    id: crypto.randomUUID(),
    words: Array.isArray(l.w)
      ? l.w.map((w) => ({
          word: w.w || '',
          time: w.t ?? null,
          ...(w.rd ? { reading: w.rd } : {}),
        })).filter((w) => w.word)
      : undefined,
    secondaryWords: Array.isArray(l.sw)
      ? l.sw.map((w) => ({
          word: w.w || '',
          time: w.t ?? null,
        })).filter((w) => w.word)
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

export function useAppState(user) {
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
  
  const [isSharedProject, setIsSharedProject] = useState(false);
  const [sharedReadOnly, setSharedReadOnly] = useState(true);
  const [shareModal, setShareModal] = useState(null); // null | { url, ytUrl, linesCount, hasSynced, readOnly }

  const [pendingProject, setPendingProject] = useState(() => {
    // Always discard any leftover shared project (e.g. from a crash before beforeunload fired)
    localStorage.removeItem(SHARED_PROJECT_KEY);
    // If a shared project hash is in the URL, skip localStorage — useEffect handles it async
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#s=')) {
      return null;
    }
    // If we have an activeProjectId, this is a known project — skip the restore modal
    try {
      const existingId = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
      if (existingId) return null; // will be silently restored in useEffect
    } catch { /* ignore localStorage errors */ }
    // Only show restore modal if user is authenticated
    if (!user) return null;
    try {
      const saved = localStorage.getItem(PROJECT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lines && parsed.lines.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse project data', e);
    }
    return null;
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [projectYtUrl, setProjectYtUrl] = useState('');
  const [restoredYtUrl, setRestoredYtUrl] = useState('');
  const [restoredPosition, setRestoredPosition] = useState(0);
  const [restoredSpeed, setRestoredSpeed] = useState(1);
  const [activeProjectId, setActiveProjectId] = useState(() => {
    try { return localStorage.getItem(ACTIVE_PROJECT_ID_KEY) || null; } catch { return null; }
  });
  const [cloudinaryAudio, setCloudinaryAudio] = useState(null); // { cloudinaryUrl, publicId, fileName, duration }
  const maxDragDepth = useRef(0);
  const lastLoopSeekRef = useRef(0);
  // Refs for stale-closure-safe reads inside save callbacks and guarded setLines
  const isSharedProjectRef = useRef(false);
  const sharedReadOnlyRef = useRef(true);

  const playerRef = useRef(null);
  const langMenuRef = useRef(null);
  const [requestConfirm, confirmModal] = useConfirm();

  useEffect(() => { isSharedProjectRef.current = isSharedProject; }, [isSharedProject]);
  useEffect(() => { sharedReadOnlyRef.current = sharedReadOnly; }, [sharedReadOnly]);

  // ——— Silent restore when activeProjectId exists (known project, skip modal) ———
  const silentRestoreRan = useRef(false);
  useEffect(() => {
    if (silentRestoreRan.current) return;
    if (!activeProjectId) return;
    // If the URL has a shared project hash, skip silent restore
    if (window.location.hash.startsWith('#s=')) return;
    silentRestoreRan.current = true;

    // \u2705 FIX: Try loading from server first (source of truth), fall back to localStorage
    const restoreFromLocalStorage = () => {
      try {
        const saved = localStorage.getItem(PROJECT_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        // \u2705 FIX: Allow restoring even if lines are empty (user may have deleted all lyrics)
        const validLines = (parsed.lines || []).filter(
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
          secondaryWords: Array.isArray(l.secondaryWords) ? l.secondaryWords.map((w) => ({
            word: typeof w.word === 'string' ? w.word : '',
            time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null,
          })).filter((w) => w.word) : undefined,
        }));
        setLines(validLines);
        setSyncMode(parsed.syncMode ?? true);
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
      } catch (e) {
        console.error('localStorage restore failed', e);
      }
    };

    // If authenticated, try server first (source of truth)
    if (getAccessToken()) {
      projects.get(activeProjectId)
        .then(({ project }) => {
          // Server data found - use it as source of truth
          const serverLines = (project.lyrics?.lines || []).map((l) => ({
            text: l.text || '',
            timestamp: l.timestamp ?? null,
            endTime: l.endTime ?? undefined,
            secondary: l.secondary || '',
            translation: l.translation || '',
            id: crypto.randomUUID(),
            words: l.words,
            secondaryWords: l.secondaryWords,
          }));
          setLines(serverLines);
          setSyncMode(project.state?.syncMode ?? true);
          setActiveLineIndex(project.state?.activeLineIndex || 0);
          setEditorModeRaw(project.lyrics?.editorMode || 'lrc');
          if (project.audio?.youtubeUrl) setRestoredYtUrl(project.audio.youtubeUrl);
          if (project.state?.playbackPosition) setRestoredPosition(project.state.playbackPosition);
          if (project.state?.playbackSpeed) setRestoredSpeed(project.state.playbackSpeed);
          if (project.title) setMediaTitle(project.title);
          
          // Sync server data to localStorage for offline access
          try {
            localStorage.setItem(PROJECT_KEY, JSON.stringify({
              lines: serverLines,
              syncMode: project.state?.syncMode ?? true,
              activeLineIndex: project.state?.activeLineIndex || 0,
              editorMode: project.lyrics?.editorMode || 'lrc',
              ytUrl: project.audio?.youtubeUrl || '',
              playbackPosition: project.state?.playbackPosition || 0,
              playbackSpeed: project.state?.playbackSpeed || 1,
            }));
          } catch { /* ignore localStorage errors */ }
        })
        .catch(() => {
          // Server failed (404, network error, etc.) — stale project ID, clear it
          setActiveProjectId(null);
          try {
            localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
            localStorage.removeItem(PROJECT_KEY);
          } catch { /* ignore */ }
        });
    } else {
      // Not authenticated - use localStorage
      restoreFromLocalStorage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ——— Manual save ———
  // Build an ISO-8601 string in the local timezone, e.g. "2026-03-30T20:46:37.191-05:00"
  function toLocalISOString(date, utcOffset) {
    const [sign, hh, mm] = utcOffset.match(/([+-])(\d{2}):(\d{2})/).slice(1);
    const offsetMs = (sign === '-' ? -1 : 1) * (Number(hh) * 60 + Number(mm)) * 60000;
    const local = new Date(date.getTime() + offsetMs);
    return local.toISOString().replace('Z', utcOffset);
  }

  const buildProjectPayload = useCallback(() => {
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
      ytUrl: projectYtUrl || '',
      playbackPosition: hasMedia ? playbackPosition : 0,
      playbackSpeed: hasMedia ? (playerRef.current?.getSpeed?.() ?? 1) : 1,
      saveTime: toLocalISOString(now, utcOffset),
      timezone: tz,
      utcOffset,
    };
  }, [lines, syncMode, activeLineIndex, editorMode, settings.advanced.timezone, projectYtUrl, playbackPosition, hasMedia]);

  const handleManualSave = useCallback(() => {
    const key = isSharedProjectRef.current ? SHARED_PROJECT_KEY : PROJECT_KEY;
    const payload = buildProjectPayload();
    localStorage.setItem(key, JSON.stringify(payload));
    setIsAutosaving(true);
    setTimeout(() => setIsAutosaving(false), 1200);

    // Sync to server if authenticated and we have an active project
    if (getAccessToken() && activeProjectId && !isSharedProjectRef.current) {
      const patchData = {
        title: mediaTitle || '',
        lyrics: { editorMode, lines: payload.lines },
        state: {
          syncMode,
          activeLineIndex,
          playbackPosition: payload.playbackPosition,
          playbackSpeed: payload.playbackSpeed,
        },
      };
      // Include audio info if we have cloudinary upload data
      if (cloudinaryAudio) {
        patchData.audio = {
          source: 'local',
          cloudinaryUrl: cloudinaryAudio.cloudinaryUrl,
          publicId: cloudinaryAudio.publicId,
          fileName: cloudinaryAudio.fileName,
          duration: cloudinaryAudio.duration,
        };
      } else if (payload.ytUrl) {
        patchData.audio = { source: 'youtube', youtubeUrl: payload.ytUrl };
      }
      projects.patch(activeProjectId, patchData).catch(() => {});
    }
  }, [buildProjectPayload, activeProjectId, mediaTitle, editorMode, syncMode, activeLineIndex, cloudinaryAudio]);

  // ——— Save-after-import: fires after state settles from an import ———
  const [importTick, setImportTick] = useState(0);
  const manualSaveRef = useRef(null);
  useEffect(() => { manualSaveRef.current = handleManualSave; });
  useEffect(() => {
    if (importTick === 0) return;
    manualSaveRef.current?.();
  }, [importTick]);
  const triggerImportSave = useCallback(() => setImportTick((t) => t + 1), []);

  // ——— Fork from shared project on first user edit ———
  const forkFromShared = useCallback(() => {
    isSharedProjectRef.current = false;
    setIsSharedProject(false);
    localStorage.removeItem(SHARED_PROJECT_KEY);
  }, []);

  // Guarded setLines: blocks edits when read-only, forks to personal on first edit
  const setLinesGuarded = useCallback((updater) => {
    if (isSharedProjectRef.current && sharedReadOnlyRef.current) return;
    if (isSharedProjectRef.current && !sharedReadOnlyRef.current) forkFromShared();
    setLines(updater);
  }, [setLines, forkFromShared]);

  // ——— Shared project URL: decode hash on mount ———
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#s=')) return;
    const encoded = hash.slice(3);
    // Clear the hash immediately so it doesn't persist after restore
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    const restoreProject = (parsed) => {
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
      setIsSharedProject(true);
      updateSetting('interface.focusMode', 'playback');
      localStorage.setItem(SHARED_PROJECT_KEY, JSON.stringify(parsed));
    };

    // Try server project ID first (short alphanumeric), then fall back to legacy base64 decoding
    const looksLikeProjectId = /^[A-Za-z0-9_-]{6,21}$/.test(encoded) && !encoded.includes('eJy');
    if (looksLikeProjectId) {
      projects.get(encoded)
        .then(({ project }) => {
          const parsed = {
            lines: project.lyrics?.lines || [],
            editorMode: project.lyrics?.editorMode || 'lrc',
            ytUrl: project.audio?.youtubeUrl || '',
            syncMode: project.state?.syncMode ?? true,
            activeLineIndex: project.state?.activeLineIndex || 0,
            playbackPosition: project.state?.playbackPosition || 0,
            playbackSpeed: project.state?.playbackSpeed || 1,
            readOnly: project.readOnly !== false,
          };
          restoreProject(parsed);
        })
        .catch(() => {
          // If server lookup fails, try legacy base64 decoding as fallback
          decompressFromBase64(encoded)
            .then((text) => {
              const raw = JSON.parse(text);
              const parsed = raw.v === 1 ? expandSharePayload(raw) : raw;
              restoreProject(parsed);
            })
            .catch((err) => console.error('Failed to decode shared project URL', err));
        });
    } else {
      // Legacy base64-encoded project
      decompressFromBase64(encoded)
        .then((text) => {
          const raw = JSON.parse(text);
          const parsed = raw.v === 1 ? expandSharePayload(raw) : raw;
          restoreProject(parsed);
        })
        .catch((err) => console.error('Failed to decode shared project URL', err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ——— Clean up shared project when the page is closed ———
  useEffect(() => {
    if (!isSharedProject) return;
    const cleanup = () => localStorage.removeItem(SHARED_PROJECT_KEY);
    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, [isSharedProject]);

  // ——— Export project as shareable URL ———
  const exportToUrl = useCallback(async (readOnly = true) => {
    try {
      // Build audio payload
      let audioPayload = {};
      if (cloudinaryAudio) {
        audioPayload = {
          source: 'local',
          cloudinaryUrl: cloudinaryAudio.cloudinaryUrl,
          publicId: cloudinaryAudio.publicId,
          fileName: cloudinaryAudio.fileName,
          duration: cloudinaryAudio.duration,
        };
      } else if (projectYtUrl) {
        audioPayload = { source: 'youtube', youtubeUrl: projectYtUrl };
      }
      const result = await projects.create({
        title: mediaTitle || '',
        audio: audioPayload,
        lyrics: { editorMode, lines },
        state: {
          syncMode,
          activeLineIndex: 0,
          playbackPosition: 0,
          playbackSpeed: 1,
        },
        readOnly,
      });
      // Track this project for future updates
      if (!readOnly) {
        setActiveProjectId(result.projectId);
        localStorage.setItem(ACTIVE_PROJECT_ID_KEY, result.projectId);
      }
      const url = `${window.location.origin}${window.location.pathname}#s=${result.projectId}`;
      // Write the shared project to its own localStorage key (separate from the personal project)
      localStorage.setItem(SHARED_PROJECT_KEY, JSON.stringify(buildProjectPayload()));
      setShareModal({
        url,
        ytUrl: projectYtUrl,
        linesCount: lines.length,
        hasSynced: lines.some((l) => l.timestamp != null),
        readOnly,
      });
    } catch {
      toast.error(t('project.shareFailed') || 'Could not generate share link.');
    }
  }, [lines, editorMode, projectYtUrl, syncMode, mediaTitle, buildProjectPayload, cloudinaryAudio, t]);

  // ——— Mode switching with end-time inference ———
  const setEditorMode = useCallback(
    (mode) => {
      setEditorModeRaw(mode);
      if (mode === 'srt' && editorMode !== 'srt') {
        lyrics.inferEndTimes({
          lines,
          duration,
          srtConfig: settings.editor?.srt,
        }).then(({ lines: inferred }) => {
          setLines(inferred);
        }).catch((err) => {
          console.error('Failed to infer end times', err);
        });
      }
    },
    [editorMode, lines, duration, setLines, settings.editor?.srt],
  );

  // ——— Auto-save (dual-condition: time OR action count, whichever first) ———
  // Sync latest volatile values into a ref so callbacks never capture stale closures
  const autoSaveRef = useRef(null);
  useEffect(() => {
    autoSaveRef.current = {
      pendingProject,
      enabled: settings.advanced.autoSave.enabled,
      timeInterval: settings.advanced.autoSave.timeInterval ?? 30,
      buildPayload: buildProjectPayload,
      isSharedProject,
    };
  });
  const lastSaveTimeRef = useRef(Date.now());
  const changeCountRef = useRef(0);
  const doAutoSave = useCallback(() => {
    const s = autoSaveRef.current;
    if (!s || s.pendingProject !== null || !s.enabled) return;
    const payload = s.buildPayload();
    // ✅ FIX: Allow empty state to be saved (removed early return check)
    // This ensures deleted lyrics properly persist instead of reappearing on reload
    const key = s.isSharedProject ? SHARED_PROJECT_KEY : PROJECT_KEY;
    localStorage.setItem(key, JSON.stringify(payload));
    
    // ✅ FIX: Sync to server database, not just localStorage
    if (getAccessToken() && activeProjectId && !isSharedProjectRef.current) {
      const patchData = {
        title: mediaTitle || '',
        lyrics: { editorMode, lines: payload.lines || [] },
        state: {
          syncMode,
          activeLineIndex,
          playbackPosition: payload.playbackPosition || 0,
          playbackSpeed: payload.playbackSpeed || 1,
        },
      };
      // Include audio info if available
      if (cloudinaryAudio) {
        patchData.audio = {
          source: 'local',
          cloudinaryUrl: cloudinaryAudio.cloudinaryUrl,
          publicId: cloudinaryAudio.publicId,
          fileName: cloudinaryAudio.fileName,
          duration: cloudinaryAudio.duration,
        };
      } else if (payload.ytUrl) {
        patchData.audio = { source: 'youtube', youtubeUrl: payload.ytUrl };
      }
      projects.patch(activeProjectId, patchData).catch(() => {});
    } else if (getAccessToken() && !activeProjectId && !isSharedProjectRef.current && payload.lines?.length > 0) {
      // ✅ FIX: Auto-create project on first save if authenticated but no project exists
      const createData = {
        title: mediaTitle || '',
        audio: cloudinaryAudio ? {
          source: 'local',
          cloudinaryUrl: cloudinaryAudio.cloudinaryUrl,
          publicId: cloudinaryAudio.publicId,
          fileName: cloudinaryAudio.fileName,
          duration: cloudinaryAudio.duration,
        } : (payload.ytUrl ? { source: 'youtube', youtubeUrl: payload.ytUrl } : {}),
        lyrics: { editorMode, lines: payload.lines },
        state: {
          syncMode,
          activeLineIndex,
          playbackPosition: payload.playbackPosition || 0,
          playbackSpeed: payload.playbackSpeed || 1,
        },
        readOnly: false,
      };
      projects.create(createData).then(({ projectId }) => {
        setActiveProjectId(projectId);
        try {
          localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
        } catch { /* ignore localStorage errors */ }
      }).catch(() => {});
    }
    
    lastSaveTimeRef.current = Date.now();
    changeCountRef.current = 0;
    setIsAutosaving(true);
    setTimeout(() => setIsAutosaving(false), 1200);
  }, [activeProjectId, mediaTitle, editorMode, syncMode, activeLineIndex, cloudinaryAudio]);
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

  const handleRestoreProject = () => {
    if (pendingProject) {
      // Validate line shape before restoring
      const validLines = pendingProject.lines.filter(
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
        secondaryWords: Array.isArray(l.secondaryWords) ? l.secondaryWords.map((w) => ({
          word: typeof w.word === 'string' ? w.word : '',
          time: typeof w.time === 'number' && isFinite(w.time) ? w.time : null,
        })).filter((w) => w.word) : undefined,
      }));
      if (validLines.length === 0) {
        setPendingProject(null);
        return;
      }
      setLines(validLines);
      setSyncMode(true);
      const idx = pendingProject.activeLineIndex;
      if (typeof idx === 'number' && idx >= 0 && idx < validLines.length) {
        setActiveLineIndex(idx);
      }
      // Restore editorMode, auto-detect SRT if lines have endTime
      const restoredMode = pendingProject.editorMode
        || (validLines.some((l) => l.endTime != null) ? 'srt' : 'lrc');
      setEditorModeRaw(restoredMode);
      // Restore YouTube URL and playback state
      if (pendingProject.ytUrl) setRestoredYtUrl(pendingProject.ytUrl);
      if (typeof pendingProject.playbackPosition === 'number') setRestoredPosition(pendingProject.playbackPosition);
      if (typeof pendingProject.playbackSpeed === 'number') setRestoredSpeed(pendingProject.playbackSpeed);

      // Persist to server: update existing or create new
      if (getAccessToken()) {
        const serverPayload = {
          title: mediaTitle || pendingProject.title || '',
          audio: pendingProject.ytUrl ? { source: 'youtube', youtubeUrl: pendingProject.ytUrl } : {},
          lyrics: { editorMode: restoredMode, lines: validLines },
          state: {
            syncMode: true,
            activeLineIndex: idx || 0,
            playbackPosition: pendingProject.playbackPosition || 0,
            playbackSpeed: pendingProject.playbackSpeed || 1,
          },
          readOnly: false,
        };

        const existingId = activeProjectId || pendingProject.projectId;
        const persistProject = async () => {
          if (existingId) {
            try {
              await projects.update(existingId, serverPayload);
              // Update succeeded — keep the same activeProjectId
              if (!activeProjectId) {
                setActiveProjectId(existingId);
                localStorage.setItem(ACTIVE_PROJECT_ID_KEY, existingId);
              }
              return;
            } catch {
              // update failed (404, 403, etc) — fall through to create
            }
          }
          try {
            const res = await projects.create(serverPayload);
            setActiveProjectId(res.projectId);
            localStorage.setItem(ACTIVE_PROJECT_ID_KEY, res.projectId);
          } catch { /* ignore create project errors */ }
        };
        persistProject();
      }
    }
    setPendingProject(null);
  };

  const handleDiscardProject = () => {
    localStorage.removeItem(PROJECT_KEY);
    localStorage.removeItem(ACTIVE_PROJECT_ID_KEY);
    setActiveProjectId(null);
    setPendingProject(null);
  };

  // ——— Load a project from the library ———
  const loadProject = useCallback(async (projectId) => {
    const { project } = await projects.get(projectId);
    const projectLines = (project.lyrics?.lines || []).map((l) => ({
      text: l.text || '',
      timestamp: l.timestamp ?? null,
      endTime: l.endTime ?? undefined,
      secondary: l.secondary || '',
      translation: l.translation || '',
      id: crypto.randomUUID(),
      words: l.words,
      secondaryWords: l.secondaryWords,
    }));
    if (projectLines.length === 0) return;
    setLines(projectLines);
    setSyncMode(true);
    setActiveLineIndex(project.state?.activeLineIndex || 0);
    setEditorModeRaw(project.lyrics?.editorMode || 'lrc');
    if (project.audio?.youtubeUrl) setRestoredYtUrl(project.audio.youtubeUrl);
    if (project.state?.playbackPosition) setRestoredPosition(project.state.playbackPosition);
    if (project.state?.playbackSpeed) setRestoredSpeed(project.state.playbackSpeed);
    if (project.title) setMediaTitle(project.title);
    setActiveProjectId(projectId);
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
    // Save to localStorage so it's available on refresh
    localStorage.setItem(PROJECT_KEY, JSON.stringify({
      lines: projectLines,
      syncMode: true,
      activeLineIndex: project.state?.activeLineIndex || 0,
      editorMode: project.lyrics?.editorMode || 'lrc',
      ytUrl: project.audio?.youtubeUrl || '',
      playbackPosition: project.state?.playbackPosition || 0,
      playbackSpeed: project.state?.playbackSpeed || 1,
      projectId,
    }));
  }, [setLines, setMediaTitle]);

  // ——— Clear all data when media is removed ———
  const handleMediaChange = useCallback(
    (loaded) => {
      setHasMedia(loaded);
      if (!loaded) {
        // Do NOT clear lines or syncMode — editor content is independent of media
        setPlaybackPosition(0);
        setDuration(0);
        setMediaTitle('');
        setCloudinaryAudio(null);
      }
    },
    [],
  );

  const handleCloudinaryUpload = useCallback((info) => {
    setCloudinaryAudio(info);
    // Sync to server if we have an active project
    if (getAccessToken() && activeProjectId) {
      projects.patch(activeProjectId, {
        audio: {
          source: 'local',
          cloudinaryUrl: info.cloudinaryUrl,
          publicId: info.publicId,
          fileName: info.fileName,
          duration: info.duration,
        },
      }).catch(() => {});
    }
    // Save to media library for future reuse
    if (getAccessToken()) {
      uploads.saveMedia({
        source: 'cloudinary',
        cloudinaryUrl: info.cloudinaryUrl,
        publicId: info.publicId,
        fileName: info.fileName,
        title: info.fileName?.replace(/\.[^/.]+$/, '') || '',
        duration: info.duration,
      }).catch(() => {});
    }
  }, [activeProjectId]);

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
    setProjectYtUrl(url || '');
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
          const { lines: parsedLines } = await lyrics.parse(text, file.name);

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
    pendingProject,
    showLangMenu,
    setShowLangMenu,
    editorMode,
    setEditorMode,
    isDraggingFile,
    playerRef,
    langMenuRef,
    handleManualSave,
    triggerImportSave,
    handleRestoreProject,
    handleDiscardProject,
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
    isSharedProject,
    sharedReadOnly,
    setSharedReadOnly,
    shareModal,
    setShareModal,
    activeProjectId,
    loadProject,
    handleCloudinaryUpload,
  };
}
