import { useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import useConfirm from '../../hooks/useConfirm';
import { formatTime } from '../../utils/formatTime';
import useLocalAudio from './useLocalAudio';
import useYouTubePlayer from './useYouTubePlayer';
import WaveformDisplay from './WaveformDisplay';
import VolumeControl from './VolumeControl';
import SpeedControl from './SpeedControl';

const ALL_SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5];

const Player = forwardRef(function Player(
  { onTimeUpdate, onDurationChange, onMediaChange, playerRef: _legacyRef, mediaTitle, onTitleChange },
  ref,
) {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const MIN_SPEED = settings.playback?.speedBounds?.min ?? 0.25;
  const MAX_SPEED = settings.playback?.speedBounds?.max ?? 3;
  const SPEED_PRESETS = useMemo(
    () =>
      (settings.playback?.speedPresets || ALL_SPEED_PRESETS).filter(
        (s) => s >= MIN_SPEED && s <= MAX_SPEED,
      ),
    [MIN_SPEED, MAX_SPEED, settings.playback?.speedPresets],
  );

  const [source, setSource] = useState('local');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [requestConfirm, confirmModal] = useConfirm();

  const audioRef = useRef(null);
  const localBlobRef = useRef(null);
  const ytContainerRef = useRef(null);

  const updateTime = useCallback(
    (time) => {
      setCurrentTime(time);
      onTimeUpdate?.(time);
    },
    [onTimeUpdate],
  );

  const updateDuration = useCallback(
    (d) => {
      setDuration(d);
      onDurationChange?.(d);
    },
    [onDurationChange],
  );

  const local = useLocalAudio({
    audioRef,
    blobRef: localBlobRef,
    t,
    settings,
    updateTime,
    updateDuration,
    setSource,
    setIsPlaying,
    setCurrentTime,
    onTitleChange,
    onMediaChange,
  });

  const yt = useYouTubePlayer({
    containerRef: ytContainerRef,
    t,
    settings,
    updateTime,
    updateDuration,
    setIsPlaying,
    setCurrentTime,
    onTitleChange,
    onMediaChange,
    isPlaying,
  });

  const hasMedia = (source === 'local' && local.localUrl) || (source === 'youtube' && yt.ytReady);

  // ——— Unified controls ———

  const togglePlay = useCallback(() => {
    if (source === 'local' && audioRef.current) {
      if (isPlaying) local.pause();
      else local.play();
      setIsPlaying(!isPlaying);
    } else if (source === 'youtube' && yt.ytReady) {
      if (isPlaying) yt.pause();
      else yt.play();
    }
  }, [source, isPlaying, local, yt]);

  const seek = useCallback(
    (time) => {
      if (source === 'local') local.seek(time);
      else if (source === 'youtube') yt.seek(time);
    },
    [source, local, yt],
  );

  const applySpeed = useCallback(
    (speed) => {
      const clamped = Math.min(MAX_SPEED, Math.max(MIN_SPEED, parseFloat(speed) || 1));
      setPlaybackSpeed(clamped);
      if (source === 'local') local.setSpeed(clamped);
      else if (source === 'youtube') yt.setSpeed(clamped);
    },
    [source, MIN_SPEED, MAX_SPEED, local, yt],
  );

  // ——— Expose player API via ref ———

  useImperativeHandle(
    ref ?? _legacyRef,
    () => ({
      getCurrentTime: () =>
        source === 'local' ? local.getCurrentTime() : yt.getCurrentTime(),
      play: () => {
        if (!isPlaying) togglePlay();
      },
      pause: () => {
        if (isPlaying) togglePlay();
      },
      seek,
      getAudioBlob: () => localBlobRef.current || null,
      loadLocalAudio: (file) => local.handleFileChange(file),
    }),
    [source, isPlaying, togglePlay, seek, local, yt],
  );

  // ——— Remove media ———

  const removeMedia = useCallback(() => {
    requestConfirm(t('confirmRemoveMedia') || 'Remove currently loaded media?', () => {
      if (source === 'local') local.remove();
      else if (source === 'youtube') yt.remove();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setPlaybackSpeed(1);
      onTimeUpdate?.(0);
      onDurationChange?.(0);
      onTitleChange?.('');
      onMediaChange?.(false);
    });
  }, [source, local, yt, requestConfirm, t, onTimeUpdate, onDurationChange, onTitleChange, onMediaChange]);

  return (
    <div className="glass rounded-xl sm:rounded-2xl p-2.5 sm:p-4 space-y-1.5 sm:space-y-3 animate-fade-in overflow-visible">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 mb-1">
        <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-zinc-400 flex items-center gap-2 overflow-hidden flex-1 pb-0.5 min-w-0">
          <span className="uppercase shrink-0 text-xs sm:text-sm">{t('playerTitle')}</span>
          {mediaTitle && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs min-w-0 flex-1">
              <svg className="w-2.5 h-2.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
              <div className="flex-1 min-w-0 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)' }}>
                <span className="text-primary normal-case tracking-normal animate-marquee inline-block whitespace-nowrap">{mediaTitle}</span>
              </div>
            </div>
          )}
        </h2>
        {!hasMedia ? (
          <div className="flex gap-0.5 bg-zinc-800/60 rounded-lg p-0.5 shrink-0 flex-nowrap">
            <button
              id="source-local"
              onClick={() => setSource('local')}
              className={`px-2 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${source === 'local'
                ? 'bg-primary text-zinc-950 shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t('localFile')}
            </button>
            <button
              id="source-youtube"
              onClick={() => setSource('youtube')}
              className={`px-2 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${source === 'youtube'
                ? 'bg-primary text-zinc-950 shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t('youtube')}
            </button>
          </div>
        ) : (
          <button
            id="remove-media-btn"
            onClick={removeMedia}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 cursor-pointer shrink-0"
            title={t('remove')}
          >
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Local Source */}
      {source === 'local' && !local.localUrl && (
        <div className="space-y-3 animate-fade-in">
          <label
            htmlFor="audio-file-input"
            className="flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-primary/50 rounded-xl p-4 cursor-pointer transition-colors duration-200 group"
          >
            <svg className="w-5 h-5 text-zinc-500 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
            </svg>
            <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
              {t('dropAudio')}
            </span>
            <input
              id="audio-file-input"
              type="file"
              accept="audio/*"
              onChange={local.handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      )}
      {source === 'local' && local.localUrl && (
        <div className="animate-fade-in space-y-3">
          <WaveformDisplay
            showWaveform={settings.playback?.showWaveform}
            audioRef={audioRef}
            localUrl={local.localUrl}
            onTimeUpdate={onTimeUpdate}
          />
          <audio
            ref={audioRef}
            src={local.localUrl}
            onTimeUpdate={local.handleTimeUpdate}
            onLoadedMetadata={local.handleLoadedMetadata}
            onPause={local.handlePause}
            className="hidden"
            crossOrigin="anonymous"
          />
        </div>
      )}

      {/* YouTube Source */}
      {source === 'youtube' && !yt.ytReady && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex gap-2">
            <input
              id="youtube-url-input"
              type="text"
              value={yt.ytUrl}
              onChange={(e) => { yt.setYtUrl(e.target.value); yt.setYtError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && yt.loadYouTube()}
              placeholder={t('pasteUrl')}
              className={`flex-1 bg-zinc-800/60 border rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 transition-all ${yt.ytError ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/25' : 'border-zinc-700 focus:border-primary/50 focus:ring-primary/25'}`}
            />
            <button
              id="load-youtube-btn"
              onClick={yt.loadYouTube}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t('load')}
            </button>
          </div>
          {yt.ytError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5 animate-fade-in">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {yt.ytError}
            </p>
          )}
        </div>
      )}
      <div
        ref={ytContainerRef}
        className={`fixed -top-[9999px] -left-[9999px] w-0 h-0 opacity-0 pointer-events-none ${source === 'youtube' && yt.ytReady ? '' : 'hidden'}`}
      />

      {(local.localUrl || yt.ytReady) && (
        <div className="space-y-1 sm:space-y-2 pt-1 sm:pt-2 animate-fade-in">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <button
              id="play-pause-btn"
              onClick={togglePlay}
              className="w-9 sm:w-10 h-9 sm:h-10 flex items-center justify-center rounded-full bg-primary hover:bg-primary-dim text-zinc-950 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer glow-primary flex-shrink-0"
            >
              {isPlaying ? (
                <svg className="w-3 sm:w-4 h-3 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-3 sm:w-4 h-3 sm:h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            <span className="text-xs text-zinc-400 font-mono tabular-nums w-14 sm:w-[68px] text-right shrink-0">
              {formatTime(currentTime)}
            </span>

            <input
              id="seek-slider"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="flex-1 min-w-0"
              style={{
                background: `linear-gradient(to right, var(--color-primary) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255, 255, 255, 0.15) ${duration ? (currentTime / duration) * 100 : 0}%)`,
              }}
            />

            <span className="text-xs text-zinc-400 font-mono tabular-nums w-14 sm:w-[68px] text-left shrink-0">
              {formatTime(duration)}
            </span>

            <VolumeControl />

            <SpeedControl
              playbackSpeed={playbackSpeed}
              applySpeed={applySpeed}
              MIN_SPEED={MIN_SPEED}
              MAX_SPEED={MAX_SPEED}
              SPEED_PRESETS={SPEED_PRESETS}
            />
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  );
});

export default Player;
