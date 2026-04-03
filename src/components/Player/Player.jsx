import { useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../contexts/useSettings';
import useConfirm from '../../hooks/useConfirm';
import { formatTime } from '../../utils/formatTime';
import useLocalAudio from './useLocalAudio';
import useYouTubePlayer from './useYouTubePlayer';
import WaveformDisplay from './WaveformDisplay';
import VolumeControl from './VolumeControl';
import SpeedControl from './SpeedControl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music2, Trash2, AlertTriangle, Play, Pause, Headphones, FolderOpen, Upload, Repeat, ChevronLeft, ChevronRight } from 'lucide-react';

const ALL_SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5];

const Player = forwardRef(function Player(
  { onTimeUpdate, onDurationChange, onMediaChange, playerRef: _legacyRef, mediaTitle, onTitleChange, initialYtUrl, onYtUrlChange, initialSeek, initialSpeed, lines, playbackPosition },
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
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const s = parseFloat(initialSpeed);
    return (isFinite(s) && s > 0) ? s : 1;
  });
  const [requestConfirm, confirmModal] = useConfirm();

  // A-B Loop state
  const [loopA, setLoopA] = useState(null);
  const [loopB, setLoopB] = useState(null);
  const loopARef = useRef(null);
  const loopBRef = useRef(null);

  const audioRef = useRef(null);
  const localBlobRef = useRef(null);
  const ytContainerRef = useRef(null);

  const sourceRef = useRef(source);

  // Sync refs in effects (React 19 rules forbid ref writes during render)
  useEffect(() => { loopARef.current = loopA; }, [loopA]);
  useEffect(() => { loopBRef.current = loopB; }, [loopB]);
  useEffect(() => { sourceRef.current = source; }, [source]);

  const updateTime = useCallback(
    (time) => {
      // A-B loop enforcement
      const a = loopARef.current;
      const b = loopBRef.current;
      if (a != null && b != null && time >= b) {
        if (sourceRef.current === 'local' && audioRef.current) {
          audioRef.current.currentTime = a;
        }
        // YouTube loop is handled via yt.seek in the effect below
        setCurrentTime(a);
        onTimeUpdate?.(a);
        return;
      }
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
    initialSpeed,
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
    setSource,
    initialYtUrl,
    onYtUrlChange,
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

  // ——— A-B Loop helpers ———
  const setLoop = useCallback((a, b) => {
    setLoopA(a);
    setLoopB(b);
  }, []);

  const clearLoop = useCallback(() => {
    setLoopA(null);
    setLoopB(null);
  }, []);

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
      togglePlay: () => togglePlay(),
      adjustSpeed: (delta) => applySpeed(Math.round((playbackSpeed + delta) * 1000) / 1000),
      getSpeed: () => playbackSpeed,
      seek,
      getAudioBlob: () => localBlobRef.current || null,
      loadLocalAudio: (file) => local.handleFileChange(file),
      setLoop,
      clearLoop,
      getLoop: () => ({ a: loopA, b: loopB }),
    }),
    [source, isPlaying, togglePlay, seek, local, yt, applySpeed, playbackSpeed, setLoop, clearLoop, loopA, loopB],
  );

  // ——— Apply restored seek/speed once after YouTube media is ready ———
  const restoredValuesAppliedRef = useRef(false);
  useEffect(() => {
    if (yt.ytReady && !restoredValuesAppliedRef.current) {
      restoredValuesAppliedRef.current = true;
      if (initialSeek > 0) yt.seek(initialSeek);
      // Apply speed directly to YouTube player (external call only)
      if (initialSpeed && initialSpeed !== 1) yt.setSpeed(initialSpeed);
      // Ensure the player doesn't autoplay after restoring position
      yt.pause();
    }
  }, [yt.ytReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ——— Remove media ———

  const removeMedia = useCallback(() => {
    requestConfirm(t('confirm.removeMedia') || 'Remove currently loaded media?', () => {
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
          <span className="uppercase shrink-0 text-xs sm:text-sm flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5" />{t('player.title')}</span>
          {mediaTitle && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs min-w-0 flex-1">
              <Music2 className="w-2.5 h-2.5 text-primary shrink-0" strokeWidth={2.5} />
              <div className="flex-1 min-w-0 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 10px, black calc(100% - 10px), transparent)' }}>
                <span className="text-primary normal-case tracking-normal animate-marquee inline-block whitespace-nowrap">{mediaTitle}</span>
              </div>
            </div>
          )}
        </h2>
        {hasMedia && (
          <div className="flex items-center gap-1 shrink-0">
            <label
              htmlFor="audio-file-input"
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 rounded-lg cursor-pointer transition-colors"
              title={t('player.changeSong')}
            >
              <Upload className="w-3.5 h-3.5" />
              <input
                id="audio-file-input"
                type="file"
                accept="audio/*"
                onChange={local.handleFileChange}
                className="hidden"
              />
            </label>
            <Button
              id="remove-media-btn"
              variant="ghost"
              onClick={removeMedia}
              className="gap-1 px-2 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg shrink-0 h-auto"
              title={t('player.remove')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Loading placeholder while YouTube initialises */}
      {!hasMedia && yt.ytLoading && (
        <div className="flex items-center justify-center gap-3 py-6 animate-fade-in">
          <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm text-zinc-400">{t('player.loading') || 'Loading…'}</span>
        </div>
      )}

      {/* Unified media loader — shown when no media is loaded */}
      {!hasMedia && !yt.ytLoading && (
        <div className="animate-fade-in overflow-hidden">
          {/* Drop zone — hidden once a URL has been entered */}
          {!yt.ytUrl.trim() && (<>
            <label
              htmlFor="audio-file-input"
              className="flex items-center gap-3 px-3 py-3 cursor-pointer group transition-colors rounded-xl hover:bg-zinc-800/40"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) local.handleFileChange({ target: { files: [file] } });
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-zinc-700/60 transition-all flex-shrink-0">
                <FolderOpen className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">{t('player.dropAudio')}</p>
                <p className="text-[11px] text-zinc-600">{t('player.dropHint')}</p>
              </div>
              <input
                id="audio-file-input"
                type="file"
                accept="audio/*"
                onChange={local.handleFileChange}
                className="hidden"
              />
            </label>

            {/* Divider */}
            <div className="flex items-center gap-3 px-3 py-0.5">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">{t('player.or')}</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
          </>)}

          {/* YouTube URL — always visible; shows clear button once a URL is present */}
          <div className="px-1 py-2 space-y-2">
            <div className="flex gap-2 items-center">
              {yt.ytUrl.trim() && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => { yt.setYtUrl(''); yt.setYtError(''); }}
                  className="w-7 h-8 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 shrink-0"
                  title={t('player.clearUrl')}
                >
                  ←
                </Button>
              )}
              <div className="relative flex-1">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-500/70 shrink-0 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <Input
                  id="youtube-url-input"
                  type="text"
                  value={yt.ytUrl}
                  onChange={(e) => { yt.setYtUrl(e.target.value); yt.setYtError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && yt.loadYouTube()}
                  placeholder={t('player.pasteUrl')}
                  className={`pl-7 bg-zinc-800/60 text-zinc-100 placeholder-zinc-500 ${yt.ytError ? 'border-red-500/70 focus-visible:ring-red-500/25' : 'border-zinc-700 focus-visible:ring-primary/25'}`}
                />
              </div>
              <Button
                id="load-youtube-btn"
                onClick={yt.loadYouTube}
                className="px-4 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg shrink-0"
              >
                {t('player.load')}
              </Button>
            </div>
            {yt.ytError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5 animate-fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {yt.ytError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Local audio waveform */}
      {source === 'local' && local.localUrl && (
        <div className="animate-fade-in space-y-3">
          <WaveformDisplay
            showWaveform={settings.playback?.showWaveform}
            waveformSnap={settings.playback?.waveformSnap}
            audioRef={audioRef}
            localUrl={local.localUrl}
            onTimeUpdate={onTimeUpdate}
            lines={lines}
            playbackPosition={playbackPosition}
            duration={duration}
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

      <div
        ref={ytContainerRef}
        className={`fixed -top-[9999px] -left-[9999px] w-0 h-0 opacity-0 pointer-events-none ${source === 'youtube' && yt.ytReady ? '' : 'hidden'}`}
      />

      {(local.localUrl || yt.ytReady) && (
        <div className="space-y-1 sm:space-y-2 pt-1 sm:pt-2 animate-fade-in">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <Button
              id="play-pause-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? t('shortcuts.playPause') || 'Pause' : t('shortcuts.playPause') || 'Play'}
              className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-primary hover:bg-primary-dim text-zinc-950 hover:scale-105 active:scale-95 glow-primary flex-shrink-0 p-0"
            >
              {isPlaying ? (
                <Pause className="w-3 sm:w-4 h-3 sm:h-4" fill="currentColor" />
              ) : (
                <Play className="w-3 sm:w-4 h-3 sm:h-4 ml-0.5" fill="currentColor" />
              )}
            </Button>

            <span className="text-xs text-zinc-400 font-mono tabular-nums w-14 sm:w-[68px] text-right shrink-0">
              {formatTime(currentTime)}
            </span>

            {/* Frame step back */}
            <button
              onClick={() => seek(Math.max(0, currentTime - 0.01))}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors flex-shrink-0 hidden sm:block"
              title="-0.01s"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>

            <div className="flex-1 min-w-0 relative">
              {/* A-B loop region overlay */}
              {loopA != null && loopB != null && duration > 0 && (
                <div
                  className="absolute top-0 bottom-0 bg-accent-purple/15 border-x border-accent-purple/40 rounded-sm pointer-events-none z-10"
                  style={{
                    left: `${(loopA / duration) * 100}%`,
                    width: `${((loopB - loopA) / duration) * 100}%`,
                  }}
                />
              )}
              <input
                id="seek-slider"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                aria-label="Seek"
                aria-valuenow={Math.round(currentTime)}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                onChange={(e) => {
                  const raw = parseFloat(e.target.value);
                  // Shift-drag: 10:1 precision (move 1/10th of normal)
                  if (e.nativeEvent?.shiftKey) {
                    const delta = (raw - currentTime) / 10;
                    seek(Math.max(0, Math.min(duration, currentTime + delta)));
                  } else {
                    seek(raw);
                  }
                }}
                className="w-full relative z-20"
                style={{
                  background: `linear-gradient(to right, var(--color-primary) ${duration ? (currentTime / duration) * 100 : 0}%, rgba(255, 255, 255, 0.15) ${duration ? (currentTime / duration) * 100 : 0}%)`,
                }}
              />
            </div>

            {/* Frame step forward */}
            <button
              onClick={() => seek(Math.min(duration, currentTime + 0.01))}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors flex-shrink-0 hidden sm:block"
              title="+0.01s"
            >
              <ChevronRight className="w-3 h-3" />
            </button>

            <span className="text-xs text-zinc-400 font-mono tabular-nums w-14 sm:w-[68px] text-left shrink-0">
              {formatTime(duration)}
            </span>

            <VolumeControl />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (loopA != null && loopB != null) {
                  clearLoop();
                } else {
                  // Loop the currently active line (use live time for accuracy)
                  const now = source === 'local'
                    ? (audioRef.current?.currentTime ?? currentTime)
                    : (yt.getCurrentTime?.() ?? currentTime);
                  if (lines?.length) {
                    let activeIdx = -1;
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].timestamp != null && lines[i].timestamp <= now) activeIdx = i;
                    }
                    if (activeIdx >= 0) {
                      const activeLine = lines[activeIdx];
                      const a = activeLine.timestamp;
                      // Prefer SRT endTime, fall back to next synced line's start
                      let b = activeLine.endTime ?? null;
                      if (b == null) {
                        b = duration;
                        for (let i = activeIdx + 1; i < lines.length; i++) {
                          if (lines[i].timestamp != null) { b = lines[i].timestamp; break; }
                        }
                      }
                      setLoop(a, b);
                    }
                  }
                }
              }}
              className={`rounded-full flex-shrink-0 ${
                loopA != null && loopB != null
                  ? 'bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
              title={loopA != null && loopB != null
                ? `${t('player.loopActive') || 'Loop active'}: ${formatTime(loopA)} – ${formatTime(loopB)} (click to clear)`
                : t('player.setLoop') || 'Set A-B loop'
              }
            >
              <Repeat className="w-4 h-4" />
            </Button>

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
