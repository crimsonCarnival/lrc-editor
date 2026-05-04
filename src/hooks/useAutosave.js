import { useRef, useCallback, useEffect } from 'react';
import { uploads, projects, getAccessToken } from '@/api';

const PROJECT_KEY = 'lrc-syncer-project';
const SHARED_PROJECT_KEY = 'lrc-syncer-shared-project';
const ACTIVE_PROJECT_ID_KEY = 'lrc-syncer-active-project-id';

/**
 * Dual-condition autosave: fires when either the time interval elapses
 * OR the user makes N edits (action-count), whichever comes first.
 *
 * Also auto-creates a project on the server when the user is authenticated
 * but has no active project yet.
 */
export function useAutosave({
  settings,
  pendingProject,
  isSharedProject,
  isSharedProjectRef,
  activeProjectId,
  activeProjectIdRef,
  isCreatingProjectRef,
  sessionUploadIdRef,
  lastServerSnapshotRef,
  cloudinaryAudio,
  mediaTitle,
  projectMetadata,
  editorMode,
  syncMode,
  activeLineIndex,
  lines,
  duration,
  buildProjectPayload,
  buildProjectPatch,
  updateServerSnapshot,
  setActiveProjectId,
  setIsAutosaving,
}) {
  // Keep a ref-snapshot of volatile values to avoid stale closures inside the
  // setInterval / doAutoSave callback
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

  // eslint-disable-next-line react-hooks/purity
  const lastSaveTimeRef = useRef(Date.now());
  const changeCountRef = useRef(0);

  const doAutoSave = useCallback(async () => {
    const s = autoSaveRef.current;
    if (!s || s.pendingProject !== null || !s.enabled) return;

    const payload = s.buildPayload();
    const key = s.isSharedProject ? SHARED_PROJECT_KEY : PROJECT_KEY;
    localStorage.setItem(key, JSON.stringify(payload));

    if (getAccessToken() && activeProjectId && !isSharedProjectRef.current) {
      // Skip saveMedia if we already have an upload ID for this session
      let uploadIdToSave = sessionUploadIdRef.current || null;

      if (!uploadIdToSave && cloudinaryAudio) {
        try {
          const { upload } = await uploads.saveMedia({
            source: 'cloudinary',
            cloudinaryUrl: cloudinaryAudio.cloudinaryUrl,
            publicId: cloudinaryAudio.publicId,
            fileName: cloudinaryAudio.fileName,
            title: cloudinaryAudio.fileName?.replace(/\.[^/.]+$/, '') || '',
            duration: cloudinaryAudio.duration,
          });
          uploadIdToSave = upload.id;
          sessionUploadIdRef.current = upload.id;
        } catch (err) {
          console.error('Failed to save upload:', err);
        }
      } else if (!uploadIdToSave && payload.ytUrl) {
        try {
          const { upload } = await uploads.saveMedia({
            source: 'youtube',
            youtubeUrl: payload.ytUrl,
            fileName: '',
            title: mediaTitle || '',
            duration: duration || null,
          });
          uploadIdToSave = upload.id;
          sessionUploadIdRef.current = upload.id;
        } catch (err) {
          console.error('Failed to save upload:', err);
        }
      }

      const patchState = {
        syncMode,
        activeLineIndex,
        playbackPosition: payload.playbackPosition || 0,
        playbackSpeed: payload.playbackSpeed || 1,
        saveTime: payload.saveTime,
        timezone: payload.timezone,
        utcOffset: payload.utcOffset,
      };
      const title = mediaTitle || '';
      const metadata = projectMetadata;
      const patchData = buildProjectPatch({
        prevSnapshot: lastServerSnapshotRef.current,
        title,
        metadata,
        state: patchState,
        uploadId: uploadIdToSave ?? undefined,
        editorMode,
        lines: payload.lines || [],
      });

      if (Object.keys(patchData).length > 0) {
        try {
          await projects.patch(activeProjectId, patchData);
          updateServerSnapshot({
            title,
            metadata,
            state: patchState,
            editorMode,
            lines: payload.lines || [],
            uploadId: uploadIdToSave ?? undefined,
          });
        } catch {
          // silent fail for autosave path
        }
      }
    } else if (
      getAccessToken() &&
      !activeProjectIdRef.current &&
      !isSharedProjectRef.current &&
      payload.lines?.length > 0
    ) {
      // Guard against concurrent creates (autosave + manual save race)
      if (isCreatingProjectRef.current) return;
      isCreatingProjectRef.current = true;

      let uploadIdToSave = null;
      if (cloudinaryAudio) {
        try {
          const { upload } = await uploads.saveMedia({
            source: 'cloudinary',
            cloudinaryUrl: cloudinaryAudio.cloudinaryUrl,
            publicId: cloudinaryAudio.publicId,
            fileName: cloudinaryAudio.fileName,
            title: cloudinaryAudio.fileName?.replace(/\.[^/.]+$/, '') || '',
            duration: cloudinaryAudio.duration,
          });
          uploadIdToSave = upload.id;
        } catch (err) {
          console.error('Failed to save upload:', err);
        }
      } else if (payload.ytUrl) {
        try {
          const { upload } = await uploads.saveMedia({
            source: 'youtube',
            youtubeUrl: payload.ytUrl,
            fileName: '',
            title: mediaTitle || '',
            duration: duration || null,
          });
          uploadIdToSave = upload.id;
        } catch (err) {
          console.error('Failed to save upload:', err);
        }
      }

      const createData = {
        title: mediaTitle || '',
        metadata: projectMetadata,
        lyrics: { editorMode, lines: payload.lines },
        state: {
          syncMode,
          activeLineIndex,
          playbackPosition: payload.playbackPosition || 0,
          playbackSpeed: payload.playbackSpeed || 1,
          saveTime: payload.saveTime,
          timezone: payload.timezone,
          utcOffset: payload.utcOffset,
        },
        readOnly: false,
      };
      if (uploadIdToSave) createData.uploadId = uploadIdToSave;

      projects.create(createData)
        .then(({ projectId }) => {
          setActiveProjectId(projectId);
          activeProjectIdRef.current = projectId;
          updateServerSnapshot({
            title: createData.title,
            metadata: createData.metadata,
            state: createData.state,
            editorMode,
            lines: payload.lines,
            uploadId: uploadIdToSave ?? undefined,
          });
          try {
            localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
          } catch { /* ignore */ }
        })
        .catch(() => { })
        .finally(() => {
          isCreatingProjectRef.current = false;
        });
    }

    lastSaveTimeRef.current = Date.now();
    changeCountRef.current = 0;
    setIsAutosaving(true);
    setTimeout(() => setIsAutosaving(false), 1200);
  }, [
    activeProjectId,
    mediaTitle,
    projectMetadata,
    editorMode,
    syncMode,
    activeLineIndex,
    cloudinaryAudio,
    duration,
    isSharedProjectRef,
    activeProjectIdRef,
    isCreatingProjectRef,
    sessionUploadIdRef,
    lastServerSnapshotRef,
    buildProjectPatch,
    updateServerSnapshot,
    setActiveProjectId,
    setIsAutosaving,
  ]);

  // ——— Action-based trigger (every 5 line edits) ———
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

  // ——— Time-based trigger ———
  useEffect(() => {
    if (!settings.advanced.autoSave.enabled) return;
    const intervalMs = Math.max(10, settings.advanced.autoSave.timeInterval ?? 30) * 1000;
    const id = setInterval(() => { doAutoSave(); }, intervalMs);
    return () => clearInterval(id);
  }, [settings.advanced.autoSave.enabled, settings.advanced.autoSave.timeInterval, doAutoSave]);

  return { doAutoSave };
}
