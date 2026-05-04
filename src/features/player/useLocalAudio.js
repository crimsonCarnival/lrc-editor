import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { uploads, getAccessToken } from '@/api';

export default function useLocalAudio({
  audioRef,
  blobRef,
  t,
  settings,
  updateTime,
  updateDuration,
  setSource,
  setIsPlaying,
  setCurrentTime,
  onTitleChange,
  onMediaChange,
  onCloudinaryUpload,
  initialSpeed,
  initialSeek,
}) {
  const [localUrl, setLocalUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const uploadAbortRef = useRef(null);

  const handleFileChange = useCallback((e) => {
    const file = e.type === 'change' ? e.target.files?.[0] : e;
    if (!file) return;

    if (file.size > 150 * 1024 * 1024) {
      toast.error(t('import.tooLarge') || 'Audio file is too large (max 150MB).');
      return;
    }

    blobRef.current = file;
    const url = URL.createObjectURL(file);
    setSource('local');
    setLocalUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    onTitleChange?.(file.name.replace(/\.[^/.]+$/, ''));
    onMediaChange?.(true);

    // Upload to Cloudinary in background if authenticated and not already hosted there
    if (!file.isCloudinary && getAccessToken() && file.size <= 50 * 1024 * 1024) {
      uploadAbortRef.current = false;
      setIsUploading(true);
      uploads.uploadToCloudinary(file)
        .then(async (result) => {
          if (uploadAbortRef.current) return;
          try {
            // Immediately persist to database before considering it successful
            const { upload } = await uploads.saveMedia({
              source: 'cloudinary',
              cloudinaryUrl: result.secure_url,
              publicId: result.public_id,
              fileName: file.name,
              title: file.name.replace(/\.[^/.]+$/, ''),
              duration: result.duration || null,
            });
            if (uploadAbortRef.current) return;
            onCloudinaryUpload?.({
              id: upload.id,
              cloudinaryUrl: result.secure_url,
              publicId: result.public_id,
              fileName: file.name,
              duration: result.duration,
            });
          } catch (err) {
            if (uploadAbortRef.current) return;
            console.error('Failed to persist upload to database:', err);
            toast.error(t('upload.persistFailed') || 'Failed to save media to database');
          }
        })
        .catch((err) => {
          if (uploadAbortRef.current) return;
          console.warn('Cloudinary upload failed:', err.message);
        })
        .finally(() => {
          if (!uploadAbortRef.current) setIsUploading(false);
        });
    }
  }, [blobRef, t, setSource, setIsPlaying, setCurrentTime, onTitleChange, onMediaChange, onCloudinaryUpload]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      updateTime(audioRef.current.currentTime);
    }
  }, [audioRef, updateTime]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (!isFinite(d) || d <= 0) return;
      updateDuration(d);
      audioRef.current.volume = settings.playback.muted ? 0 : settings.playback.volume;
      const s = parseFloat(initialSpeed);
      if (isFinite(s) && s > 0 && s !== 1) {
        audioRef.current.playbackRate = s;
      }
      if (initialSeek > 0) {
        audioRef.current.currentTime = initialSeek;
        updateTime(initialSeek);
      }
    }
  }, [audioRef, updateDuration, settings.playback.muted, settings.playback.volume, initialSpeed]);

  const autoRewind = settings.playback.autoRewindOnPause;
  const handlePause = useCallback(() => {
    if (
      autoRewind?.enabled &&
      audioRef.current &&
      audioRef.current.currentTime > 0 &&
      audioRef.current.currentTime < audioRef.current.duration
    ) {
      const newTime = Math.max(
        0,
        audioRef.current.currentTime - (autoRewind?.seconds || 2),
      );
      audioRef.current.currentTime = newTime;
      updateTime(newTime);
    }
  }, [audioRef, autoRewind?.enabled, autoRewind?.seconds, updateTime]);

  const remove = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(null);
    blobRef.current = null;
    uploadAbortRef.current = true;
    setIsUploading(false);
  }, [audioRef, blobRef, localUrl]);

  const play = useCallback(() => { audioRef.current?.play(); }, [audioRef]);
  const pause = useCallback(() => { audioRef.current?.pause(); }, [audioRef]);

  const seek = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      updateTime(time);
    }
  }, [audioRef, updateTime]);

  const setSpeed = useCallback((speed) => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [audioRef]);

  const getCurrentTime = useCallback(() => audioRef.current?.currentTime || 0, [audioRef]);

  // Sync volume when settings change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.playback.muted ? 0 : settings.playback.volume;
    }
  }, [audioRef, settings.playback.volume, settings.playback.muted]);

  return {
    localUrl,
    isUploading,
    handleFileChange,
    handleTimeUpdate,
    handleLoadedMetadata,
    handlePause,
    remove,
    play,
    pause,
    seek,
    setSpeed,
    getCurrentTime,
    loadFromUrl: useCallback((url, title) => {
      // Abort any pending Cloudinary upload
      uploadAbortRef.current = true;
      // Set the URL directly — browser streams it without downloading the full blob
      setSource('local');
      setLocalUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      if (title) onTitleChange?.(title);
      onMediaChange?.(true);
    }, [setSource, setIsPlaying, setCurrentTime, onTitleChange, onMediaChange]),
  };
}
